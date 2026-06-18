import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class ChromeManager {
  private chromeProcess: ChildProcess | null = null;
  private cdpPort: number;
  private userDataDir: string;
  private chromePath: string;
  private isRunning: boolean = false;

  constructor(cdpPort: number = 9222) {
    this.cdpPort = cdpPort;
    this.chromePath = this.getChromePath();
    this.userDataDir = path.join(require('os').tmpdir(), `chrome-profile-${Date.now()}`);
  }

  private getChromePath(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else if (platform === 'win32') {
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    return '/usr/bin/google-chrome';
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Chrome already running');
      return;
    }

    // 创建用户数据目录
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    const args = [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--allow-insecure-localhost',
      '--remote-debugging-port=' + this.cdpPort,
      '--user-data-dir=' + this.userDataDir,
      '--remote-allow-origins=*',
      '--disable-features=IsolateOrigins,site-per-process',
      '--enable-features=NetworkService',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
    ];

    console.log(`Starting Chrome on port ${this.cdpPort}...`);
    console.log(`Chrome path: ${this.chromePath}`);

    this.chromeProcess = spawn(this.chromePath, args, {
      detached: false,
      stdio: 'pipe',
    });

    this.chromeProcess.stdout?.on('data', (data) => {
      console.log(`Chrome stdout: ${data.toString()}`);
    });

    this.chromeProcess.stderr?.on('data', (data) => {
      console.error(`Chrome stderr: ${data.toString()}`);
    });

    this.chromeProcess.on('error', (err) => {
      console.error('Chrome error:', err.message);
      this.isRunning = false;
    });

    this.chromeProcess.on('exit', (code) => {
      console.log(`Chrome exited with code ${code}`);
      this.isRunning = false;
    });

    // 等待Chrome启动
    await new Promise(resolve => setTimeout(resolve, 5000));
    this.isRunning = true;
    console.log('Chrome started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.chromeProcess) {
      return;
    }

    console.log('Stopping Chrome...');
    this.chromeProcess.kill();
    this.isRunning = false;

    // 清理用户数据目录
    try {
      fs.rmSync(this.userDataDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to clean user data dir:', e);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Chrome stopped');
  }

  getPort(): number {
    return this.cdpPort;
  }

  isChromeRunning(): boolean {
    return this.isRunning;
  }
}
