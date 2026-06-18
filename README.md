# ccclubs AI RPA - 商用级 AI 浏览器系统

基于 Chromium 内核的商用 SaaS 级 AI 浏览器服务，提供强隔离沙箱会话、双通路操控体系、私有化本地 AI Agent、双部署兼容等完整能力。

## 项目架构

```
┌─────────────────────────────────────────────────────┐
│  层5：网关 & 多租户业务管理层 (API / Web 后台)       │
├─────────────────────────────────────────────────────┤
│  层4：AI 智能驱动微服务层 (LLM / YOLO / OCR)        │
├─────────────────────────────────────────────────────┤
│  层3：双通路控制层 (Playwright / Chrome V3 扩展)    │
├─────────────────────────────────────────────────────┤
│  层2：Chromium 沙箱会话集群层 (会话调度 / 隔离)     │
├─────────────────────────────────────────────────────┤
│  层1：基础设施隔离层 (K8s / Linux Namespace)        │
└─────────────────────────────────────────────────────┘
```

## 目录结构

| 目录 | 说明 |
|------|------|
| `backend/` | NestJS 后端服务（会话、租户、浏览器、AI、监控） |
| `backend-api/` | 竞争对标 API 实现 |
| `desktop-browser/` | 桌面客户端浏览器（Electron + Chrome） |
| `chromium-sandbox/` | Chromium 沙箱镜像（Dockerfile） |
| `extension/` | Chrome V3 扩展（ServiceWorker / ContentScript / SidePanel） |
| `frontend/` | Vue3 多租户管理后台 |
| `frontend-web/` | React 前端 Web 界面 |
| `devops/` | Docker、K8s 部署脚本、配置 |
| `docs/` | API、部署、运维文档 |
| `project.md` | SRS 软件需求规格说明书 |

## 核心能力

- **强隔离沙箱会话**：容器/进程级隔离，多租户 Cookie、存储、IP、指纹完全隔离
- **双通路操控**：Playwright 自动化脚本 + Chrome V3 扩展可视化人工操作
- **私有化 AI Agent**：自然语言指令自动操作页面，OCR 验证码识别
- **双部署兼容**：单机进程沙箱 + K8s 容器分布式集群
- **商用完整能力**：多租户、四级 RBAC、会话并发配额、审计日志、监控告警

## 技术栈

| 领域 | 技术 |
|------|------|
| 容器编排 | Docker、Kubernetes |
| 浏览器内核 | Chromium、Playwright Core、CDP 协议 |
| 后端服务 | NestJS (NodeJS)、TypeScript |
| 前端 | Vue 3 + TypeScript、React |
| AI 推理 | Ollama、YOLOv8、PaddleOCR |
| 数据存储 | PostgreSQL、Redis |
| 监控运维 | Prometheus、Grafana |

## 快速开始

### 后端服务

```bash
cd backend
npm install
npm run build
npm run start:prod
```

### 前端管理后台

```bash
cd frontend
npm install
npm run dev
```

### 桌面浏览器客户端

```bash
cd desktop-browser
npm run build:app
# 产物位于 release/mac-arm64/AI浏览器.app
```

## 核心接口规范

全部对外接口根路径：`/api/v1`，强制 HTTPS，统一 Bearer Token 鉴权。

| 接口 | 方法 | 功能 |
|------|------|------|
| `/session/create` | POST | 创建隔离沙箱会话 |
| `/session/{sessionId}/close` | POST | 销毁指定会话 |
| `/session/{sessionId}/script/run` | POST | 执行 Playwright 自动化脚本 |
| `/session/{sessionId}/ai/command` | POST | 下发自然语言 AI 浏览指令 |
| `/session/{sessionId}/screenshot` | GET | 获取页面截图 |
| `/ws/session/{sessionId}` | WebSocket | 实时推送会话状态与日志 |

详见 `docs/api.md`。

## 部署

- **开发测试**：使用 `devops/scripts/start-dev.sh` 单机启动
- **生产环境**：使用 `devops/docker/` + `devops/k8s/` 部署至 K8s 集群

详见 `docs/deployment.md`、`docs/ops-guide.md`。

## 安全与合规

- 全链路 TLS 加密通信
- 会话快照 AES-256-CBC 加密存储，租户独立密钥
- 全链路操作审计日志，强制留存 90 天
- 浏览器指纹随机化 + CDP 自动化特征抹平
- 多租户数据物理隔离，租户无法跨会话访问

## 许可证

商用软件，内部受限使用。
