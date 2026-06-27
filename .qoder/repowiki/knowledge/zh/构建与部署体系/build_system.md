## 1. 系统概览
该项目采用**混合架构**，包含一个基于 Tauri v2 的桌面客户端（CCC-BrowserV4）和一个基于 FastAPI 的后端服务（CCC_RPA_API）。构建体系主要依赖各语言生态的标准工具链：
- **桌面端**：Rust (Cargo) + TypeScript/Node.js (npm/Vite) + Tauri CLI。
- **后端**：Python (pip/requirements.txt)。
- **基础设施**：Docker Compose 用于本地开发环境的数据库（MySQL）编排。

目前仓库中**缺失**统一的自动化构建脚本（如 Makefile）、CI/CD 配置文件（如 GitHub Actions/GitLab CI）以及生产环境的容器化定义（Dockerfile）。

## 2. 核心构建流程

### 2.1 桌面客户端 (CCC-BrowserV4)
采用 Tauri 标准的“前端预构建 + Rust 打包”流程：
1. **前端构建**：通过 `vite build` 将 Vue3 应用编译为静态资源至 `frontend/dist`。
2. **Rust 编译**：`tauri-build` 调用 Rust 编译器编译原生桥接层。
3. **打包**：Tauri CLI 根据 `tauri.conf.json` 将前端资源与 Rust 二进制文件打包为平台特定的安装包（.exe, .app, .deb 等）。

**关键配置：**
- `src-tauri/tauri.conf.json`：定义了构建钩子（`beforeBuildCommand` 自动触发前端构建）及产物路径。
- `frontend/vite.config.ts`：配置了开发代理（Proxy），将 `/api` 和 `/ws` 请求转发至本地 `8001` 端口（后端服务）。

### 2.2 后端服务 (CCC_RPA_API & CCC-BrowserV4/backend)
采用传统的 Python 依赖管理方式：
- **依赖声明**：使用 `requirements.txt` 锁定版本。
- **启动方式**：通过 `uvicorn app.main:app` 直接运行。
- **环境配置**：依赖 `.env` 文件加载数据库连接等敏感信息。

## 3. 基础设施与数据持久化
- **数据库编排**：`CCC-BrowserV4/docker-compose.yml` 定义了 MySQL 8.4 服务，用于本地开发。它暴露了 `3306` 端口并挂载了 `mysql_data` 卷以确保持久化。
- **缺失的生产级构建**：`project.md` 中提到了 Chromium 镜像和 K8s 编排的需求，但当前代码库中并未包含对应的 `Dockerfile` 或 Kubernetes YAML 文件。

## 4. 开发者规范与建议
1. **环境初始化**：
   - 前端：`npm install`
   - 后端：`python -m venv venv && pip install -r requirements.txt`
   - 数据库：在项目根目录执行 `docker compose up -d`。
2. **开发启动**：
   - 建议先启动后端服务（监听 8001 端口以匹配前端代理配置）。
   - 在 `CCC-BrowserV4/frontend` 目录下执行 `npm run tauri dev` 即可同时启动前端热更新与 Rust 后端。
3. **版本管理**：
   - 桌面端版本号在 `Cargo.toml`、`package.json` 和 `tauri.conf.json` 中需保持同步（当前均为 `1.0.0`）。
4. **改进方向**：
   - 建议增加 `Makefile` 统一封装复杂的启动和构建命令。
   - 补充后端服务的 `Dockerfile` 以实现生产环境的一致性部署。