import { Injectable, Logger } from '@nestjs/common';
import { ProcessTemplate, ExecutionContext, ExecutionResult, SceneResult } from './types/process';
import { BlockExecutorService } from './block-executor.service';
import { BrowserInstance } from '../engine/browser-launcher.service';
import { StealthPluginService } from '../engine/stealth-plugin.service';
import { HumanSimulatorService } from '../engine/human-simulator.service';
import { SessionManagerService } from '../engine/session-manager.service';
import { ProxyManagerService } from '../engine/proxy-manager.service';

@Injectable()
export class ProcessTemplateService {
  private readonly logger = new Logger(ProcessTemplateService.name);

  constructor(
    private readonly blockExecutor: BlockExecutorService,
    private readonly stealthPlugin: StealthPluginService,
    private readonly humanSimulator: HumanSimulatorService,
    private readonly sessionManager: SessionManagerService,
    private readonly proxyManager: ProxyManagerService,
  ) {}

  async execute(
    template: ProcessTemplate,
    userDataList: Record<string, any>[],
    tenantId: string,
    processId: string,
    sessionId?: string,
  ): Promise<ExecutionResult> {
    const results: SceneResult[] = [];

    try {
      let browserInstance: BrowserInstance | undefined;
      let needLogin = true;

      if (template.sessionCacheEnable && sessionId) {
        const cachedSession = this.sessionManager.get(sessionId);
        if (cachedSession) {
          browserInstance = cachedSession.instance;
          needLogin = false;
          this.logger.log(`Using cached session: ${sessionId}`);
        }
      }

      if (!browserInstance) {
        const proxy = this.proxyManager.acquire(tenantId);
        const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        browserInstance = await this.blockExecutor.launchBrowser(newSessionId, tenantId, proxy?.ip);
        await this.stealthPlugin.apply(browserInstance.page);
        needLogin = true;
        this.logger.log(`Created new browser session: ${newSessionId}`);
      }

      if (!browserInstance) {
        return {
          success: false,
          message: 'Failed to launch browser',
          sceneResults: results,
        };
      }

      if (needLogin && template.loginBlock) {
        const loginSuccess = await this.blockExecutor.executeLoginBlock(
          browserInstance.page,
          template.loginBlock,
          template.delayMode,
        );
        if (!loginSuccess) {
          return {
            success: false,
            message: 'Login failed',
            sceneResults: results,
          };
        }

        if (template.sessionCacheEnable) {
          const cacheSessionId = browserInstance.sessionId;
          this.sessionManager.add(cacheSessionId, tenantId, browserInstance);
          this.logger.log(`Session cached: ${cacheSessionId}`);
        }
      }

      const context: ExecutionContext = {
        sessionId: browserInstance.sessionId,
        tenantId,
        processId,
        template,
        userData: {},
        currentSceneIndex: 0,
        retryCount: 0,
        maxRetries: 3,
      };

      for (const scene of template.sceneList) {
        const sceneResult = await this.executeScene(
          browserInstance,
          scene,
          userDataList,
          template.delayMode,
        );
        results.push(sceneResult);

        if (!sceneResult.success) {
          break;
        }
      }

      const allSuccess = results.every((r) => r.success);
      return {
        success: allSuccess,
        message: allSuccess ? 'All scenes completed successfully' : 'Some scenes failed',
        sceneResults: results,
      };
    } catch (error) {
      this.logger.error(`Process execution failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message,
        sceneResults: results,
        error: error as Error,
      };
    }
  }

  private async executeScene(
    browserInstance: BrowserInstance,
    scene: any,
    userDataList: Record<string, any>[],
    delayMode: string,
  ): Promise<SceneResult> {
    const startTime = Date.now();
    let success = false;
    let message = '';
    let dataCount = 0;

    try {
      await this.blockExecutor.executeSceneJump(browserInstance.page, scene, delayMode);

      for (const userData of userDataList) {
        await this.blockExecutor.executeFormFill(
          browserInstance.page,
          scene.formFields,
          userData,
          delayMode,
        );

        const submitSuccess = await this.blockExecutor.executeSubmit(
          browserInstance.page,
          scene.submitBtn,
          scene.successTip,
          delayMode,
        );

        if (submitSuccess) {
          dataCount++;
        }

        await this.humanSimulator.waitForPageLoad(browserInstance.page, delayMode as any);
      }

      success = true;
      message = `Processed ${dataCount} records`;
    } catch (error) {
      success = false;
      message = `Scene execution failed: ${error.message}`;
      this.logger.error(`Scene ${scene.sceneId} failed: ${error.message}`);
    }

    return {
      sceneId: scene.sceneId,
      sceneName: scene.sceneName,
      success,
      message,
      dataCount,
      startTime,
      endTime: Date.now(),
    };
  }

  validate(template: ProcessTemplate): string[] {
    const errors: string[] = [];

    if (!template.processName) {
      errors.push('Process name is required');
    }

    if (!['fast', 'balance', 'high_sim'].includes(template.delayMode)) {
      errors.push('Invalid delay mode');
    }

    if (!template.loginBlock) {
      errors.push('Login block is required');
    } else {
      if (!template.loginBlock.loginUrl) {
        errors.push('Login URL is required');
      }
      if (!template.loginBlock.usernameLocator) {
        errors.push('Username locator is required');
      }
      if (!template.loginBlock.passwordLocator) {
        errors.push('Password locator is required');
      }
      if (!template.loginBlock.submitBtn) {
        errors.push('Submit button locator is required');
      }
    }

    if (!template.sceneList || template.sceneList.length === 0) {
      errors.push('At least one scene is required');
    } else {
      template.sceneList.forEach((scene, index) => {
        if (!scene.sceneId) {
          errors.push(`Scene ${index}: sceneId is required`);
        }
        if (!scene.jumpUrl) {
          errors.push(`Scene ${index}: jumpUrl is required`);
        }
        if (!scene.submitBtn) {
          errors.push(`Scene ${index}: submitBtn is required`);
        }
        if (!scene.formFields || scene.formFields.length === 0) {
          errors.push(`Scene ${index}: formFields is required`);
        }
      });
    }

    return errors;
  }
}