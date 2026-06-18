import { Controller, Post, Get, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { BrowserService } from './browser.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('browser')
@UseGuards(JwtAuthGuard)
export class BrowserController {
  private readonly logger = new Logger(BrowserController.name);

  constructor(private browserService: BrowserService) {}

  @Post(':sessionId/goto')
  async goto(
    @Param('sessionId') sessionId: string,
    @Body() body: { url: string },
  ) {
    this.logger.log(`[${sessionId}] 跳转到: ${body.url}`);
    const url = await this.browserService.goto(sessionId, body.url);
    return { success: true, url };
  }

  @Post(':sessionId/click')
  async click(
    @Param('sessionId') sessionId: string,
    @Body() body: { selector: string },
  ) {
    await this.browserService.click(sessionId, body.selector);
    return { success: true };
  }

  @Post(':sessionId/type')
  async type(
    @Param('sessionId') sessionId: string,
    @Body() body: { selector: string; text: string },
  ) {
    await this.browserService.type(sessionId, body.selector, body.text);
    return { success: true };
  }

  @Post(':sessionId/wait')
  async wait(
    @Param('sessionId') sessionId: string,
    @Body() body: { ms?: number; selector?: string },
  ) {
    if (body.selector) {
      await this.browserService.waitForSelector(sessionId, body.selector);
    } else {
      await this.browserService.waitForTimeout(sessionId, body.ms || 1000);
    }
    return { success: true };
  }

  @Get(':sessionId/content')
  async getContent(@Param('sessionId') sessionId: string) {
    const content = await this.browserService.getContent(sessionId);
    return { success: true, content };
  }

  @Get(':sessionId/title')
  async getTitle(@Param('sessionId') sessionId: string) {
    const title = await this.browserService.getTitle(sessionId);
    return { success: true, title };
  }

  @Get(':sessionId/url')
  async getUrl(@Param('sessionId') sessionId: string) {
    const url = await this.browserService.getUrl(sessionId);
    return { success: true, url };
  }

  @Get(':sessionId/screenshot')
  async screenshot(@Param('sessionId') sessionId: string) {
    const screenshot = await this.browserService.screenshot(sessionId, { fullPage: true });
    return { success: true, screenshot: screenshot.toString('base64') };
  }

  @Post(':sessionId/evaluate')
  async evaluate(
    @Param('sessionId') sessionId: string,
    @Body() body: { script: string },
  ) {
    const result = await this.browserService.evaluate(sessionId, body.script);
    return { success: true, result };
  }

  @Post(':sessionId/back')
  async back(@Param('sessionId') sessionId: string) {
    await this.browserService.goBack(sessionId);
    return { success: true };
  }

  @Post(':sessionId/forward')
  async forward(@Param('sessionId') sessionId: string) {
    await this.browserService.goForward(sessionId);
    return { success: true };
  }

  @Post(':sessionId/reload')
  async reload(@Param('sessionId') sessionId: string) {
    await this.browserService.reload(sessionId);
    return { success: true };
  }

  @Get(':sessionId/cookies')
  async getCookies(@Param('sessionId') sessionId: string) {
    const cookies = await this.browserService.getCookies(sessionId);
    return { success: true, cookies };
  }

  @Post(':sessionId/cookies')
  async setCookies(
    @Param('sessionId') sessionId: string,
    @Body() body: { cookies: { name: string; value: string; domain: string; path: string }[] },
  ) {
    await this.browserService.setCookie(sessionId, body.cookies);
    return { success: true };
  }

  @Post(':sessionId/bypass-waf')
  async bypassWAF(
    @Param('sessionId') sessionId: string,
    @Body() body: { url: string },
  ) {
    const url = await this.browserService.bypassWAF(sessionId, body.url);
    return { success: true, url };
  }

  @Post(':sessionId/connect')
  async connect(
    @Param('sessionId') sessionId: string,
    @Body() body: { cdpPort: number },
  ) {
    await this.browserService.connect(sessionId, body.cdpPort);
    return { success: true };
  }

  @Post(':sessionId/disconnect')
  async disconnect(@Param('sessionId') sessionId: string) {
    await this.browserService.disconnect(sessionId);
    return { success: true };
  }
}