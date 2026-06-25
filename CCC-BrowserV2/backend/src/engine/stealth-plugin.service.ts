import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright-core';

@Injectable()
export class StealthPluginService {
  private readonly logger = new Logger(StealthPluginService.name);

  async apply(page: Page): Promise<void> {
    this.logger.log('Applying stealth plugin...');
    
    await this.removeCdcVariables(page);
    await this.disableAutomationControlled(page);
    await this.hideWebdriver(page);
    await this.fingerprintCanvas(page);
    await this.fingerprintWebGL(page);
    await this.fingerprintAudio(page);
    await this.fingerprintPlugins(page);
    await this.fingerprintLanguages(page);
    await this.fingerprintTimezone(page);
    await this.fingerprintNavigator(page);
    await this.fingerprintScreen(page);
    await this.fingerprintPermissions(page);
    await this.fingerprintMediaDevices(page);
    
    this.logger.log('Stealth plugin applied successfully');
  }

  private async removeCdcVariables(page: Page): Promise<void> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      Object.defineProperty(window, 'webdriver', {
        get: () => undefined,
      });
    });
  }

  private async disableAutomationControlled(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const script = document.createElement('script');
      script.textContent = `
        Object.defineProperty(navigator, 'automation', {
          get: () => undefined,
        });
      `;
      document.documentElement.appendChild(script);
      script.remove();
    });
  }

  private async hideWebdriver(page: Page): Promise<void> {
    await page.addInitScript(() => {
      (navigator.permissions as unknown) = {
        query: (parameters: unknown) => {
          return Promise.resolve({ state: 'denied' });
        },
      };
    });
  }

  private async fingerprintCanvas(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function (contextId: string, options?: any) {
        const ctx = originalGetContext.call(this, contextId, options);
        if (ctx && typeof ctx === 'object' && 'getImageData' in ctx) {
          const originalGetImageData = ctx.getImageData.bind(ctx);
          (ctx as any).getImageData = function (sx: number, sy: number, sw: number, sh: number) {
            const imageData = originalGetImageData(sx, sy, sw, sh);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = data[i] ^ Math.floor(Math.random() * 10);
              data[i + 1] = data[i + 1] ^ Math.floor(Math.random() * 10);
              data[i + 2] = data[i + 2] ^ Math.floor(Math.random() * 10);
            }
            return imageData;
          };
        }
        return ctx;
      };
    });
  }

  private async fingerprintWebGL(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function (contextId: string, options?: any) {
        const ctx = originalGetContext.call(this, contextId, options);
        if (ctx && typeof ctx === 'object') {
          const originalGetParameter = (ctx as any).getParameter;
          (ctx as any).getParameter = function (parameter: unknown) {
            let result = originalGetParameter.call(this, parameter);
            if (typeof result === 'string') {
              result = result.replace(/Google Inc\./g, 'Intel Inc.');
              result = result.replace(/NVIDIA/g, 'Intel');
            }
            return result;
          };
        }
        return ctx;
      };
    });
  }

  private async fingerprintAudio(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        (window as any).AudioContext = function () {
          const ctx = new AudioContext();
          const originalCreateAnalyser = ctx.createAnalyser.bind(ctx);
          ctx.createAnalyser = function () {
            const analyser = originalCreateAnalyser();
            const originalGetChannelData = analyser.getFloatTimeDomainData.bind(analyser);
            analyser.getFloatTimeDomainData = function (array: Float32Array) {
              originalGetChannelData(array);
              for (let i = 0; i < array.length; i++) {
                array[i] += (Math.random() - 0.5) * 0.001;
              }
            };
            return analyser;
          };
          return ctx;
        };
      }
    });
  }

  private async fingerprintPlugins(page: Page): Promise<void> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [],
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => [],
        enumerable: true,
        configurable: true,
      });
    });
  }

  private async fingerprintLanguages(page: Page): Promise<void> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en-US', 'en'],
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'language', {
        get: () => 'zh-CN',
        enumerable: true,
        configurable: true,
      });
    });
  }

  private async fingerprintTimezone(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const originalToString = Date.prototype.toString;
      Date.prototype.toString = function () {
        const result = originalToString.call(this);
        return result.replace(/\(([^)]+)\)/, '(China Standard Time)');
      };
    });
  }

  private async fingerprintNavigator(page: Page): Promise<void> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        enumerable: true,
        configurable: true,
      });
    });
  }

  private async fingerprintScreen(page: Page): Promise<void> {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, 'width', {
        get: () => 1920,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(window.screen, 'height', {
        get: () => 1080,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(window.screen, 'availWidth', {
        get: () => 1920,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(window.screen, 'availHeight', {
        get: () => 1040,
        enumerable: true,
        configurable: true,
      });
    });
  }

  private async fingerprintPermissions(page: Page): Promise<void> {
    await page.addInitScript(() => {
      (navigator.permissions as any) = {
        query: (descriptor: any) => {
          return Promise.resolve({ state: 'denied', name: descriptor.name });
        },
      };
    });
  }

  private async fingerprintMediaDevices(page: Page): Promise<void> {
    await page.addInitScript(() => {
      (navigator.mediaDevices as any) = {
        getUserMedia: () => {
          throw new Error('NotAllowedError: Permission denied');
        },
        enumerateDevices: () => Promise.resolve([]),
      };
    });
  }
}