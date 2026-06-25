import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserConfig {
  headless: boolean;
  timeout: number;
  width: number;
  height: number;
  ignoreHttpsErrors: boolean;
  slowMo: number;
}

export interface LogConfig {
  level: string;
  dir: string;
}

export interface TargetConfig {
  url: string;
  username: string;
  password: string;
}

export interface AppConfig {
  browser: BrowserConfig;
  log: LogConfig;
  screenshot: { dir: string };
  target: TargetConfig;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config!: AppConfig;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
    const env = process.env;

    this.config = {
      browser: {
        headless: env.BROWSER_HEADLESS === 'true',
        timeout: parseInt(env.BROWSER_TIMEOUT || '30000', 10),
        width: parseInt(env.BROWSER_WIDTH || '1920', 10),
        height: parseInt(env.BROWSER_HEIGHT || '1080', 10),
        ignoreHttpsErrors: true,
        slowMo: parseInt(env.BROWSER_SLOWMO || '0', 10),
      },
      log: {
        level: env.LOG_LEVEL || 'info',
        dir: env.LOG_DIR || './logs',
      },
      screenshot: {
        dir: env.SCREENSHOT_DIR || './screenshots',
      },
      target: {
        url: env.TARGET_URL || 'https://zj.122.gov.cn',
        username: env.USERNAME || '',
        password: env.PASSWORD || '',
      },
    };

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.config.log.dir)) {
      fs.mkdirSync(this.config.log.dir, { recursive: true });
    }
    if (!fs.existsSync(this.config.screenshot.dir)) {
      fs.mkdirSync(this.config.screenshot.dir, { recursive: true });
    }
  }

  public getConfig(): AppConfig { return this.config; }
  public getBrowserConfig(): BrowserConfig { return this.config.browser; }
  public getLogConfig(): LogConfig { return this.config.log; }
  public getTargetConfig(): TargetConfig { return this.config.target; }
  public getScreenshotDir(): string { return this.config.screenshot.dir; }
}
