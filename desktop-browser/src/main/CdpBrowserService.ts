import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page, CDPSession } from 'playwright-core';
import { FingerprintConfig, buildFingerprintScript } from './AntiDetection';

export class CdpBrowserService {
  private wsEndpoint: string;
  private fingerprint: FingerprintConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;

  constructor(wsEndpoint: string, fingerprint: FingerprintConfig) {
    this.wsEndpoint = wsEndpoint;
    this.fingerprint = fingerprint;
  }

  async connect(): Promise<void> {
    this.browser = await chromium.connectOverCDP(this.wsEndpoint);

    // 创建浏览器上下文
    this.context = await this.browser.newContext({
      userAgent: this.fingerprint.userAgent,
      viewport: {
        width: parseInt(this.fingerprint.screenResolution.split('x')[0]),
        height: parseInt(this.fingerprint.screenResolution.split('x')[1]),
      },
      locale: this.fingerprint.language,
      timezoneId: this.fingerprint.timezone,
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();
    this.cdpSession = await this.page.context().newCDPSession(this.page);

    console.log('CDP browser service connected');
  }

  async navigate(url: string): Promise<{ title: string; url: string; contentLength: number }> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 注入反爬虫脚本
    await this.page.evaluate(buildFingerprintScript(this.fingerprint));

    const title = await this.page.title();
    const currentUrl = this.page.url();
    const content = await this.page.content();
    const contentLength = content.length;

    return { title, url: currentUrl, contentLength };
  }

  async goBack(): Promise<{ title: string; url: string }> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goBack({ waitUntil: 'networkidle' });
    return { title: await this.page.title(), url: this.page.url() };
  }

  async goForward(): Promise<{ title: string; url: string }> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goForward({ waitUntil: 'networkidle' });
    return { title: await this.page.title(), url: this.page.url() };
  }

  async refresh(): Promise<{ title: string; url: string }> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.reload({ waitUntil: 'networkidle' });
    return { title: await this.page.title(), url: this.page.url() };
  }

  async getTitle(): Promise<{ title: string }> {
    if (!this.page) return { title: '' };
    return { title: await this.page.title() };
  }

  async getCurrentUrl(): Promise<{ url: string }> {
    if (!this.page) return { url: '' };
    return { url: this.page.url() };
  }

  async screenshot(): Promise<{ dataUrl: string }> {
    if (!this.page) throw new Error('Page not initialized');
    const buffer = await this.page.screenshot({ type: 'png', fullPage: false });
    const base64 = buffer.toString('base64');
    return { dataUrl: `data:image/png;base64,${base64}` };
  }

  async getContentLength(): Promise<{ contentLength: number }> {
    if (!this.page) return { contentLength: 0 };
    const content = await this.page.content();
    return { contentLength: content.length };
  }

  async clickElement(selector: string): Promise<{ success: boolean }> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.click(selector);
    return { success: true };
  }

  async typeText(selector: string, text: string): Promise<{ success: boolean }> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.fill(selector, text);
    return { success: true };
  }

  setCustomHeaders(headers: Record<string, string>): void {
    if (!this.page) return;
    this.page.setExtraHTTPHeaders(headers);
  }

  async disconnect(): Promise<void> {
    if (this.cdpSession) {
      await this.cdpSession.detach();
    }
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}