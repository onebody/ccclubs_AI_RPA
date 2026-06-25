import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import { ConfigManager } from '../config/ConfigManager';
import { Logger } from '../logger/Logger';
import { generateTimestamp } from '../utils';
import * as path from 'path';

const configManager = ConfigManager.getInstance();
const logger = Logger.getInstance();
const browserConfig = configManager.getBrowserConfig();

export class BrowserService {
  private static instance: BrowserService;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private constructor() {}

  public static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  public async launch(): Promise<void> {
    try {
      logger.info('Starting browser...');

      this.browser = await chromium.launch({
        headless: browserConfig.headless,
        slowMo: browserConfig.slowMo,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-blink-features=AutomationControlled',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--allow-insecure-localhost',
          '--window-size=' + browserConfig.width + ',' + browserConfig.height,
        ],
      });

      this.context = await this.browser.newContext({
        viewport: {
          width: browserConfig.width,
          height: browserConfig.height,
        },
        ignoreHTTPSErrors: browserConfig.ignoreHttpsErrors,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      await this.context.addInitScript(`
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      `);

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(browserConfig.timeout);

      logger.info('Browser launched successfully');
    } catch (error) {
      logger.error('Browser launch failed', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      logger.info('Closing browser...');

      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();

      this.page = null;
      this.context = null;
      this.browser = null;

      logger.info('Browser closed successfully');
    } catch (error) {
      logger.error('Browser close failed', error);
      throw error;
    }
  }

  public getPage(): Page | null { return this.page; }
  public getContext(): BrowserContext | null { return this.context; }

  public async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    try {
      logger.info('Navigating to: ' + url);
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: browserConfig.timeout,
      });
      logger.info('Navigation successful');
    } catch (error) {
      logger.error('Navigation failed: ' + url, error);
      throw error;
    }
  }

  public async takeScreenshot(name?: string): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');

    const fileName = name || 'screenshot_' + generateTimestamp();
    const filePath = path.join(configManager.getScreenshotDir(), fileName + '.png');

    try {
      await this.page.screenshot({ path: filePath, fullPage: true });
      logger.info('Screenshot saved: ' + filePath);
      return filePath;
    } catch (error) {
      logger.error('Screenshot failed', error);
      throw error;
    }
  }

  public async waitForLoad(): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    try {
      await this.page.waitForLoadState('networkidle');
      logger.debug('Page loaded');
    } catch (error) {
      logger.error('Wait for load failed', error);
      throw error;
    }
  }
}
