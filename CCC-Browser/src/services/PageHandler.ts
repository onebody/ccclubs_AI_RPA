import { Page, Locator } from '@playwright/test';
import { Logger } from '../logger/Logger';
import { retry } from '../utils';

const logger = Logger.getInstance();

export class PageHandler {
  constructor(private page: Page) {}

  public async click(selector: string, options?: {
    timeout?: number;
    retries?: number;
    waitForVisible?: boolean;
  }): Promise<void> {
    const opts = {
      timeout: options?.timeout || 30000,
      retries: options?.retries || 3,
      waitForVisible: options?.waitForVisible ?? true,
    };

    try {
      await retry(async () => {
        const locator = this.page.locator(selector);
        if (opts.waitForVisible) {
          await locator.waitFor({ state: 'visible', timeout: opts.timeout });
        }
        await locator.click({ timeout: opts.timeout, force: true });
        logger.debug('Clicked element: ' + selector);
      }, opts.retries);
    } catch (error) {
      logger.error('Click failed: ' + selector, error);
      throw error;
    }
  }

  public async fill(selector: string, value: string, options?: {
    timeout?: number;
    retries?: number;
    clearFirst?: boolean;
  }): Promise<void> {
    const opts = {
      timeout: options?.timeout || 30000,
      retries: options?.retries || 3,
      clearFirst: options?.clearFirst ?? true,
    };

    try {
      await retry(async () => {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: opts.timeout });
        if (opts.clearFirst) await locator.fill('', { timeout: opts.timeout });
        await locator.fill(value, { timeout: opts.timeout });
        logger.debug('Filled input: ' + selector + ' = ' + value);
      }, opts.retries);
    } catch (error) {
      logger.error('Fill failed: ' + selector, error);
      throw error;
    }
  }

  public async getText(selector: string, options?: {
    timeout?: number;
    retries?: number;
  }): Promise<string> {
    const opts = {
      timeout: options?.timeout || 30000,
      retries: options?.retries || 3,
    };

    try {
      return await retry(async () => {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: opts.timeout });
        const text = await locator.textContent();
        logger.debug('Got text: ' + selector + ' = ' + text);
        return text || '';
      }, opts.retries);
    } catch (error) {
      logger.error('Get text failed: ' + selector, error);
      throw error;
    }
  }

  public async isVisible(selector: string, options?: { timeout?: number }): Promise<boolean> {
    const opts = { timeout: options?.timeout || 5000 };
    try {
      const locator = this.page.locator(selector);
      await locator.waitFor({ state: 'visible', timeout: opts.timeout });
      return true;
    } catch {
      return false;
    }
  }

  public async waitForElement(selector: string, options?: {
    timeout?: number;
    state?: 'visible' | 'hidden' | 'attached';
  }): Promise<Locator> {
    const opts = {
      timeout: options?.timeout || 30000,
      state: options?.state || 'visible',
    };

    try {
      const locator = this.page.locator(selector);
      await locator.waitFor({ state: opts.state, timeout: opts.timeout });
      return locator;
    } catch (error) {
      logger.error('Wait for element failed: ' + selector, error);
      throw error;
    }
  }

  public async waitForNavigation(options?: {
    timeout?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  }): Promise<void> {
    const opts = {
      timeout: options?.timeout || 30000,
      waitUntil: options?.waitUntil || 'networkidle',
    };

    try {
      await this.page.waitForNavigation({ waitUntil: opts.waitUntil, timeout: opts.timeout });
      logger.debug('Navigation complete');
    } catch (error) {
      logger.error('Wait for navigation failed', error);
      throw error;
    }
  }

  public async executeScript<T>(script: string): Promise<T> {
    try {
      const result = await this.page.evaluate(script) as T;
      logger.debug('Script executed: ' + script.substring(0, 50) + '...');
      return result;
    } catch (error) {
      logger.error('Script execution failed', error);
      throw error;
    }
  }
}
