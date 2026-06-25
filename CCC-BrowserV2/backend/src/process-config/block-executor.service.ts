import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright-core';
import { LoginBlock, FormField, SceneConfig } from './types/process';
import { BrowserLauncherService, BrowserInstance } from '../engine/browser-launcher.service';
import { HumanSimulatorService, DelayMode } from '../engine/human-simulator.service';

@Injectable()
export class BlockExecutorService {
  private readonly logger = new Logger(BlockExecutorService.name);

  constructor(
    private readonly browserLauncher: BrowserLauncherService,
    private readonly humanSimulator: HumanSimulatorService,
  ) {}

  async launchBrowser(sessionId: string, tenantId: string, proxyIp?: string): Promise<BrowserInstance> {
    return this.browserLauncher.launch(sessionId, tenantId, proxyIp);
  }

  async executeLoginBlock(page: Page, loginBlock: LoginBlock, delayMode: string): Promise<boolean> {
    this.logger.log(`Executing login block: ${loginBlock.loginUrl}`);

    try {
      await page.goto(loginBlock.loginUrl, { waitUntil: 'networkidle' });
      await this.humanSimulator.waitForPageLoad(page, delayMode as DelayMode);

      await this.humanSimulator.waitForElement(page, loginBlock.usernameLocator);
      await this.humanSimulator.typeText(page, loginBlock.usernameLocator, 'user', delayMode as DelayMode);

      await this.humanSimulator.waitForElement(page, loginBlock.passwordLocator);
      await this.humanSimulator.typeText(page, loginBlock.passwordLocator, 'password', delayMode as DelayMode);

      await this.humanSimulator.click(page, loginBlock.submitBtn, delayMode as DelayMode);
      await this.humanSimulator.waitForPageLoad(page, delayMode as DelayMode);

      if (loginBlock.loginSuccessVerify) {
        try {
          await page.waitForSelector(loginBlock.loginSuccessVerify, { timeout: 15000 });
        } catch {
          this.logger.warn('Login verification failed');
          return false;
        }
      }

      this.logger.log('Login block executed successfully');
      return true;
    } catch (error) {
      this.logger.error(`Login block failed: ${error.message}`);
      return false;
    }
  }

  async executeSceneJump(page: Page, scene: SceneConfig, delayMode: string): Promise<void> {
    this.logger.log(`Jumping to scene: ${scene.sceneId}`);

    await page.goto(scene.jumpUrl, { waitUntil: 'networkidle' });
    await this.humanSimulator.waitForPageLoad(page, delayMode as DelayMode);

    if (scene.jumpVerify) {
      await this.humanSimulator.waitForElement(page, scene.jumpVerify);
    }

    await this.humanSimulator.preBrowse(page, delayMode as DelayMode);
    this.logger.log(`Scene jump completed: ${scene.sceneId}`);
  }

  async executeFormFill(page: Page, formFields: FormField[], userData: Record<string, any>, delayMode: string): Promise<void> {
    this.logger.log('Executing form fill');

    for (const field of formFields) {
      const value = userData[field.dataKey];
      if (value === undefined || value === null) {
        continue;
      }

      await this.humanSimulator.waitForElement(page, field.locator);

      switch (field.fieldType || 'input') {
        case 'select':
          await this.humanSimulator.selectOption(page, field.locator, field.selectValue || String(value), delayMode as DelayMode);
          break;
        case 'checkbox':
          if (value) {
            await this.humanSimulator.checkCheckbox(page, field.locator, delayMode as DelayMode);
          }
          break;
        case 'textarea':
        case 'input':
        default:
          await this.humanSimulator.typeText(page, field.locator, String(value), delayMode as DelayMode);
          break;
      }

      await this.humanSimulator.randomPause(0.1);
    }

    this.logger.log('Form fill completed');
  }

  async executeSubmit(page: Page, submitBtn: string, successTip: string, delayMode: string): Promise<boolean> {
    this.logger.log('Executing submit');

    try {
      await this.humanSimulator.click(page, submitBtn, delayMode as DelayMode);
      await this.humanSimulator.waitForPageLoad(page, delayMode as DelayMode);

      if (successTip) {
        try {
          await page.waitForSelector(successTip, { timeout: 10000 });
        } catch {
          try {
            const successText = await page.waitForFunction(
              (tip) => document.body.textContent?.includes(tip),
              successTip,
              { timeout: 10000 },
            );
            if (!successText) {
              return false;
            }
          } catch {
            this.logger.warn('Submit verification failed');
            return false;
          }
        }
      }

      this.logger.log('Submit completed successfully');
      return true;
    } catch (error) {
      this.logger.error(`Submit failed: ${error.message}`);
      return false;
    }
  }
}