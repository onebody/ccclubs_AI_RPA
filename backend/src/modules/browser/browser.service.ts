import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright-core';
import { generateFingerprint, buildFingerprintScript, buildRequestHeaders, FingerprintConfig } from './fingerprint';

@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);
  private browsers: Map<string, Browser> = new Map();
  private pages: Map<string, Page> = new Map();
  private fingerprints: Map<string, FingerprintConfig> = new Map();

  async connect(sessionId: string, cdpPort: number): Promise<Browser> {
    if (this.browsers.has(sessionId)) {
      return this.browsers.get(sessionId)!;
    }

    const wsEndpoint = `ws://localhost:${cdpPort}/devtools/browser`;
    
    try {
      const browser = await chromium.connectOverCDP(wsEndpoint);
      this.browsers.set(sessionId, browser);
      
      const fingerprint = generateFingerprint();
      this.fingerprints.set(sessionId, fingerprint);
      
      this.logger.log(`[${sessionId}] 浏览器连接成功, CDP端口: ${cdpPort}`);
      return browser;
    } catch (error) {
      this.logger.error(`[${sessionId}] 浏览器连接失败: ${error.message}`);
      throw error;
    }
  }

  async createPage(sessionId: string, cdpPort?: number): Promise<Page> {
    const browser = await this.connect(sessionId, cdpPort || 9222);
    const fingerprint = this.fingerprints.get(sessionId)!;

    const page = await browser.newPage({
      viewport: {
        width: 1920,
        height: 1080,
      },
      userAgent: fingerprint.userAgent,
      extraHTTPHeaders: buildRequestHeaders(fingerprint),
      ignoreHTTPSErrors: true,
    });

    await page.route('**/*', async (route) => {
      const headers = {
        ...route.request().headers(),
        ...buildRequestHeaders(fingerprint),
      };
      await route.continue({ headers });
    });

    await page.addInitScript(buildFingerprintScript(fingerprint));

    await page.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });
      window.chrome = {
        runtime: {},
      };
      window.cdc_adoQpoasnfa76pfcZLmcfl_Array = Array;
      window.cdc_adoQpoasnfa76pfcZLmcfl_Promise = Promise;
      window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol = Symbol;
    `);

    await page.setExtraHTTPHeaders(buildRequestHeaders(fingerprint));

    this.pages.set(sessionId, page);

    this.logger.log(`[${sessionId}] 页面创建成功`);
    return page;
  }

  async getPage(sessionId: string): Promise<Page> {
    if (this.pages.has(sessionId)) {
      return this.pages.get(sessionId)!;
    }
    return this.createPage(sessionId);
  }

  async goto(sessionId: string, url: string, options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    timeout?: number;
  }): Promise<string> {
    const page = await this.getPage(sessionId);
    
    await this.humanDelay(500, 1500);
    
    await page.goto(url, {
      waitUntil: options?.waitUntil || 'networkidle',
      timeout: options?.timeout || 60000,
    });

    await this.humanDelay(1000, 2000);

    const currentUrl = page.url();
    this.logger.log(`[${sessionId}] 页面跳转完成: ${currentUrl}`);
    return currentUrl;
  }

  async click(sessionId: string, selector: string, options?: {
    delay?: number;
  }): Promise<void> {
    const page = await this.getPage(sessionId);
    
    await this.humanDelay(300, 800);
    
    await page.waitForSelector(selector, { timeout: 10000 });
    
    const element = page.locator(selector);
    const box = await element.boundingBox();
    
    if (box) {
      const x = box.x + box.width / 2 + this.randomOffset(-10, 10);
      const y = box.y + box.height / 2 + this.randomOffset(-10, 10);
      
      await page.mouse.move(x, y, {
        steps: this.randomInt(5, 15),
      });
      
      await this.humanDelay(100, 300);
    }
    
    await element.click({
      delay: options?.delay || this.randomInt(50, 150),
    });
    
    await this.humanDelay(500, 1000);
    
    this.logger.log(`[${sessionId}] 点击元素: ${selector}`);
  }

  async type(sessionId: string, selector: string, text: string, options?: {
    delay?: number;
  }): Promise<void> {
    const page = await this.getPage(sessionId);
    
    await this.humanDelay(300, 500);
    
    await page.waitForSelector(selector, { timeout: 10000 });
    
    const element = page.locator(selector);
    
    await element.click();
    
    for (const char of text) {
      await element.type(char, {
        delay: options?.delay || this.randomInt(50, 150),
      });
      await this.humanDelay(20, 80);
    }
    
    this.logger.log(`[${sessionId}] 输入文本: ${text.substring(0, 20)}...`);
  }

  async waitForSelector(sessionId: string, selector: string, timeout?: number): Promise<void> {
    const page = await this.getPage(sessionId);
    await page.waitForSelector(selector, { timeout: timeout || 30000 });
    this.logger.log(`[${sessionId}] 等待元素出现: ${selector}`);
  }

  async waitForTimeout(sessionId: string, ms: number): Promise<void> {
    await this.humanDelay(ms);
    this.logger.log(`[${sessionId}] 等待: ${ms}ms`);
  }

  async getContent(sessionId: string): Promise<string> {
    const page = await this.getPage(sessionId);
    const content = await page.content();
    this.logger.log(`[${sessionId}] 获取页面内容完成`);
    return content;
  }

  async getTitle(sessionId: string): Promise<string> {
    const page = await this.getPage(sessionId);
    const title = await page.title();
    this.logger.log(`[${sessionId}] 获取页面标题: ${title}`);
    return title;
  }

  async getUrl(sessionId: string): Promise<string> {
    const page = await this.getPage(sessionId);
    return page.url();
  }

  async screenshot(sessionId: string, options?: {
    path?: string;
    fullPage?: boolean;
  }): Promise<Buffer> {
    const page = await this.getPage(sessionId);
    const screenshot = await page.screenshot({
      path: options?.path,
      fullPage: options?.fullPage || false,
    });
    this.logger.log(`[${sessionId}] 截图完成`);
    return screenshot;
  }

  async evaluate(sessionId: string, script: string): Promise<any> {
    const page = await this.getPage(sessionId);
    const result = await page.evaluate(script);
    this.logger.log(`[${sessionId}] 执行脚本完成`);
    return result;
  }

  async goBack(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    await page.goBack();
    await this.humanDelay(500, 1000);
    this.logger.log(`[${sessionId}] 后退`);
  }

  async goForward(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    await page.goForward();
    await this.humanDelay(500, 1000);
    this.logger.log(`[${sessionId}] 前进`);
  }

  async reload(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    await page.reload();
    await this.humanDelay(1000, 2000);
    this.logger.log(`[${sessionId}] 刷新页面`);
  }

  async closePage(sessionId: string): Promise<void> {
    const page = this.pages.get(sessionId);
    if (page) {
      await page.close();
      this.pages.delete(sessionId);
      this.logger.log(`[${sessionId}] 页面关闭`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    await this.closePage(sessionId);
    
    const browser = this.browsers.get(sessionId);
    if (browser) {
      await browser.close();
      this.browsers.delete(sessionId);
      this.fingerprints.delete(sessionId);
      this.logger.log(`[${sessionId}] 浏览器断开连接`);
    }
  }

  async getCookies(sessionId: string): Promise<{ name: string; value: string; domain: string; path: string }[]> {
    const page = await this.getPage(sessionId);
    const cookies = await page.context().cookies();
    return cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
    }));
  }

  async setCookie(sessionId: string, cookies: { name: string; value: string; domain: string; path: string }[]): Promise<void> {
    const page = await this.getPage(sessionId);
    await page.context().addCookies(cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: false,
      httpOnly: false,
    })));
    this.logger.log(`[${sessionId}] 设置Cookie: ${cookies.length}个`);
  }

  async interceptRequest(sessionId: string, urlPattern: string, handler: (url: string) => void): Promise<void> {
    const page = await this.getPage(sessionId);
    await page.route(urlPattern, async (route) => {
      handler(route.request().url());
      await route.continue();
    });
    this.logger.log(`[${sessionId}] 设置请求拦截: ${urlPattern}`);
  }

  async bypassWAF(sessionId: string, url: string): Promise<string> {
    const page = await this.getPage(sessionId);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    await this.humanDelay(2000, 3000);
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('waf') || currentUrl.includes('block')) {
      await page.reload();
      await this.humanDelay(3000, 5000);
    }
    
    await this.humanDelay(2000, 4000);
    
    this.logger.log(`[${sessionId}] WAF绕过完成: ${page.url()}`);
    return page.url();
  }

  private async humanDelay(min: number, max?: number): Promise<void> {
    const delay = max ? this.randomInt(min, max) : min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomOffset(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}