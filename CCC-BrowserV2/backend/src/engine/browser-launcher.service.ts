import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Browser, BrowserContext, Page, LaunchOptions } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionId: string;
  tenantId: string;
  proxyIp?: string;
}

@Injectable()
export class BrowserLauncherService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserLauncherService.name);
  private readonly instances = new Map<string, BrowserInstance>();

  private getChromiumPath(): string {
    const platform = os.platform();
    const runtimeDir = path.join(process.cwd(), 'runtime', 'chromium');
    
    let chromiumPath: string;
    switch (platform) {
      case 'win32':
        chromiumPath = path.join(runtimeDir, 'win', 'chrome.exe');
        break;
      case 'darwin':
        chromiumPath = path.join(runtimeDir, 'mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
        break;
      case 'linux':
        chromiumPath = path.join(runtimeDir, 'linux', 'chrome');
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!fs.existsSync(chromiumPath)) {
      this.logger.warn(`Custom Chromium not found at ${chromiumPath}, using system Chromium`);
      return '';
    }
    return chromiumPath;
  }

  private getSessionDir(sessionId: string): string {
    const sessionCacheDir = path.join(process.cwd(), 'runtime', 'session-cache', sessionId);
    if (!fs.existsSync(sessionCacheDir)) {
      fs.mkdirSync(sessionCacheDir, { recursive: true });
    }
    return sessionCacheDir;
  }

  private getLaunchOptions(sessionId: string, proxyIp?: string): LaunchOptions {
    const chromiumPath = this.getChromiumPath();
    const sessionDir = this.getSessionDir(sessionId);

    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      '--disable-webgl',
      '--disable-canvas-aa',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-extensions',
      '--disable-sync',
      '--mute-audio',
      '--disable-hang-monitor',
      '--disable-autofill',
      '--disable-translate',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--force-device-scale-factor=1',
      '--window-size=1920,1080',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--allow-insecure-localhost',
      '--lang=zh-CN,zh,en-US,en'
    ];

    const options: LaunchOptions = {
      headless: true,
      args,
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 30000,
    };

    if (chromiumPath) {
      options.executablePath = chromiumPath;
    }

    if (proxyIp) {
      options.proxy = {
        server: `http://${proxyIp}`,
      };
    }

    return options;
  }

  async launch(sessionId: string, tenantId: string, proxyIp?: string): Promise<BrowserInstance> {
    this.logger.log(`Launching browser for session: ${sessionId}, tenant: ${tenantId}`);
    
    const { chromium } = await import('playwright-core');
    const options = this.getLaunchOptions(sessionId, proxyIp);
    
    try {
      const browser = await chromium.launch(options);
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        userAgent: this.getUserAgent(),
      });
      const page = await context.newPage();

      const instance: BrowserInstance = {
        browser,
        context,
        page,
        sessionId,
        tenantId,
        proxyIp,
      };

      this.instances.set(sessionId, instance);
      this.logger.log(`Browser launched successfully: ${sessionId}`);
      return instance;
    } catch (error) {
      this.logger.error(`Failed to launch browser: ${error.message}`, error.stack);
      throw error;
    }
  }

  getInstance(sessionId: string): BrowserInstance | undefined {
    return this.instances.get(sessionId);
  }

  async close(sessionId: string): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      return;
    }

    try {
      await instance.page.close();
      await instance.context.close();
      await instance.browser.close();
      this.instances.delete(sessionId);
      this.logger.log(`Browser closed: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to close browser: ${error.message}`);
    }
  }

  async closeAll(): Promise<void> {
    const sessions = Array.from(this.instances.keys());
    for (const sessionId of sessions) {
      await this.close(sessionId);
    }
  }

  private getUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  onModuleDestroy() {
    this.closeAll();
  }
}