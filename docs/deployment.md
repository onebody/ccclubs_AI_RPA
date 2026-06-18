# AI Browser 部署手册

## 环境要求

### 硬件要求
- **CPU**: 至少 4 核
- **内存**: 至少 8GB
- **存储**: 至少 50GB 可用空间

### 软件要求
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+
- **PostgreSQL**: 16+
- **Redis**: 7+

## 快速开始

### 方式一：Docker Compose（推荐用于开发/测试）

```bash
cd devops/docker
docker-compose up -d
```

### 方式二：手动部署

#### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install

# 扩展
cd extension
npm install
```

#### 2. 配置环境变量

创建 `backend/.env` 文件：

```env
DATABASE_URL="postgresql://admin:password@localhost:5432/ai_browser"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_jwt_secret_key"
PORT=3000
SESSION_DIR="./sessions"
CHROMIUM_PATH="/usr/bin/chromium-browser"
```

#### 3. 数据库初始化

```bash
cd backend
npx prisma migrate dev
npx ts-node scripts/seed.ts
```

#### 4. 启动服务

```bash
# 后端
cd backend
npm run dev

# 前端（另一个终端）
cd frontend
npm run dev

# 扩展（另一个终端）
cd extension
npm run dev
```

## Kubernetes 部署

### 前提条件
- Kubernetes 集群（1.21+）
- Helm 3.0+
- Ingress Controller（nginx-ingress）

### 部署步骤

```bash
# 创建命名空间
kubectl create namespace ai-browser

# 切换命名空间
kubectl config set-context --current --namespace=ai-browser

# 部署所有组件
cd devops/scripts
./deploy-k8s.sh
```

### 验证部署

```bash
# 查看 Pod 状态
kubectl get pods

# 查看服务状态
kubectl get services

# 查看 Ingress
kubectl get ingress
```

### 访问服务

- **前端**: `http://ai-browser.local`
- **后端 API**: `http://ai-browser.local/api`
- **Prometheus**: `http://ai-browser.local:30090`
- **Grafana**: `http://ai-browser.local:30091`

## Chrome 扩展安装

### 开发模式安装

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `extension/dist` 目录

### 打包发布

```bash
cd extension
npm run build
```

生成的 `.crx` 文件位于 `extension/dist` 目录。

## 配置说明

### 后端配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | 数据库连接字符串 | - |
| REDIS_URL | Redis 连接字符串 | - |
| JWT_SECRET | JWT 密钥 | - |
| PORT | 服务端口 | 3000 |
| SESSION_DIR | 会话数据目录 | ./sessions |
| CHROMIUM_PATH | Chromium 路径 | 自动检测 |
| MAX_SESSIONS | 最大会话数 | 100 |

### 前端配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| VITE_API_URL | 后端 API 地址 | http://localhost:3000/api |
| VITE_WS_URL | WebSocket 地址 | http://localhost:3000 |

## 常见问题

### Q: 无法连接数据库？
A: 检查 PostgreSQL 是否启动，确认连接字符串中的用户名、密码、端口正确。

### Q: Chrome 扩展无法加载？
A: 确保已开启开发者模式，且选择的是 `dist` 目录而非源码目录。

### Q: 会话创建失败？
A: 检查 Chromium 是否已安装，确认 `CHROMIUM_PATH` 配置正确。

### Q: K8s Pod 启动失败？
A: 查看 Pod 日志：`kubectl logs <pod-name>`，检查资源限制和环境变量配置。

## 日志管理

### Docker Compose 日志

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Kubernetes 日志

```bash
kubectl logs -l app=ai-browser-backend -f
kubectl logs -l app=ai-browser-frontend -f
```

## 备份与恢复

### 数据库备份

```bash
# Docker Compose
docker-compose exec postgres pg_dump -U admin ai_browser > backup.sql

# Kubernetes
kubectl exec <postgres-pod> -- pg_dump -U admin ai_browser > backup.sql
```

### 数据库恢复

```bash
# Docker Compose
cat backup.sql | docker-compose exec -T postgres psql -U admin ai_browser

# Kubernetes
cat backup.sql | kubectl exec -i <postgres-pod> -- psql -U admin ai_browser
```