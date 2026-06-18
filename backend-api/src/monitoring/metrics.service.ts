import Redis from 'ioredis';

// 监控指标接口
export interface Metrics {
  tenantId?: string;
  timestamp: number;
  reqCount: number;
  reqDurationAvg: number;
  reqDurationP95: number;
  reqDurationP99: number;
  errorCount: number;
  errorRate: number;
  statusCodes: Record<number, number>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  activeSessions: number;
  activeTasks: number;
  memoryUsage: number;
  cpuUsage: number;
}

// 健康检查接口
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: 'up' | 'down' | 'degraded';
    redis: 'up' | 'down' | 'degraded';
    disk: 'up' | 'down' | 'degraded';
    memory: 'up' | 'down' | 'degraded';
  };
  details?: Record<string, any>;
}

// 请求记录接口
interface RequestRecord {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  tenantId?: string;
}

// 指标服务类
export class MetricsService {
  private redisClient: Redis;
  private enableRedis: boolean = false;

  constructor() {
    // 初始化 Redis 客户端
    if (process.env.REDIS_URL) {
      this.initRedis();
    }
  }

  // 初始化 Redis
  private initRedis(): void {
    try {
      this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      this.enableRedis = true;
      console.log('✅ Metrics Redis client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Metrics Redis client:', error);
    }
  }

