import { Request, Response, NextFunction } from 'express';
import { loggerService, LogEntry } from './logger.service';

// 请求日志中间件
export const loggerMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const start = Date.now();
  
  // 提取租户信息（从请求头或 JWT token）
  const tenantId = (req as any).tenantId || (req.headers['x-tenant-id'] as string) || 'unknown';
  const userId = (req as any).userId || (req.headers['x-user-id'] as string) || 'anonymous';

  // 记录请求开始
  const requestMeta = {
    tenantId,
    userId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
  };

  loggerService.http(`${req.method} ${req.url} - Started`, requestMeta);

  // 响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    const responseMeta = {
      ...requestMeta,
      statusCode,
      duration,
    };

    // 根据状态码选择日志级别
    if (statusCode >= 500) {
      loggerService.error(`${req.method} ${req.url} ${statusCode} (${duration}ms)`, undefined, responseMeta);
    } else if (statusCode >= 400) {
      loggerService.warn(`${req.method} ${req.url} ${statusCode} (${duration}ms)`, responseMeta);
    } else {
      loggerService.http(`${req.method} ${req.url} ${statusCode} (${duration}ms)`, responseMeta);
    }
  });

  // 响应出错时记录
  res.on('error', (error: Error) => {
    const duration = Date.now() - start;
    loggerService.error(`${req.method} ${req.url} - Response Error (${duration}ms)`, error, {
      tenantId,
      userId,
      method: req.method,
      url: req.url,
    });
  });

  next();
};

// 错误日志中间件（全局错误处理）
export const errorLoggerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const tenantId = (req as any).tenantId || 'unknown';
  const userId = (req as any).userId || 'anonymous';

  loggerService.error('Unhandled error', err, {
    tenantId,
    userId,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  next(err);
};

// 获取请求上下文（用于在其他地方记录日志时带上租户信息）
export const getRequestContext = (req: Request): Partial<LogEntry> => {
  return {
    tenantId: (req as any).tenantId || 'unknown',
    userId: (req as any).userId || 'anonymous',
    ip: req.ip || req.socket.remoteAddress,
    method: req.method,
    url: req.url,
  };
};

// 创建带请求上下文的日志辅助函数
export const createRequestLogger = (req: Request) => {
  const context = getRequestContext(req);
  
  return {
    info: (message: string, meta?: Record<string, any>) => {
      loggerService.info(message, { ...context, ...meta });
    },
    warn: (message: string, meta?: Record<string, any>) => {
      loggerService.warn(message, { ...context, ...meta });
    },
    error: (message: string, error?: Error, meta?: Record<string, any>) => {
      loggerService.error(message, error, { ...context, ...meta });
    },
    debug: (message: string, meta?: Record<string, any>) => {
      loggerService.debug(message, { ...context, ...meta });
    },
    http: (message: string, meta?: Record<string, any>) => {
      loggerService.http(message, { ...context, ...meta });
    },
  };
};
