# RPA自动化系统后端服务

## 环境要求

- Node.js: 20.12.2 (严格锁定)
- npm: 10.5.0
- PostgreSQL: 15.8
- Redis: 7.0.15

## 安装依赖

```bash
npm ci
```

## 环境配置

创建 `.env` 文件:

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=rpa_user
DB_PASSWORD=rpa_password
DB_DATABASE=rpa_system

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# 服务配置
PORT=3000
HOST=127.0.0.1

# 加密密钥
ENCRYPTION_KEY=your-encryption-key
```

## 数据库初始化

```bash
# 创建数据库
createdb rpa_system

# 运行迁移
npm run migration:run
```

## 启动服务

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run start:prod
```

## API文档

启动服务后访问: http://127.0.0.1:3000/api

## 项目结构

```
src/
├── main.ts                    # 应用入口
├── app.module.ts              # 应用模块
├── engine/                    # 沙箱引擎模块
├── process-config/            # 流程模板模块
├── task-queue/                # 任务队列模块
├── api-client/                # API客户端模块
├── tenant-rbac/               # 租户权限模块
├── db/                        # 数据库模块
└── common/                    # 公共模块
```