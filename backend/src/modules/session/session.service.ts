import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantService } from '../tenant/tenant.service';
import { CreateSessionDto } from './dto/create-session.dto';
import * as crypto from 'crypto';
import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserService } from '../browser/browser.service';

export type SessionStatus = 'pending' | 'running' | 'idle' | 'timeout' | 'crash';

interface SessionInstance {
  childProcess: ChildProcess;
  cdpPort: number;
  userDataDir: string;
  proxyUrl: string;
  status: SessionStatus;
  startTime: number;
  maxLifetime: number;
}

@Injectable()
export class SessionService {
  private sessions: Map<string, SessionInstance> = new Map();
  private nextPort = 9222;
  private readonly baseUserDataDir = '/tmp/browser-sessions';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private tenantService: TenantService,
    private browserService: BrowserService,
  ) {
    fs.mkdirSync(this.baseUserDataDir, { recursive: true });
  }

  async create(createSessionDto: CreateSessionDto, tenantId: string, operatorId: string) {
    const hasQuota = await this.tenantService.checkQuota(tenantId);
    if (!hasQuota) {
      throw new BadRequestException('租户会话并发配额已用完');
    }

    const proxyUrl = await this.allocateProxy();
    const cdpPort = this.allocatePort();
    const userDataDir = this.createUserDataDir(tenantId);

    const sessionId = crypto.randomUUID();
    const maxLifetime = (createSessionDto.maxLifetime || 30) * 60 * 1000;

    const sessionRecord = await this.prisma.browserSession.create({
      data: {
        sessionId,
        tenantId,
        proxyId: proxyUrl ? proxyUrl.split('/')[2]?.split(':')[0] : null,
        status: 'pending',
        memoryLimit: createSessionDto.memoryLimit || '2Gi',
        cpuLimit: createSessionDto.cpuLimit || '1',
      },
    });

    await this.auditService.createLog({
      operatorId,
      tenantId,
      sessionId,
      actionType: 'SESSION_CREATE',
      details: { proxyUrl, cdpPort },
    });

    const childProcess = await this.startChromium(sessionId, cdpPort, userDataDir, proxyUrl);

    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    try {
      await this.browserService.connect(sessionId, cdpPort);
    } catch (error) {
      console.error(`[${sessionId}] 浏览器服务连接失败:`, error.message);
    }

    this.sessions.set(sessionId, {
      childProcess,
      cdpPort,
      userDataDir,
      proxyUrl,
      status: 'running',
      startTime: Date.now(),
      maxLifetime,
    });

    await this.prisma.browserSession.update({
      where: { sessionId },
      data: { status: 'running', startTime: new Date() },
    });

    setTimeout(() => this.checkTimeout(sessionId), maxLifetime);

    return { sessionId, cdpPort, proxyUrl };
  }

  private async allocateProxy(): Promise<string | null> {
    const proxyPoolUrl = process.env.PROXY_POOL_URL;
    if (!proxyPoolUrl) return null;

    try {
      const response = await fetch(`${proxyPoolUrl}/api/proxy/allocate`);
      const data = await response.json();
      return data.proxyUrl || null;
    } catch {
      return null;
    }
  }

  private allocatePort(): number {
    return this.nextPort++;
  }

  private createUserDataDir(tenantId: string): string {
    const dir = path.join(this.baseUserDataDir, tenantId, crypto.randomUUID());
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private async startChromium(sessionId: string, cdpPort: number, userDataDir: string, proxyUrl?: string) {
    // 根据操作系统选择 Chrome 路径
    let chromiumPath = process.env.CHROMIUM_PATH;
    if (!chromiumPath) {
      if (process.platform === 'darwin') {
        chromiumPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else if (process.platform === 'win32') {
        chromiumPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else {
        chromiumPath = '/usr/bin/google-chrome';
      }
    }

    const args = [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--enable-features=NetworkService',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      '--disable-default-apps',
      '--disable-extensions-except=/extensions',
      '--load-extension=/extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-client-side-phishing-detection',
      '--disable-component-extensions-with-background-pages',
      '--disable-breakpad',
      '--disable-domain-reliability',
      '--disable-stats-collection-upload',
      '--disable-ipc-flooding-protection',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-zygote',
      '--single-process',
    ];

    if (proxyUrl) {
      args.push(`--proxy-server=${proxyUrl}`);
    }

    const chromiumProcess = spawn(chromiumPath, args);

    chromiumProcess.on('error', (err) => {
      this.handleCrash(sessionId, err.message);
    });

    chromiumProcess.on('exit', (code) => {
      if (code !== 0) {
        this.handleCrash(sessionId, `Process exited with code ${code}`);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    return chromiumProcess;
  }

  private async handleCrash(sessionId: string, reason: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'crash';

    await this.prisma.browserSession.update({
      where: { sessionId },
      data: { status: 'crash', destroyTime: new Date() },
    });

    await this.auditService.createLog({
      operatorId: 'system',
      tenantId: (await this.prisma.browserSession.findUnique({ where: { sessionId } }))?.tenantId || '',
      sessionId,
      actionType: 'SESSION_CRASH',
      details: { reason },
    });

    await this.cleanup(sessionId);
  }

  private async checkTimeout(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'running') return;

    const elapsed = Date.now() - session.startTime;
    if (elapsed >= session.maxLifetime) {
      await this.destroy(sessionId, 'timeout');
    }
  }

  async destroy(sessionId: string, reason: string = 'manual', operatorId?: string) {
    const sessionRecord = await this.prisma.browserSession.findUnique({
      where: { sessionId },
    });

    if (!sessionRecord) {
      throw new NotFoundException('会话不存在');
    }

    await this.cleanup(sessionId);

    await this.prisma.browserSession.update({
      where: { sessionId },
      data: { status: reason === 'timeout' ? 'timeout' : 'crash', destroyTime: new Date() },
    });

    await this.auditService.createLog({
      operatorId: operatorId || 'system',
      tenantId: sessionRecord.tenantId,
      sessionId,
      actionType: 'SESSION_DESTROY',
      details: { reason },
    });

    return { message: '会话已销毁' };
  }

  private async cleanup(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      await this.browserService.disconnect(sessionId);
    } catch {}

    try {
      session.childProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      session.childProcess.kill('SIGKILL');
    } catch {}

    try {
      await this.releaseProxy(session.proxyUrl);
    } catch {}

    try {
      fs.rmSync(session.userDataDir, { recursive: true, force: true });
    } catch {}

    this.sessions.delete(sessionId);
  }

  private async releaseProxy(proxyUrl?: string) {
    if (!proxyUrl) return;

    const proxyPoolUrl = process.env.PROXY_POOL_URL;
    if (!proxyPoolUrl) return;

    try {
      await fetch(`${proxyPoolUrl}/api/proxy/release`, {
        method: 'POST',
        body: JSON.stringify({ proxyUrl }),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {}
  }

  async findOne(sessionId: string) {
    const session = await this.prisma.browserSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return session;
  }

  async findAll(tenantId: string) {
    return this.prisma.browserSession.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatus(sessionId: string) {
    const session = this.sessions.get(sessionId);
    const record = await this.findOne(sessionId);

    return {
      ...record,
      runtimeStatus: session?.status,
    };
  }
}