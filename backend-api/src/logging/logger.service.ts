import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志级别
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 开发环境控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, tenantId, userId, ...meta } = info;
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    const tenantInfo = tenantId ? ` [tenant:${tenantId}]` : '';
    const userInfo = userId ? ` [user:${userId}]` : '';
    return `${timestamp} [${level}]:${tenantInfo}${userInfo} ${message} ${metaStr}`;
  })
);

// 日志条目接口
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  tenantId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  stack?: string;
  [key: string]: any;
}

// 日志服务类
export class LoggerService {
  private logger: winston.Logger;
  private redisClient?: Redis;
  private enableRedis: boolean = false;

  constructor() {
    // 创建 Winston logger 实例
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      levels: logLevels,
      format: logFormat,
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: consoleFormat,
        }),
        // 错误日志文件（按日期轮转）
        new (winston.transports as any).DailyRotateFile({
          filename: path.join(process.env.LOG_DIR || './logs', 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
        }),
        // 综合日志文件（按日期轮转）
        new (winston.transports as any).DailyRotateFile({
          filename: path.join(process.env.LOG_DIR || './logs', 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
    });

    // 初始化 Redis 客户端（用于集中式日志存储）
    if (process.env.REDIS_URL) {
      this.initRedis();
    }
  }

  // 初始化 Redis
  private initRedis(): void {
    try {
      this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      this.enableRedis = true;
      this.info('Redis logger initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Redis logger:', error);
    }
  }

  // 记录 INFO 级别日志
  info(message: string, meta?: Record<string, any>): void {
    const logEntry = this.buildLogEntry('info', message, meta);
    this.logger.info(message, meta);
    this.storeToRedis(logEntry);
  }

  // 记录 WARN 级别日志
  warn(message: string, meta?: Record<string, any>): void {
    const logEntry = this.buildLogEntry('warn', message, meta);
    this.logger.warn(message, meta);
    this.storeToRedis(logEntry);
  }

  // 记录 ERROR 级别日志
  error(message: string, error?: Error, meta?: Record<string, any>): void {
    const errorMeta = {
      ...meta,
      error: error?.message,
      stack: error?.stack,
    };
    const logEntry = this.buildLogEntry('error', message, errorMeta);
    this.logger.error(message, errorMeta);
    this.storeToRedis(logEntry);
  }

  // 记录 DEBUG 级别日志
  debug(message: string, meta?: Record<string, any>): void {
    const logEntry = this.buildLogEntry('debug', message, meta);
    this.logger.debug(message, meta);
    // Debug 日志不存储到 Redis（避免存储压力过大）
  }

  // 记录 HTTP 请求日志
  http(message: string, meta?: Record<string, any>): void {
    const logEntry = this.buildLogEntry('http', message, meta);
    this.logger.http(message, meta);
    this.storeToRedis(logEntry);
  }

  // 构建日志条目
  private buildLogEntry(level: string, message: string, meta?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
  }

  // 存储日志到 Redis（用于集中查询）
  private async storeToRedis(logEntry: LogEntry): Promise<void> {
    if (!this.enableRedis || !this.redisClient) {
      return;
    }

    try {
      const key = `log:${logEntry.tenantId || 'global'}:${logEntry.level}`;
      const value = JSON.stringify(logEntry);
      
      // 使用 List 存储，保留最近 1000 条日志
      await this.redisClient.lpush(key, value);
      await this.redisClient.ltrim(key, 0, 999);
      
      // 设置过期时间（7 天）
      await this.redisClient.expire(key, 604800);
    } catch (error) {
      // 避免递归错误（Redis 存储失败时不要再次调用 this.error）
      console.error('Failed to store log to Redis:', error);
    }
  }

  // 查询日志（从 Redis）
  async queryLogs(
    tenantId: string = 'global',
    level?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<LogEntry[]> {
    if (!this.enableRedis || !this.redisClient) {
      return [];
    }

    try {
      const key = `log:${tenantId}:${level || 'info'}`;
      const logs = await this.redisClient.lrange(key, offset, offset + limit - 1);
      return logs.map((log) => JSON.parse(log));
    } catch (error) {
      this.logger.error('Failed to query logs from Redis:', error);
      return [];
    }
  }

  // 获取 Winston logger 实例（用于兼容现有代码）
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  // 关闭日志服务
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.logger.close();
  }
}

// 导出单例实例
export const loggerService = new LoggerService();

// 兼容现有代码的默认导出
export default loggerService;