  // 记录请求指标
  async recordRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    tenantId?: string
  ): Promise<void> {
    if (!this.enableRedis || !this.redisClient) {
      return;
    }

    try {
      const timestamp = Date.now();
      const timeBucket = this.getTimeBucket(timestamp, 'minute'); // 按分钟分桶
      
      // 1. 记录请求计数（按租户、按端点）
      const countKey = `metrics:${tenantId || 'global'}:req_count:${timeBucket}`;
      await this.redisClient.incr(countKey);
      await this.redisClient.expire(countKey, 86400 * 7); // 保留 7 天

      // 2. 记录请求耗时（使用 Sorted Set）
      const durationKey = `metrics:${tenantId || 'global'}:req_duration:${timeBucket}`;
      await this.redisClient.zadd(durationKey, duration, `${timestamp}:${Math.random()}`);
      await this.redisClient.expire(durationKey, 86400 * 7);

      // 3. 记录状态码计数
      const statusKey = `metrics:${tenantId || 'global'}:status:${statusCode}:${timeBucket}`;
      await this.redisClient.incr(statusKey);
      await this.redisClient.expire(statusKey, 86400 * 7);

      // 4. 记录端点计数
      const endpointKey = `metrics:${tenantId || 'global'}:endpoint:${timeBucket}`;
      await this.redisClient.hincrby(endpointKey, url, 1);
      await this.redisClient.expire(endpointKey, 86400 * 7);

      // 5. 记录错误计数（状态码 >= 400）
      if (statusCode >= 400) {
        const errorKey = `metrics:${tenantId || 'global'}:error_count:${timeBucket}`;
        await this.redisClient.incr(errorKey);
        await this.redisClient.expire(errorKey, 86400 * 7);
      }
    } catch (error) {
      console.error('Failed to record request metrics:', error);
    }
  }

  // 获取监控指标
  async getMetrics(tenantId?: string, timeRange: 'minute' | 'hour' | 'day' = 'hour'): Promise<Metrics> {
    if (!this.enableRedis || !this.redisClient) {
      return this.getEmptyMetrics(tenantId);
    }

    try {
      const now = Date.now();
      const timeBucket = this.getTimeBucket(now, timeRange);
      const prefix = tenantId || 'global';

      // 1. 请求计数
      const reqCount = await this.redisClient.get(
        `metrics:${prefix}:req_count:${timeBucket}`
      ) || '0';

      // 2. 错误计数
      const errorCount = await this.redisClient.get(
        `metrics:${prefix}:error_count:${timeBucket}`
      ) || '0';

      // 3. 请求耗时（计算平均值、P95、P99）
      const durationKey = `metrics:${prefix}:req_duration:${timeBucket}`;
      const durations = await this.redisClient.zrange(durationKey, 0, -1, 'WITHSCORES');
      const durationValues = durations
        .filter((_, index) => index % 2 === 1)
        .map((val) => parseFloat(val));

      const reqDurationAvg = durationValues.length > 0
        ? durationValues.reduce((sum, val) => sum + val, 0) / durationValues.length
        : 0;
      const reqDurationP95 = this.calculatePercentile(durationValues, 95);
      const reqDurationP99 = this.calculatePercentile(durationValues, 99);

      // 4. 状态码分布
      const statusCodes: Record<number, number> = {};
      const statusKeys = await this.redisClient.keys(`metrics:${prefix}:status:*:${timeBucket}`);
      for (const key of statusKeys) {
        const statusCode = parseInt(key.split(':')[3]);
        const count = await this.redisClient.get(key) || '0';
        statusCodes[statusCode] = parseInt(count);
      }

      // 5. 热门端点
      const endpointKey = `metrics:${prefix}:endpoint:${timeBucket}`;
      const endpoints = await this.redisClient.hgetall(endpointKey);
      const topEndpoints = Object.entries(endpoints)
        .map(([endpoint, count]) => ({ endpoint, count: parseInt(count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 6. 计算错误率
      const errorRate = parseInt(reqCount) > 0
        ? (parseInt(errorCount) / parseInt(reqCount)) * 100
        : 0;

      // 7. 系统指标（从 process 获取）
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const cpuUsage = process.cpuUsage().user / 1000000; // 秒

      return {
        tenantId,
        timestamp: now,
        reqCount: parseInt(reqCount),
        reqDurationAvg,
        reqDurationP95,
        reqDurationP99,
        errorCount: parseInt(errorCount),
        errorRate,
        statusCodes,
        topEndpoints,
        activeSessions: 0, // 需要从会话存储获取
        activeTasks: 0, // 需要从任务队列获取
        memoryUsage,
        cpuUsage,
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return this.getEmptyMetrics(tenantId);
    }
  }

  // 获取健康检查
  async getHealthCheck(): Promise<HealthCheck> {
    const checks = {
      database: 'down' as 'up' | 'down' | 'degraded',
      redis: 'down' as 'up' | 'down' | 'degraded',
      disk: 'up' as 'up' | 'down' | 'degraded',
      memory: 'up' as 'up' | 'down' | 'degraded',
    };

    const details: Record<string, any> = {};

    // 1. 检查 Redis 连接
    try {
      if (this.redisClient) {
        await this.redisClient.ping();
        checks.redis = 'up';
        details.redis = { status: 'connected' };
      } else {
        checks.redis = 'down';
        details.redis = { status: 'not configured' };
      }
    } catch (error) {
      checks.redis = 'down';
      details.redis = { status: 'error', error: (error as Error).message };
    }

    // 2. 检查内存使用
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memUsagePercent > 90) {
      checks.memory = 'degraded';
    } else if (memUsagePercent > 95) {
      checks.memory = 'down';
    } else {
      checks.memory = 'up';
    }
    details.memory = {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      usage: `${memUsagePercent.toFixed(2)}%`,
    };

    // 3. 检查磁盘空间（简化版）
    try {
      const fs = await import('fs/promises');
      await fs.access('./logs', fs.constants.W_OK);
      checks.disk = 'up';
      details.disk = { status: 'writable' };
    } catch (error) {
      checks.disk = 'degraded';
      details.disk = { status: 'read-only', error: (error as Error).message };
    }

    // 4. 确定整体状态
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (checks.redis === 'down' || checks.memory === 'down') {
      status = 'unhealthy';
    } else if (
      checks.redis === 'degraded' ||
      checks.memory === 'degraded' ||
      checks.disk === 'degraded'
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
      details,
    };
  }

  // 记录浏览器会话指标
  async recordSessionMetric(tenantId: string, action: 'create' | 'close', count: number = 1): Promise<void> {
    if (!this.enableRedis || !this.redisClient) {
      return;
    }

    try {
      const timeBucket = this.getTimeBucket(Date.now(), 'minute');
      const key = `metrics:${tenantId}:session:${action}:${timeBucket}`;
      await this.redisClient.incrby(key, count);
      await this.redisClient.expire(key, 86400 * 7);
    } catch (error) {
      console.error('Failed to record session metric:', error);
    }
  }

  // 记录任务指标
  async recordTaskMetric(
    tenantId: string,
    action: 'create' | 'start' | 'complete' | 'fail',
    count: number = 1
  ): Promise<void> {
    if (!this.enableRedis || !this.redisClient) {
      return;
    }

    try {
      const timeBucket = this.getTimeBucket(Date.now(), 'minute');
      const key = `metrics:${tenantId}:task:${action}:${timeBucket}`;
      await this.redisClient.incrby(key, count);
      await this.redisClient.expire(key, 86400 * 7);
    } catch (error) {
      console.error('Failed to record task metric:', error);
    }
  }

  // 获取时间分桶
  private getTimeBucket(timestamp: number, granularity: 'minute' | 'hour' | 'day'): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    switch (granularity) {
      case 'minute':
        return `${year}${month}${day}${hour}${minute}`;
      case 'hour':
        return `${year}${month}${day}${hour}`;
      case 'day':
        return `${year}${month}${day}`;
    }
  }

  // 计算百分位数
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // 获取空指标
  private getEmptyMetrics(tenantId?: string): Metrics {
    return {
      tenantId,
      timestamp: Date.now(),
      reqCount: 0,
      reqDurationAvg: 0,
      reqDurationP95: 0,
      reqDurationP99: 0,
      errorCount: 0,
      errorRate: 0,
      statusCodes: {},
      topEndpoints: [],
      activeSessions: 0,
      activeTasks: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };
  }

  // 关闭服务
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// 导出单例实例
export const metricsService = new MetricsService();

export default metricsService;
