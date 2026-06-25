import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { BrowserInstance } from './browser-launcher.service';
import * as fs from 'fs';
import * as path from 'path';

export interface SessionCache {
  sessionId: string;
  tenantId: string;
  instance: BrowserInstance;
  createdAt: number;
  lastUsedAt: number;
  status: 'active' | 'idle' | 'expired';
  lockCount: number;
}

export interface SessionConfig {
  maxIdleTime: number;
  maxSessionAge: number;
  cleanupInterval: number;
}

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxIdleTime: 300000,
  maxSessionAge: 3600000,
  cleanupInterval: 60000,
};

@Injectable()
export class SessionManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly sessions = new Map<string, SessionCache>();
  private readonly config: SessionConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(@Optional() config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
    this.startCleanupScheduler();
  }

  private startCleanupScheduler(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);
  }

  add(sessionId: string, tenantId: string, instance: BrowserInstance): void {
    const cache: SessionCache = {
      sessionId,
      tenantId,
      instance,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      status: 'active',
      lockCount: 0,
    };
    this.sessions.set(sessionId, cache);
    this.logger.log(`Session added: ${sessionId}`);
  }

  get(sessionId: string): SessionCache | undefined {
    const cache = this.sessions.get(sessionId);
    if (cache) {
      cache.lastUsedAt = Date.now();
      cache.status = 'active';
    }
    return cache;
  }

  getByTenant(tenantId: string): SessionCache[] {
    return Array.from(this.sessions.values()).filter((cache) => cache.tenantId === tenantId);
  }

  acquire(sessionId: string): SessionCache | undefined {
    const cache = this.sessions.get(sessionId);
    if (!cache) {
      return undefined;
    }

    if (cache.status === 'expired') {
      return undefined;
    }

    cache.lockCount++;
    cache.lastUsedAt = Date.now();
    cache.status = 'active';
    this.logger.log(`Session acquired: ${sessionId}, lock count: ${cache.lockCount}`);
    return cache;
  }

  release(sessionId: string): void {
    const cache = this.sessions.get(sessionId);
    if (!cache) {
      return;
    }

    cache.lockCount = Math.max(0, cache.lockCount - 1);
    if (cache.lockCount === 0) {
      cache.status = 'idle';
    }
    cache.lastUsedAt = Date.now();
    this.logger.log(`Session released: ${sessionId}, lock count: ${cache.lockCount}`);
  }

  async remove(sessionId: string): Promise<void> {
    const cache = this.sessions.get(sessionId);
    if (!cache) {
      return;
    }

    try {
      await cache.instance.context.close();
      await cache.instance.browser.close();
    } catch (error) {
      this.logger.error(`Failed to close browser instance: ${error.message}`);
    }

    this.sessions.delete(sessionId);
    this.cleanupSessionDir(sessionId);
    this.logger.log(`Session removed: ${sessionId}`);
  }

  async removeByTenant(tenantId: string): Promise<void> {
    const tenantSessions = this.getByTenant(tenantId);
    for (const cache of tenantSessions) {
      await this.remove(cache.sessionId);
    }
  }

  private cleanupSessionDir(sessionId: string): void {
    const sessionDir = path.join(process.cwd(), 'runtime', 'session-cache', sessionId);
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true });
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup session dir: ${error.message}`);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, cache] of this.sessions.entries()) {
      const age = now - cache.createdAt;
      const idleTime = now - cache.lastUsedAt;

      if (age > this.config.maxSessionAge) {
        expiredSessions.push(sessionId);
        this.logger.log(`Session expired by age: ${sessionId}`);
      } else if (cache.lockCount === 0 && idleTime > this.config.maxIdleTime) {
        expiredSessions.push(sessionId);
        this.logger.log(`Session expired by idle time: ${sessionId}`);
      }
    }

    for (const sessionId of expiredSessions) {
      this.remove(sessionId);
    }
  }

  list(): { sessionId: string; tenantId: string; status: string; createdAt: number; lastUsedAt: number }[] {
    return Array.from(this.sessions.values()).map((cache) => ({
      sessionId: cache.sessionId,
      tenantId: cache.tenantId,
      status: cache.status,
      createdAt: cache.createdAt,
      lastUsedAt: cache.lastUsedAt,
    }));
  }

  count(): number {
    return this.sessions.size;
  }

  countByTenant(tenantId: string): number {
    return this.getByTenant(tenantId).length;
  }

  isLocked(sessionId: string): boolean {
    const cache = this.sessions.get(sessionId);
    return cache ? cache.lockCount > 0 : false;
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    const sessions = Array.from(this.sessions.keys());
    sessions.forEach((sessionId) => {
      this.remove(sessionId);
    });
  }
}