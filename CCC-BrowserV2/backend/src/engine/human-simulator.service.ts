import { Injectable, Logger } from '@nestjs/common';
import { Page, Locator } from 'playwright-core';

export type DelayMode = 'fast' | 'balance' | 'high_sim';

export interface DelayConfig {
  mouseMoveMin: number;
  mouseMoveMax: number;
  keyboardInputMin: number;
  keyboardInputMax: number;
  pageStayMin: number;
  pageStayMax: number;
  preBrowseMin: number;
  preBrowseMax: number;
  pauseProbability: number;
}

const DELAY_CONFIGS: Record<DelayMode, DelayConfig> = {
  fast: {
    mouseMoveMin: 100,
    mouseMoveMax: 200,
    keyboardInputMin: 20,
    keyboardInputMax: 50,
    pageStayMin: 1000,
    pageStayMax: 3000,
    preBrowseMin: 1000,
    preBrowseMax: 2000,
    pauseProbability: 0.1,
  },
  balance: {
    mouseMoveMin: 200,
    mouseMoveMax: 500,
    keyboardInputMin: 50,
    keyboardInputMax: 150,
    pageStayMin: 3000,
    pageStayMax: 10000,
    preBrowseMin: 2000,
    preBrowseMax: 5000,
    pauseProbability: 0.3,
  },
  high_sim: {
    mouseMoveMin: 300,
    mouseMoveMax: 800,
    keyboardInputMin: 80,
    keyboardInputMax: 200,
    pageStayMin: 5000,
    pageStayMax: 15000,
    preBrowseMin: 3000,
    preBrowseMax: 8000,
    pauseProbability: 0.5,
  },
};

@Injectable()
export class HumanSimulatorService {
  private readonly logger = new Logger(HumanSimulatorService.name);

  private getDelayConfig(mode: DelayMode): DelayConfig {
    return DELAY_CONFIGS[mode];
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  async randomPause(probability: number): Promise<void> {
    if (Math.random() < probability) {
      await this.randomDelay(500, 2000);
    }
  }

  private bezierCurve(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const cp1x = start.x + (end.x - start.x) * 0.3;
    const cp1y = start.y + (end.y - start.y) * 0.6;
    const cp2x = start.x + (end.x - start.x) * 0.7;
    const cp2y = start.y + (end.y - start.y) * 0.4;

    for (let t = 0; t <= 1; t += 0.02) {
      const x =
        Math.pow(1 - t, 3) * start.x +
        3 * Math.pow(1 - t, 2) * t * cp1x +
        3 * (1 - t) * Math.pow(t, 2) * cp2x +
        Math.pow(t, 3) * end.x;
      const y =
        Math.pow(1 - t, 3) * start.y +
        3 * Math.pow(1 - t, 2) * t * cp1y +
        3 * (1 - t) * Math.pow(t, 2) * cp2y +
        Math.pow(t, 3) * end.y;
      points.push({ x, y });
    }
    return points;
  }

  async typeText(page: Page, locator: string | Locator, text: string, mode: DelayMode = 'balance'): Promise<void> {
    const config = this.getDelayConfig(mode);
    const targetLocator = typeof locator === 'string' ? page.locator(locator) : locator;

    await this.moveToElement(page, targetLocator, mode);
    await this.randomPause(config.pauseProbability);

    for (const char of text) {
      await targetLocator.type(char, { delay: this.randomInt(config.keyboardInputMin, config.keyboardInputMax) });
      await this.randomPause(config.pauseProbability);
    }

    this.logger.log(`Typed ${text.length} characters`);
  }

  async click(page: Page, locator: string | Locator, mode: DelayMode = 'balance'): Promise<void> {
    const config = this.getDelayConfig(mode);
    const targetLocator = typeof locator === 'string' ? page.locator(locator) : locator;

    await this.moveToElement(page, targetLocator, mode);
    await this.randomPause(config.pauseProbability);
    await targetLocator.click();
    await this.randomDelay(300, 800);

    this.logger.log(`Clicked on element`);
  }

  async moveToElement(page: Page, locator: string | Locator, mode: DelayMode = 'balance'): Promise<void> {
    const config = this.getDelayConfig(mode);
    const targetLocator = typeof locator === 'string' ? page.locator(locator) : locator;

    const box = await targetLocator.boundingBox();
    if (!box) {
      throw new Error('Element not visible');
    }

    const startX = 100 + Math.random() * 200;
    const startY = 100 + Math.random() * 200;
    const endX = box.x + box.width / 2;
    const endY = box.y + box.height / 2;

    const points = this.bezierCurve({ x: startX, y: startY }, { x: endX, y: endY });
    const stepDelay = this.randomInt(config.mouseMoveMin, config.mouseMoveMax) / points.length;

    for (const point of points) {
      await page.mouse.move(point.x, point.y);
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
    }
  }

  async preBrowse(page: Page, mode: DelayMode = 'balance'): Promise<void> {
    const config = this.getDelayConfig(mode);
    await this.randomDelay(config.preBrowseMin, config.preBrowseMax);

    await this.scrollPage(page, mode);
    await this.randomPause(config.pauseProbability);

    this.logger.log('Pre-browse completed');
  }

  async scrollPage(page: Page, mode: DelayMode = 'balance'): Promise<void> {
    const config = this.getDelayConfig(mode);
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    const scrollCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < scrollCount; i++) {
      const scrollAmount = Math.random() * Math.min(scrollHeight - viewportHeight, 500);
      await page.evaluate((amount: number) => {
        window.scrollBy({ top: amount, behavior: 'smooth' });
      }, scrollAmount);
      await this.randomDelay(config.pageStayMin, config.pageStayMax);
    }

    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  async waitForPageLoad(page: Page, mode: DelayMode = 'balance'): Promise<void> {
    const config = this.getDelayConfig(mode);
    await page.waitForLoadState('networkidle');
    await this.randomDelay(config.pageStayMin, config.pageStayMax);
  }

  async waitForElement(page: Page, locator: string | Locator, timeout = 30000): Promise<void> {
    const targetLocator = typeof locator === 'string' ? page.locator(locator) : locator;
    await targetLocator.waitFor({ state: 'visible', timeout });
  }

  async selectOption(page: Page, locator: string | Locator, value: string, mode: DelayMode = 'balance'): Promise<void> {
    const config = this.getDelayConfig(mode);
    const targetLocator = typeof locator === 'string' ? page.locator(locator) : locator;

    await this.moveToElement(page, targetLocator, mode);
    await this.randomPause(config.pauseProbability);
    await targetLocator.selectOption(value);
    await this.randomDelay(500, 1000);

    this.logger.log(`Selected option: ${value}`);
  }

  async checkCheckbox(page: Page, locator: string | Locator, mode: DelayMode = 'balance'): Promise<void> {
    const targetLocator = typeof locator === 'string' ? page.locator(locator) : locator;

    await this.moveToElement(page, targetLocator, mode);
    await this.randomPause(0.2);
    await targetLocator.check();
    await this.randomDelay(300, 500);

    this.logger.log('Checkbox checked');
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }
}