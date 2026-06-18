# AI Browser SaaS Platform - Backend API

基于 Express + TypeScript 的后端 API 服务，为 AI Browser SaaS Platform 提供核心接口服务。

## 📋 目录结构

```
backend-api/
├── src/
│   ├── app.ts              # Express 应用初始化
│   ├── server.ts           # 服务器启动入口
│   ├── config/             # 配置文件
│   │   └── index.ts
│   ├── controllers/        # 控制器
│   │   └── health.controller.ts
│   ├── routes/             # 路由
│   │   └── health.routes.ts
│   ├── middleware/         # 中间件（预留）
│   ├── models/             # 数据模型（预留）
│   └── utils/              # 工具函数
│       └── logger.ts
├── dist/                   # 编译输出目录
├── logs/                   # 日志文件目录
├── package.json
├── tsconfig.json
├── .env                    # 环境变量（本地）
├── .env.example            # 环境变量示例
└── README.md
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
cd backend-api
npm install
```

### 环境配置

1. 复制环境变量示例文件：

```bash
cp .env.example .env
```

2. 根据需要修改 `.env` 文件中的配置项。

### 启动服务

#### 开发模式（热重载）

```bash
npm run dev
```

#### 生产模式

```bash
# 编译 TypeScript
npm run build

# 启动服务
npm start
```

## 📡 API 端点

### 健康检查

- `GET /api/v1/health/check` - 完整健康检查
- `GET /api/v1/health/ping` - 简单 ping 测试
- `GET /api/v1/health/ready` - 就绪检查（Kubernetes）
- `GET /api/v1/health/live` - 存活检查（Kubernetes）

### 根路由

- `GET /` - API 基本信息

## 🔧 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | development | 运行环境 |
| PORT | 3000 | 服务端口 |
| HOST | 0.0.0.0 | 服务主机 |
| CORS_ORIGIN | * | CORS 允许的源 |
| RATE_LIMIT_WINDOW_MS | 900000 | 限流时间窗口（毫秒） |
| RATE_LIMIT_MAX_REQUESTS | 100 | 时间窗口内最大请求数 |
| LOG_LEVEL | info | 日志级别 |
| LOG_DIR | ./logs | 日志文件目录 |
| HELMET_ENABLED | true | 是否启用 Helmet 安全头 |
| API_VERSION | v1 | API 版本 |
| API_PREFIX | /api | API 路径前缀 |

## 🛡️ 中间件

项目已配置以下中间件：

- **CORS** - 跨域资源共享支持
- **Helmet** - 安全 HTTP 头设置
- **Morgan** - HTTP 请求日志记录
- **Express-rate-limit** - API 限流保护
- **Body-parser** - 请求体解析
- **Compression** - 响应压缩

## 📝 日志

使用 Winston 进行日志记录，日志文件存储在 `logs/` 目录：

- `error.log` - 错误日志
- `combined.log` - 综合日志
- 控制台输出（开发环境）

日志级别：error < warn < info < http < debug

## 🧪 脚本命令

```bash
npm run dev      # 开发模式启动（热重载）
npm run build    # 编译 TypeScript
npm start        # 生产模式启动
npm run lint     # ESLint 检查
npm run format   # Prettier 格式化
```

## 📦 依赖项

### 生产依赖

- express - Web 框架
- cors - 跨域支持
- helmet - 安全头
- morgan - HTTP 日志
- express-rate-limit - 限流
- dotenv - 环境变量管理
- winston - 日志框架
- body-parser - 请求体解析
- compression - 响应压缩

### 开发依赖

- typescript - TypeScript 编译器
- ts-node - TypeScript 运行时
- nodemon - 热重载
- @types/* - TypeScript 类型定义
- eslint - 代码检查
- prettier - 代码格式化

## 🔒 安全

- 使用 Helmet 设置安全 HTTP 头
- 启用 CORS 控制跨域访问
- 实施 API 限流防止滥用
- 禁用 X-Powered-By 信息泄露

## 📄 许可证

MIT License

## 👥 团队

AI Browser SaaS Platform Team
