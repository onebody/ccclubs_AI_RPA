# 实时监控与日志系统文档

> **模块**: 后端 API 模块 - 监控与日志  
> **版本**: v1.0  
> **日期**: 2026-06-18  
> **作者**: redis-engineer

---

## 目录

1. [概述](#1-概述)
2. [架构设计](#2-架构设计)
3. [日志系统](#3-日志系统)
4. [监控指标](#4-监控指标)
5. [实时日志推送](#5-实时日志推送)
6. [健康检查](#6-健康检查)
7. [告警系统](#7-告警系统)
8. [API 接口](#8-api-接口)
9. [配置说明](#9-配置说明)
10. [使用示例](#10-使用示例)

---

## 1. 概述

### 1.1 功能特性

- **日志收集**: 多级别日志记录（INFO/WARN/ERROR/DEBUG），支持文件轮转和 Redis 集中存储
- **监控指标**: 请求计数、响应时间、错误率、状态码分布等实时监控指标
- **实时推送**: 通过 WebSocket (Socket.io) 实时推送日志到前端
- **健康检查**: 基础/Kubernetes 就绪/存活检查，依赖服务状态监控
- **告警系统**: 可配置的告警规则，支持 Email/Webhook/Slack 多种渠道

### 1.2 技术栈

| 组件 | 技术 |
|------|------|
| 日志库 | Winston + winston-daily-rotate-file |
| 监控存储 | Redis (时间序列数据) |
| 实时推送 | Socket.io |
| 健康检查 | 自定义中间件 |

---

## 2. 架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                       前端 (Dashboard)                        │
│  ┌──────────────────┐      ┌────────────────────────────┐   │
│  │  日志查看页面     │      │   监控指标图表              │   │
│  └────────┬─────────┘      └────────────┬───────────────┘   │
│           │                            │                    │
│           │ WebSocket                  │ HTTP API           │
│           ▼                            ▼                    │
├─────────────────────────────────────────────────────────────┤
│                    后端 API (Express)                         │
│  ┌──────────────────┐      ┌────────────────────────────┐   │
│  │  LoggerMiddleware │      │   MetricsController        │   │
│  └────────┬─────────┘      └────────────┬───────────────┘   │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌──────────────────┐      ┌────────────────────────────┐   │
│  │  LoggerService    │      │   MetricsService           │   │
│  └────────┬─────────┘      └────────────┬───────────────┘   │
│           │                            │                    │
│           └────────────┬───────────────┘                    │
│                        ▼                                    │
│           ┌────────────────────────────┐                    │
│           │  LogGateway (WebSocket)     │                    │
│           └────────────────────────────┘                    │
├─────────────────────────────────────────────────────────────┤
│                      数据存储                                 │
│  ┌──────────────────┐      ┌────────────────────────────┐   │
│  │  文件日志         │      │   Redis                    │   │
│  │  (logs/*.log)    │      │   (指标/日志缓存)            │   │
│  └──────────────────┘      └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 多租户隔离

- **日志隔离**: 日志中记录 `tenantId`，Redis Key 包含租户前缀 `log:{tenant_id}:{level}`
- **监控隔离**: 监控指标按租户分桶 `metrics:{tenant_id}:req_count:{time_bucket}`
- **实时推送隔离**: WebSocket 连接绑定租户，只能订阅本租户日志

---

## 3. 日志系统

### 3.1 日志级别

| 级别 | 数值 | 用途 |
|------|------|------|
| error | 0 | 错误信息（影响功能） |
| warn | 1 | 警告信息（潜在问题） |
| info | 2 | 一般信息（正常流程） |
| http | 3 | HTTP 请求日志 |
| debug | 4 | 调试信息（开发环境） |

### 3.2 日志格式

**控制台输出** (开发环境):

```
2026-06-18 10:00:00 [info]: [tenant:tenant_001] [user:user_123] User logged in {"ip": "180.200.134.171"}
```

**文件输出** (JSON 格式):

```json
{
  "timestamp": "2026-06-18T10:00:00.000Z",
  "level": "info",
  "message": "User logged in",
  "tenantId": "tenant_001",
  "userId": "user_123",
  "ip": "180.200.134.171",
  "method": "POST",
  "url": "/api/v1/auth/login"
}
```

### 3.3 日志存储

**文件存储**:
- 错误日志: `logs/error-YYYY-MM-DD.log` (按日期轮转，保留 14 天)
- 综合日志: `logs/combined-YYYY-MM-DD.log` (按日期轮转，保留 14 天)
- 单文件最大: 20MB

**Redis 存储**:
- Key 格式: `log:{tenant_id}:{level}`
- 数据结构: List (保留最近 1000 条)
- TTL: 7 天

### 3.4 使用方法

**在服务中使用**:

```typescript
import { loggerService } from '../logging/logger.service';

// 记录信息日志
loggerService.info('User logged in', { tenantId: 'tenant_001', userId: 'user_123' });

// 记录警告日志
loggerService.warn('Rate limit approaching', { tenantId: 'tenant_001', current: 80, max: 100 });

// 记录错误日志
loggerService.error('Database connection failed', error, { tenantId: 'tenant_001' });

// 记录调试日志
loggerService.debug('Processing request', { data: requestData });
```

**在 Express 路由中使用**:

```typescript
import { createRequestLogger } from '../logging/logger.middleware';

app.get('/api/users', (req, res) => {
  const logger = createRequestLogger(req);
  
  logger.info('Fetching users');
  // ... 业务逻辑
  logger.info('Users fetched successfully', { count: users.length });
});
```

---

## 4. 监控指标

### 4.1 指标类型

| 指标 | 说明 | 存储 Key 格式 |
|------|------|---------------|
| req_count | 请求计数 | `metrics:{tenant_id}:req_count:{time_bucket}` |
| req_duration | 请求耗时 | `metrics:{tenant_id}:req_duration:{time_bucket}` (Sorted Set) |
| error_count | 错误计数 | `metrics:{tenant_id}:error_count:{time_bucket}` |
| status_code | 状态码分布 | `metrics:{tenant_id}:status:{code}:{time_bucket}` |
| endpoint | 端点计数 | `metrics:{tenant_id}:endpoint:{time_bucket}` (Hash) |
| session_create | 会话创建数 | `metrics:{tenant_id}:session:create:{time_bucket}` |
| session_close | 会话关闭数 | `metrics:{tenant_id}:session:close:{time_bucket}` |
| task_create | 任务创建数 | `metrics:{tenant_id}:task:create:{time_bucket}` |
| task_complete | 任务完成数 | `metrics:{tenant_id}:task:complete:{time_bucket}` |
| task_fail | 任务失败数 | `metrics:{tenant_id}:task:fail:{time_bucket}` |

### 4.2 时间分桶

| 粒度 | 格式 | 示例 |
|------|------|------|
| 分钟 | `YYYYMMDDHHmm` | `202606181030` |
| 小时 | `YYYYMMDDHH` | `2026061810` |
| 天 | `YYYYMMDD` | `20260618` |

### 4.3 指标保留

- 分钟级数据: 保留 7 天
- 小时级数据: 保留 30 天
- 天级数据: 保留 90 天

### 4.4 使用方法

**记录请求指标**:

```typescript
import { metricsService } from '../monitoring/metrics.service';

// 在请求完成后记录
app.use(async (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    await metricsService.recordRequest(
      req.method,
      req.url,
      res.statusCode,
      duration,
      (req as any).tenantId
    );
  });
  
  next();
});
```

**查询监控指标**:

```typescript
import { metricsService } from '../monitoring/metrics.service';

// 获取全局指标
const metrics = await metricsService.getMetrics();

// 获取指定租户指标
const tenantMetrics = await metricsService.getMetrics('tenant_001', 'hour');
```

---

## 5. 实时日志推送

### 5.1 WebSocket 连接

**客户端连接** (JavaScript):

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token',
  },
  query: {
    tenantId: 'tenant_001',
    userId: 'user_123',
  },
});

// 监听连接成功
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// 订阅日志级别
socket.emit('subscribe', { levels: ['info', 'warn', 'error'] });

// 监听日志推送
socket.on('log', (logEntry) => {
  console.log('New log:', logEntry);
  // 在 UI 中显示日志
});

// 监听告警推送
socket.on('alert', (alert) => {
  console.log('New alert:', alert);
  // 显示告警通知
});
```

### 5.2 多租户隔离

- 客户端连接时传递 `tenantId`
- 服务器端只推送该租户的日志
- `global` 租户可以接收所有日志（超级管理员）

---

## 6. 健康检查

### 6.1 检查端点

| 端点 | 用途 | 说明 |
|------|------|------|
| `GET /health` | 基础健康检查 | 返回系统整体状态 |
| `GET /health/ready` | 就绪检查 | Kubernetes readinessProbe |
| `GET /health/live` | 存活检查 | Kubernetes livenessProbe |

### 6.2 检查项目

| 项目 | 说明 | 判定标准 |
|------|------|----------|
| database | 数据库连接 | Ping 成功为 up |
| redis | Redis 连接 | Ping 成功为 up |
| disk | 磁盘空间 | 可写为 up |
| memory | 内存使用 | < 90% 为 up, > 95% 为 down |

### 6.3 健康状态

| 状态 | 说明 | HTTP 状态码 |
|------|------|-------------|
| healthy | 所有检查通过 | 200 |
| degraded | 部分检查失败（非关键） | 200 |
| unhealthy | 关键检查失败 | 503 |

### 6.4 使用示例

**cURL 请求**:

```bash
# 基础健康检查
curl http://localhost:3000/health

# 就绪检查
curl http://localhost:3000/health/ready

# 存活检查
curl http://localhost:3000/health/live
```

**Kubernetes 配置**:

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: backend-api
      livenessProbe:
        httpGet:
          path: /health/live
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
```

---

## 7. 告警系统

### 7.1 默认告警规则

| 规则 ID | 名称 | 指标 | 阈值 | 严重级别 |
|---------|------|------|------|----------|
| rule-001 | 高错误率告警 | errorRate | > 5% | warning |
| rule-002 | 高响应时间告警 | reqDurationAvg | > 1000ms | warning |
| rule-003 | 存储空间不足告警 | memoryUsage | > 90% | critical |

### 7.2 告警渠道

| 渠道 | 配置参数 |
|------|----------|
| Email | `smtp_host`, `smtp_port`, `from`, `to` |
| Webhook | `url` |
| Slack | `webhook_url` |

### 7.3 配置告警规则

**通过 API 添加规则** (待实现):

```json
POST /api/v1/alert/rules
{
  "name": "自定义告警规则",
  "description": "请求计数超过阈值",
  "metric": "reqCount",
  "condition": "gt",
  "threshold": 1000,
  "duration": 300,
  "tenantId": "tenant_001",
  "enabled": true,
  "channels": [
    {
      "type": "webhook",
      "config": {
        "url": "https://your-webhook.com/alert"
      }
    }
  ]
}
```

### 7.4 告警消息格式

**Webhook 推送格式**:

```json
{
  "id": "rule-001:tenant_001",
  "ruleId": "rule-001",
  "ruleName": "高错误率告警",
  "tenantId": "tenant_001",
  "metric": "errorRate",
  "value": 8.5,
  "threshold": 5,
  "message": "高错误率告警: errorRate = 8.5 gt 5",
  "severity": "warning",
  "timestamp": "2026-06-18T10:00:00.000Z",
  "status": "active"
}
```

---

## 8. API 接口

### 8.1 监控指标接口

**获取监控指标**:

```
GET /api/v1/metrics?tenantId=tenant_001&timeRange=hour
```

**响应**:

```json
{
  "success": true,
  "data": {
    "tenantId": "tenant_001",
    "timestamp": 1718700000000,
    "reqCount": 1234,
    "reqDurationAvg": 245.6,
    "reqDurationP95": 890.3,
    "reqDurationP99": 1200.5,
    "errorCount": 23,
    "errorRate": 1.86,
    "statusCodes": {
      "200": 1100,
      "400": 20,
      "500": 3
    },
    "topEndpoints": [
      { "endpoint": "/api/v1/sessions", "count": 500 },
      { "endpoint": "/api/v1/tasks", "count": 300 }
    ],
    "activeSessions": 15,
    "activeTasks": 8,
    "memoryUsage": 256.7,
    "cpuUsage": 15.3
  },
  "timestamp": "2026-06-18T10:00:00.000Z"
}
```

**获取指定租户指标**:

```
GET /api/v1/metrics/tenant/tenant_001?timeRange=day
```

**获取系统概况** (管理员):

```
GET /api/v1/metrics/overview
```

### 8.2 健康检查接口

**基础健康检查**:

```
GET /health
```

**响应**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-06-18T10:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "checks": {
      "database": "up",
      "redis": "up",
      "disk": "up",
      "memory": "up"
    },
    "details": {
      "redis": { "status": "connected" },
      "memory": {
        "heapUsed": "256.70 MB",
        "heapTotal": "512.00 MB",
        "usage": "50.13%"
      }
    }
  }
}
```

### 8.3 日志查询接口

**查询日志** (待实现):

```
GET /api/v1/logs?tenantId=tenant_001&level=error&limit=100&offset=0
```

---

## 9. 配置说明

### 9.1 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `LOG_LEVEL` | 日志级别 | `info` |
| `LOG_DIR` | 日志目录 | `./logs` |
| `REDIS_URL` | Redis 连接 URL | `redis://localhost:6379` |
| `WEBHOOK_URL` | 告警 Webhook URL | - |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL | - |
| `CORS_ORIGIN` | CORS 允许的源 | `*` |

### 9.2 Winston 配置

**日志级别**: 在 `logger.service.ts` 中定义

**文件轮转**: 使用 `winston-daily-rotate-file` 插件

**自定义格式**: 可以修改 `logFormat` 或 `consoleFormat`

### 9.3 告警配置

**告警规则**: 在 `alert.service.ts` 的 `loadDefaultRules()` 中配置

**检查间隔**: 默认 60 秒，可在启动时修改

```typescript
alertService.startChecking(30000); // 30 秒检查一次
```

---

## 10. 使用示例

### 10.1 启动监控服务

**修改 `server.ts`**:

```typescript
import app from './app';
import config from './config/index';
import logger from './utils/logger';
import { createLogGateway } from './websocket/log.gateway';
import { alertService } from './alert/alert.service';

// 启动服务器
const server = app.listen(config.port, config.host, () => {
  logger.info(`🚀 Server is running on ${config.host}:${config.port}`);
  
  // 初始化 WebSocket 网关
  const logGateway = createLogGateway(server);
  logger.info('✅ Log gateway initialized');
  
  // 启动告警检查
  alertService.startChecking(60000); // 每 60 秒检查一次
  logger.info('✅ Alert service started');
});

export default server;
```

### 10.2 查看实时监控

**1. 使用 cURL 查询指标**:

```bash
# 查询全局指标
curl http://localhost:3000/api/v1/metrics

# 查询指定租户指标
curl http://localhost:3000/api/v1/metrics/tenant/tenant_001?timeRange=hour
```

**2. 使用浏览器查看健康检查**:

```
http://localhost:3000/health
```

**3. 使用 WebSocket 客户端查看实时日志**:

```javascript
const socket = io('http://localhost:3000', {
  query: {
    tenantId: 'tenant_001',
    userId: 'user_123',
  },
});

socket.on('log', (log) => {
  console.log('Real-time log:', log);
});
```

### 10.3 日志文件查看

**查看实时日志**:

```bash
# 实时查看综合日志
tail -f logs/combined-$(date +%Y-%m-%d).log

# 实时查看错误日志
tail -f logs/error-$(date +%Y-%m-%d).log

# 搜索错误日志
grep "ERROR" logs/combined-$(date +%Y-%m-%d).log
```

---

## 附录

### A. 文件清单

| 文件路径 | 说明 |
|----------|------|
| `src/logging/logger.service.ts` | 日志服务 |
| `src/logging/logger.middleware.ts` | 日志中间件 |
| `src/monitoring/metrics.service.ts` | 监控指标服务 |
| `src/monitoring/metrics.controller.ts` | 监控指标控制器 |
| `src/websocket/log.gateway.ts` | 日志推送网关 |
| `src/alert/alert.service.ts` | 告警服务 |
| `src/health/health.service.ts` | 健康检查服务 |
| `docs/monitoring.md` | 本文档 |

### B. 依赖包

```json
{
  "winston": "^3.11.0",
  "winston-daily-rotate-file": "^4.7.1",
  "socket.io": "^4.7.0",
  "ioredis": "^5.3.0",
  "redis": "^4.6.0"
}
```

---

**变更记录**

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-06-18 | redis-engineer | 初始版本 |

---
