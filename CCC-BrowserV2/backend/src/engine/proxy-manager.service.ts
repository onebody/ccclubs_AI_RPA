import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface Proxy {
  ip: string;
  port: number;
  type: 'http' | 'https' | 'socks5';
  username?: string;
  password?: string;
  location?: string;
  lastUsedAt: number;
  healthScore: number;
  status: 'available' | 'busy' | 'unhealthy' | 'disabled';
  tenantId?: string;
}

export interface ProxyConfig {
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxFailures: number;
  rotationStrategy: 'round-robin' | 'least-used' | 'best-health';
}

const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  healthCheckInterval: 60000,
  healthCheckTimeout: 5000,
  maxFailures: 3,
  rotationStrategy: 'round-robin',
};

const TEST_URL = 'http://www.baidu.com';

@Injectable()
export class ProxyManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(ProxyManagerService.name);
  private readonly proxies = new Map<string, Proxy>();
  private readonly config: ProxyConfig;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private roundRobinIndex = 0;

  constructor(@Optional() config: Partial<ProxyConfig> = {}) {
    this.config = { ...DEFAULT_PROXY_CONFIG, ...config };
    this.startHealthCheckScheduler();
  }

  private startHealthCheckScheduler(): void {
    this.healthCheckTimer = setInterval(() => {
      this.healthCheckAll();
    }, this.config.healthCheckInterval);
  }

  add(proxy: Omit<Proxy, 'lastUsedAt' | 'healthScore' | 'status'>): void {
    const key = `${proxy.ip}:${proxy.port}`;
    const existing = this.proxies.get(key);

    const proxyEntry: Proxy = {
      ...proxy,
      lastUsedAt: existing?.lastUsedAt || Date.now(),
      healthScore: existing?.healthScore || 100,
      status: 'available',
    };

    this.proxies.set(key, proxyEntry);
    this.logger.log(`Proxy added: ${key}`);
  }

  addBatch(proxies: Omit<Proxy, 'lastUsedAt' | 'healthScore' | 'status'>[]): void {
    proxies.forEach((proxy) => this.add(proxy));
    this.logger.log(`Batch added ${proxies.length} proxies`);
  }

  remove(ip: string, port: number): void {
    const key = `${ip}:${port}`;
    this.proxies.delete(key);
    this.logger.log(`Proxy removed: ${key}`);
  }

  removeByTenant(tenantId: string): void {
    const tenantProxies = Array.from(this.proxies.values()).filter((p) => p.tenantId === tenantId);
    tenantProxies.forEach((proxy) => this.remove(proxy.ip, proxy.port));
    this.logger.log(`Removed ${tenantProxies.length} proxies for tenant: ${tenantId}`);
  }

  get(ip: string, port: number): Proxy | undefined {
    return this.proxies.get(`${ip}:${port}`);
  }

  getAvailable(tenantId?: string): Proxy[] {
    return Array.from(this.proxies.values()).filter((proxy) => {
      if (proxy.status !== 'available') return false;
      if (tenantId && proxy.tenantId !== tenantId) return false;
      return proxy.healthScore >= 50;
    });
  }

  acquire(tenantId?: string): Proxy | undefined {
    const available = this.getAvailable(tenantId);
    if (available.length === 0) {
      return undefined;
    }

    let selected: Proxy;
    switch (this.config.rotationStrategy) {
      case 'round-robin':
        this.roundRobinIndex = (this.roundRobinIndex + 1) % available.length;
        selected = available[this.roundRobinIndex];
        break;
      case 'least-used':
        selected = available.reduce((prev, curr) => (prev.lastUsedAt < curr.lastUsedAt ? prev : curr));
        break;
      case 'best-health':
        selected = available.reduce((prev, curr) => (prev.healthScore > curr.healthScore ? prev : curr));
        break;
      default:
        selected = available[0];
    }

    const key = `${selected.ip}:${selected.port}`;
    const proxy = this.proxies.get(key);
    if (proxy) {
      proxy.status = 'busy';
      proxy.lastUsedAt = Date.now();
    }

    this.logger.log(`Proxy acquired: ${key}`);
    return proxy;
  }

  release(ip: string, port: number): void {
    const key = `${ip}:${port}`;
    const proxy = this.proxies.get(key);
    if (proxy) {
      proxy.status = 'available';
      proxy.lastUsedAt = Date.now();
      this.logger.log(`Proxy released: ${key}`);
    }
  }

  async healthCheck(proxy: Proxy): Promise<boolean> {
    const key = `${proxy.ip}:${proxy.port}`;
    return new Promise((resolve) => {
      const url = new URL(TEST_URL);
      const options: http.RequestOptions = {
        hostname: proxy.ip,
        port: proxy.port,
        path: url.pathname,
        method: 'HEAD',
        timeout: this.config.healthCheckTimeout,
        headers: {
          Host: url.hostname,
        },
      };

      if (proxy.username && proxy.password) {
        options.auth = `${proxy.username}:${proxy.password}`;
      }

      const req = http.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          proxy.healthScore = Math.min(100, proxy.healthScore + 10);
          proxy.status = 'available';
          resolve(true);
        } else {
          proxy.healthScore = Math.max(0, proxy.healthScore - 20);
          if (proxy.healthScore <= 0) {
            proxy.status = 'unhealthy';
          }
          resolve(false);
        }
        res.resume();
      });

      req.on('error', () => {
        proxy.healthScore = Math.max(0, proxy.healthScore - 30);
        if (proxy.healthScore <= 0) {
          proxy.status = 'unhealthy';
        }
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        proxy.healthScore = Math.max(0, proxy.healthScore - 25);
        if (proxy.healthScore <= 0) {
          proxy.status = 'unhealthy';
        }
        resolve(false);
      });

      req.end();
    });
  }

  private async healthCheckAll(): Promise<void> {
    const availableProxies = Array.from(this.proxies.values()).filter((p) => p.status !== 'disabled');
    for (const proxy of availableProxies) {
      await this.healthCheck(proxy);
    }
    this.logger.log(`Health check completed for ${availableProxies.length} proxies`);
  }

  disable(ip: string, port: number): void {
    const key = `${ip}:${port}`;
    const proxy = this.proxies.get(key);
    if (proxy) {
      proxy.status = 'disabled';
      this.logger.log(`Proxy disabled: ${key}`);
    }
  }

  enable(ip: string, port: number): void {
    const key = `${ip}:${port}`;
    const proxy = this.proxies.get(key);
    if (proxy) {
      proxy.status = 'available';
      proxy.healthScore = 100;
      this.logger.log(`Proxy enabled: ${key}`);
    }
  }

  list(): Proxy[] {
    return Array.from(this.proxies.values());
  }

  count(): number {
    return this.proxies.size;
  }

  countAvailable(): number {
    return this.getAvailable().length;
  }

  updateProxy(ip: string, port: number, updates: Partial<Omit<Proxy, 'ip' | 'port' | 'lastUsedAt' | 'healthScore' | 'status'>>): void {
    const key = `${ip}:${port}`;
    const proxy = this.proxies.get(key);
    if (proxy) {
      Object.assign(proxy, updates);
      this.logger.log(`Proxy updated: ${key}`);
    }
  }

  onModuleDestroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}