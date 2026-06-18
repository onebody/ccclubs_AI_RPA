import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import compression from 'compression';
import config from './config/index';
import { loggerService } from './logging/logger.service';
import { loggerMiddleware } from './logging/logger.middleware';
import healthRoutes from './routes/health.routes';
import tenantRoutes from './routes/tenant.routes';
import userRoutes from './routes/user.routes';
import competitionRoutes from './routes/competition.routes';
import metricsRoutes from './monitoring/metrics.controller';
import { AppDataSource } from './config/database';

// 创建 Express 应用
const app: Express = express();

// ============================================================
// 安全中间件
// ============================================================

// Helmet - 安全头设置
if (config.security.helmetEnabled) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
}

// CORS - 跨域支持
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// 请求解析中间件
// ============================================================

// Body Parser - 解析请求体
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Compression - 响应压缩
app.use(compression());

// ============================================================
// 日志中间件
// ============================================================

// Morgan - HTTP 请求日志（简单格式，用于访问日志）
app.use(morgan('combined', {
  stream: {
    write: (message: string) => loggerService.info(message.trim()),
  },
}));

// 自定义日志中间件 - 记录请求详情（带租户上下文）
app.use(loggerMiddleware);

// ============================================================
// 限流中间件
// ============================================================

// Rate Limiting - 限流保护
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ============================================================
// 数据库初始化
// ============================================================

// 初始化 TypeORM 连接
AppDataSource.initialize()
  .then(() => {
    loggerService.info('✅ Data Source has been initialized!');
    // 将 DataSource 附加到 app，以便在中间件中访问
    app.set('dataSource', AppDataSource);
  })
  .catch((err) => {
    loggerService.error('❌ Error during Data Source initialization:', err);
  });

// ============================================================
// 路由定义
// ============================================================

// 健康检查路由
app.use(`${config.api.prefix}/${config.api.version}/health`, healthRoutes);

// 监控指标路由
app.use(`${config.api.prefix}/${config.api.version}/metrics`, metricsRoutes);

// 租户管理路由
app.use(`${config.api.prefix}/${config.api.version}/tenants`, tenantRoutes);

// 用户管理路由
app.use(`${config.api.prefix}/${config.api.version}/users`, userRoutes);

// 比赛管理路由
app.use(`${config.api.prefix}/${config.api.version}/competitions`, competitionRoutes);

// 根路由
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'QiYun AI System - Multi-tenant Competition Management Platform',
    version: config.api.version,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${config.api.prefix}/${config.api.version}/health`,
      metrics: `${config.api.prefix}/${config.api.version}/metrics`,
      tenants: `${config.api.prefix}/${config.api.version}/tenants`,
      users: `${config.api.prefix}/${config.api.version}/users`,
      competitions: `${config.api.prefix}/${config.api.version}/competitions`,
    },
  });
});

// ============================================================
// 错误处理中间件
// ============================================================

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// 全局错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  loggerService.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.env === 'development' ? err.message : undefined,
  });
});

export default app;
