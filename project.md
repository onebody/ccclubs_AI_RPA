# CCC RPA 自动化平台 — 项目技术文档

> 版本：1.0 | 最后更新：2026-06

---

## 1. 项目概述

CCC RPA 自动化平台是一套专注于**政府交通管理网站**（122.gov.cn）的 RPA 自动化操作系统。平台通过 Playwright 浏览器引擎模拟真人操作，实现从自动登录、扫码认证、选择单位到页面保活与业务自动处理的全流程自动化。

### 1.1 三大子系统

| 子系统 | 路径 | 定位 | 核心技术 |
|--------|------|------|----------|
| **CCC_RPA_API** | `CCC_RPA_API/` | 核心后端（自动化执行引擎 + REST API + WebSocket） | Python FastAPI + Playwright |
| **CCC-BrowserV4/frontend** | `CCC-BrowserV4/frontend/` | 桌面客户端前端 | Vue3 + Pinia + Element Plus + TypeScript |
| **CCC-BrowserV4/backend** | `CCC-BrowserV4/backend/` | 辅助后端（定位待明确） | Python FastAPI |
| **CCC-BrowserV4/src-tauri** | `CCC-BrowserV4/src-tauri/` | Tauri 桌面壳层 | Rust + Tauri 2 |

### 1.2 核心能力

```
自动登录 → 扫码认证 → 选择单位 → 页面保活 → 自动处理业务
```

- **自动登录**：导航到 122.gov.cn 单位用户登录页，截取二维码推送至前端
- **扫码认证**：用户使用交管 12123 APP 扫码，前端通知后端继续流程
- **选择单位**：抓取单位列表推送至前端，用户选择后自动切换单位
- **页面保活**：在当前业务页面执行轻量级随机操作（滚动、鼠标移动、Tab），维持会话不过期
- **业务自动处理**：检测待处理业务（备案查询、违章查询等），自动执行子任务

---

## 2. 系统架构

### 2.1 整体数据流

```
┌─────────────────────────────────────────────────────────────────┐
│  Tauri 桌面客户端（CCC-BrowserV4）                                │
│  ┌──────────────────┐   ┌──────────────────────────────────────┐ │
│  │  Rust 层          │   │  Vue3 前端                           │ │
│  │  设备标识/登录回调 │◄─►│  页面/组件/Store/API                 │ │
│  └──────────────────┘   └────────────┬─────────────────────────┘ │
└──────────────────────────────────────┼──────────────────────────┘
                                       │ HTTP REST + WebSocket
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  CCC_RPA_API（Python FastAPI 后端，端口 8000）                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ API 路由  │─►│ 服务层    │─►│ 浏览器层   │─►│ Playwright    │  │
│  │ REST+WS  │  │ Executor │  │ Session   │  │ Chromium 引擎 │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────────┘  │
│                                         │                        │
│  ┌──────────┐  ┌──────────┐            ▼                        │
│  │ WebSocket │  │ 数据模型  │     122.gov.cn                     │
│  │ 广播管理  │  │ SQLAlchemy│                                    │
│  └──────────┘  └──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                          ┌──────────────────────┐
                          │  MySQL 8.4（Docker）  │
                          │  ccc_browser 数据库   │
                          └──────────────────────┘
```

### 2.2 五层架构说明

#### 第 1 层：基础设施层

- **MySQL 8.4**：Docker 容器化部署，存储用户、任务、执行日志等业务数据
- **Playwright 浏览器引擎**：Chromium headful 模式，配合 `playwright-stealth` 反检测

#### 第 2 层：浏览器自动化层

- **Playwright Sync API**：所有浏览器操作在专用工作线程中执行，避免与 asyncio 事件循环冲突
- **按省份隔离会话**：`BrowserSessionManager` 为每个省份维护独立的 `BrowserContext`，持久化 `storage_state` 到 `data/browser_states/` 目录
- **ThreadPoolExecutor**：3 个工作线程（`task-exec`）并行执行任务，另有 3 个等待线程（`wait-block`）处理用户交互阻塞
- **反检测**：`HumanBehavior` 模拟真人操作（随机延迟、随机点击位置、随机打字速度、随机滚动）

#### 第 3 层：API 与实时通信层

- **FastAPI REST**：提供认证、任务 CRUD、租户/设备管理等接口
- **WebSocket 广播**：`ConnectionManager` 管理所有客户端连接，后端工作线程通过 `asyncio.run_coroutine_threadsafe` 安全地将消息投递到主事件循环进行广播

#### 第 4 层：前端交互层

- **Vue3 + Composition API**：响应式 UI，所有页面使用 `<script setup>` 语法
- **Pinia 状态管理**：`auth`（认证）、`task`（任务列表 + WS 消息分发）、`execution`（执行状态机 + 演示模式）、`device`（设备标识）
- **Element Plus**：UI 组件库
- **WebSocket 自动重连**：3 秒间隔自动重连，消息分发到 task store 和 execution store

#### 第 5 层：桌面集成层

- **Tauri 2 + Rust**：提供桌面应用壳层
- **设备标识持久化**：通过 `tauri-plugin-store` 将 `device_id` 存储到本地 `device.json`
- **登录回调服务器**：本地启动 HTTP 服务器（随机端口），接收外部浏览器登录成功回调，通过 Tauri event 通知前端

---

## 3. 技术栈清单

### 3.1 Python 后端（CCC_RPA_API）

| 依赖 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.0 | Web 框架 |
| uvicorn[standard] | 0.30.6 | ASGI 服务器 |
| sqlalchemy | 2.0.51 | ORM |
| pymysql | 1.1.1 | MySQL 驱动 |
| cryptography | 43.0.1 | 加密支持 |
| pydantic-settings | 2.5.2 | 配置管理 |
| python-dotenv | 1.0.1 | 环境变量加载 |
| playwright | 1.60.0 | 浏览器自动化 |
| playwright-stealth | 1.0.6 | 反自动化检测 |

### 3.2 前端（CCC-BrowserV4/frontend）

| 依赖 | 版本 | 用途 |
|------|------|------|
| vue | ^3.5.0 | UI 框架 |
| vue-router | ^4.5.0 | 路由管理 |
| pinia | ^2.3.0 | 状态管理 |
| element-plus | ^2.9.0 | UI 组件库 |
| @element-plus/icons-vue | ^2.3.0 | 图标库 |
| axios | ^1.18.1 | HTTP 客户端 |
| @tauri-apps/api | ^2.0.0 | Tauri JS API |
| vite | ^5.4.0 | 构建工具 |
| typescript | ~5.6.0 | 类型系统 |
| vue-tsc | ^2.2.0 | Vue TypeScript 检查 |

### 3.3 Tauri / Rust（CCC-BrowserV4/src-tauri）

| 依赖 | 版本 | 用途 |
|------|------|------|
| tauri | 2 | 桌面应用框架 |
| tauri-plugin-shell | 2 | Shell 命令插件 |
| tauri-plugin-store | 2 | 本地键值存储插件 |
| tauri-plugin-opener | 2 | 外部链接打开插件 |
| serde | 1 (derive) | 序列化/反序列化 |
| serde_json | 1 | JSON 处理 |
| uuid | 1 (v4) | UUID 生成 |
| rand | 0.8 | 随机数生成 |
| tokio | 1 (full) | 异步运行时 |
| tiny_http | 0.12 | 轻量 HTTP 服务器（登录回调） |
| log | 0.4 | 日志 |
| env_logger | 0.11 | 环境变量日志 |

### 3.4 基础设施

| 组件 | 版本 | 说明 |
|------|------|------|
| MySQL | 8.4 | Docker 容器，字符集 utf8mb4 |
| Docker Compose | 3.8 | 容器编排 |

---

## 4. 项目结构

```
ccclubs_AI_RPA/
├── CCC_RPA_API/                      # 核心后端（Python FastAPI）
│   ├── app/
│   │   ├── api/                      # API 路由层
│   │   │   ├── auth.py               # 认证接口（登录/登出/验证）
│   │   │   ├── tasks.py              # 任务 CRUD + 执行控制
│   │   │   ├── tenants.py            # 租户列表（Mock）
│   │   │   └── devices.py            # 设备列表（Mock）
│   │   ├── browser/                  # 浏览器自动化层
│   │   │   ├── session_manager.py    # 按省份隔离会话管理
│   │   │   ├── site_automation.py    # 122.gov.cn 全站自动化
│   │   │   ├── human_behavior.py     # 反检测真人行为模拟
│   │   │   └── waiter.py             # 信号等待（暂停/恢复/取消）
│   │   ├── models/                   # SQLAlchemy 数据模型
│   │   │   ├── base.py               # 基类（created_at, updated_at）
│   │   │   ├── user.py               # 用户模型
│   │   │   ├── task.py               # 任务模型
│   │   │   └── execution_log.py      # 执行日志模型
│   │   ├── schemas/                  # Pydantic 请求/响应模型
│   │   │   ├── auth.py               # 认证相关
│   │   │   ├── task.py               # 任务 CRUD
│   │   │   ├── execution.py          # 执行控制
│   │   │   └── execution_log.py      # 执行日志
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── auth.py               # 认证服务
│   │   │   ├── task.py               # 任务服务
│   │   │   └── executor.py           # 核心执行引擎
│   │   ├── ws/                       # WebSocket
│   │   │   └── manager.py            # 连接管理与广播
│   │   ├── config.py                 # 配置（数据库连接）
│   │   ├── database.py               # 数据库引擎与会话
│   │   └── main.py                   # FastAPI 入口
│   ├── data/
│   │   └── browser_states/           # 浏览器状态持久化（按省份）
│   │       ├── 广东_state.json
│   │       └── 浙江_state.json
│   ├── .env                          # 环境变量
│   └── requirements.txt              # Python 依赖
│
├── CCC-BrowserV4/                    # 桌面客户端
│   ├── frontend/                     # Vue3 前端
│   │   ├── src/
│   │   │   ├── api/                  # API 调用层
│   │   │   │   ├── request.ts        # Axios 实例（baseURL=/api）
│   │   │   │   ├── auth.ts           # 认证 API + 登录流程
│   │   │   │   ├── tasks.ts          # 任务 CRUD API
│   │   │   │   ├── execution.ts      # 执行控制 API
│   │   │   │   ├── device.ts         # 租户/设备 API
│   │   │   │   └── ws.ts             # WebSocket 客户端（自动重连）
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppLayout.vue # 主布局（侧边栏+内容区）
│   │   │   │   │   ├── SideMenu.vue  # 侧边导航菜单
│   │   │   │   │   └── StatusBar.vue # 底部状态栏
│   │   │   │   └── ExecutionPanel.vue# 执行面板（二维码/单位选择/进度）
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.vue     # 登录页
│   │   │   │   ├── HomePage.vue      # 首页/仪表盘
│   │   │   │   ├── TaskPage.vue      # 任务列表页
│   │   │   │   └── TaskEditPage.vue  # 任务编辑/创建页
│   │   │   ├── stores/
│   │   │   │   ├── auth.ts           # 认证状态（登录/登出/持久化）
│   │   │   │   ├── task.ts           # 任务列表 + WS 消息分发
│   │   │   │   ├── execution.ts      # 执行状态机 + 演示模式
│   │   │   │   └── device.ts         # 设备标识
│   │   │   ├── types/
│   │   │   │   ├── index.ts          # 通用类型定义
│   │   │   │   ├── execution.ts      # 执行相关类型
│   │   │   │   └── execution-log.ts  # 执行日志类型
│   │   │   ├── utils/
│   │   │   │   └── tauri-bridge.ts   # Tauri 命令封装
│   │   │   ├── router/
│   │   │   │   └── index.ts          # 路由配置 + 守卫
│   │   │   ├── App.vue               # 根组件
│   │   │   └── main.ts               # 入口文件
│   │   ├── vite.config.ts            # Vite 配置（代理/构建）
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── src-tauri/                    # Tauri Rust 层
│   │   ├── src/
│   │   │   ├── main.rs               # Tauri 入口
│   │   │   ├── commands.rs           # 5 个 Tauri 命令
│   │   │   └── device.rs             # 设备标识持久化
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   │
│   ├── backend/                      # 辅助后端（定位待明确）
│   │   ├── app/
│   │   │   ├── api/health.py         # 健康检查
│   │   │   ├── config.py             # 配置（支持 MySQL/SQLite）
│   │   │   ├── database.py           # 数据库引擎
│   │   │   └── models/base.py        # 模型基类
│   │   └── requirements.txt
│   │
│   └── docker-compose.yml            # MySQL 8.4 容器
│
└── project.md                        # 本文档
```

---

## 5. 模块说明

### 5.1 后端模块（CCC_RPA_API）

#### API 层

| 模块 | 路由前缀 | 说明 |
|------|----------|------|
| `auth.py` | `/api/auth` | 登录（POST /login）、登出（POST /logout）、验证（GET /verify） |
| `tasks.py` | `/api/tasks` | 任务 CRUD、执行控制、日志查询、扫码完成、选择单位、取消执行 |
| `tenants.py` | `/api/tenants` | 租户列表（Mock 数据：广东/浙江/江苏分公司） |
| `devices.py` | `/api/devices` | 设备列表（Mock 数据：本地设备-A/B） |

#### 服务层

| 模块 | 说明 |
|------|------|
| `executor.py` | **核心执行引擎**。`ThreadPoolExecutor(max_workers=3)` 提交任务执行。包含完整的任务生命周期：浏览器初始化 → 登录检查 → 扫码 → 选择单位 → 保活循环 → 业务处理 |
| `auth.py` | 认证服务：基于 client_id 的 upsert 登录，登出置 `is_active=False`，验证接口 |
| `task.py` | 任务 CRUD 服务：分页查询（支持关键词/状态过滤）、创建/更新/软删除、触发异步执行、日志查询 |

#### 浏览器层

| 模块 | 说明 |
|------|------|
| `session_manager.py` | **按省份隔离会话管理**。专用 Playwright 工作线程（`playwright-worker`），通过任务队列串行执行所有 Playwright 操作。支持 `storage_state` 持久化、浏览器崩溃恢复 |
| `site_automation.py` | **122.gov.cn 全站自动化**。覆盖 31 个省份的 URL 映射，登录状态检测、导航到登录页、二维码截取、单位列表抓取（多级选择器降级策略）、单位选择、页面保活、业务检测与执行 |
| `human_behavior.py` | **反检测真人行为模拟**。随机延迟、模拟点击（带随机偏移）、模拟打字（逐字符随机延迟）、随机滚动、阅读等待 |
| `waiter.py` | **信号等待机制**。基于 `threading.Event` 实现任务流程的暂停/恢复/取消，支持超时、非阻塞检查取消信号 |

#### WebSocket 层

| 模块 | 说明 |
|------|------|
| `manager.py` | `ConnectionManager` 管理所有 WebSocket 连接，支持 `broadcast` 广播 JSON 消息，自动清理断开的连接 |

#### 数据层

| 模块 | 说明 |
|------|------|
| `models/` | SQLAlchemy ORM 模型：`User`、`Task`、`TaskExecutionLog` |
| `schemas/` | Pydantic 请求/响应模型，API 响应使用 camelCase 命名 |

### 5.2 前端模块（CCC-BrowserV4/frontend）

#### 页面

| 页面 | 路由 | 说明 |
|------|------|------|
| `LoginPage.vue` | `/login` | 登录页，Tauri 环境下打开外部浏览器完成 OAuth 登录 |
| `HomePage.vue` | `/` | 首页/仪表盘 |
| `TaskPage.vue` | `/tasks` | 任务列表，支持搜索/筛选/执行/查看日志 |
| `TaskEditPage.vue` | `/tasks/add`, `/tasks/edit/:id` | 任务创建/编辑，含租户/设备/省份选择 |

#### 组件

| 组件 | 说明 |
|------|------|
| `AppLayout.vue` | 主布局：侧边栏 + 顶部内容区 |
| `SideMenu.vue` | 侧边导航菜单 |
| `StatusBar.vue` | 底部状态栏 |
| `ExecutionPanel.vue` | 执行面板：显示二维码、单位列表、执行进度、错误信息 |

#### Store（Pinia）

| Store | 说明 |
|-------|------|
| `auth.ts` | 认证状态管理：登录/登出/持久化到 localStorage/开发模式虚拟登录 |
| `task.ts` | 任务列表管理 + WebSocket 消息分发中枢：接收 WS 消息，更新任务状态，转发给 execution store |
| `execution.ts` | **执行状态机**：idle → checking_login → qr_scanning → waiting_company → executing → keeping_alive → completed/failed/cancelled。支持演示模式（模拟完整流程） |
| `device.ts` | 设备标识管理：通过 Tauri Bridge 获取持久化 device_id |

#### API 层

| 模块 | 说明 |
|------|------|
| `request.ts` | Axios 实例，`baseURL=/api`，响应拦截器自动解包 |
| `auth.ts` | 认证 API + `performLogin` 完整登录流程（获取设备ID → 生成clientId/token → 启动回调服务器 → 打开外部浏览器） |
| `tasks.ts` | 任务 CRUD + 执行触发 + 日志查询 |
| `execution.ts` | 执行控制：扫码完成、选择单位、取消执行 |
| `device.ts` | 租户列表 + 设备列表 |
| `ws.ts` | `TaskWebSocket` 单例，自动重连（3s 间隔），消息处理器注册/注销 |

### 5.3 Tauri 层

#### commands.rs — 5 个 Tauri 命令

| 命令 | 说明 |
|------|------|
| `get_device_id` | 获取持久化设备唯一标识 |
| `generate_client_id` | 生成 UUID v4 客户端标识（每次登录会话唯一） |
| `generate_token` | 生成 32 位 hex 随机 token |
| `open_login_browser` | 通过系统默认浏览器打开指定 URL |
| `start_login_callback_server` | 启动本地 HTTP 回调服务器（随机端口），接收登录成功回调，通过 Tauri event 通知前端 |

#### device.rs — 设备标识持久化

- 使用 `tauri-plugin-store` 将 `device_id`（UUID v4）存储到 `device.json`
- 应用启动时自动初始化（`init_device_store`），若不存在则生成新的 device_id

---

## 6. API 接口规范

### 6.1 认证接口

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/auth/login` | 登录 | `{client_id, token, device_id, username?}` | `{userId, username, token}` |
| POST | `/api/auth/logout` | 登出 | `{userId}` | `{message: "登出成功"}` |
| GET | `/api/auth/verify?userId=xxx` | 验证登录状态 | — | `{valid, userId?, username?}` |

### 6.2 任务接口

| 方法 | 路径 | 说明 | 参数 | 响应 |
|------|------|------|------|------|
| GET | `/api/tasks` | 任务列表 | `keyword?, status?, page=1, page_size=20` | `{items[], total, page, page_size}` |
| POST | `/api/tasks` | 创建任务 | `{name, tenant_id?, device_id?, customer_name?, handler_account?, sub_tasks?, province?, remark?}` | `TaskResponse` |
| GET | `/api/tasks/{id}` | 获取任务 | — | `TaskResponse` |
| PUT | `/api/tasks/{id}` | 更新任务 | 部分更新字段 | `TaskResponse` |
| DELETE | `/api/tasks/{id}` | 删除任务（软删除） | — | `{message: "删除成功"}` |
| POST | `/api/tasks/{id}/execute` | 触发执行 | — | `TaskResponse`（status=running） |
| GET | `/api/tasks/{id}/logs` | 执行日志 | `page=1, page_size=20` | `{items[], total}` |
| POST | `/api/tasks/{id}/scan-complete` | 扫码完成通知 | — | `{success: true}` |
| POST | `/api/tasks/{id}/select-company` | 选择单位通知 | `{company_id, company_name}` | `{success: true}` |
| POST | `/api/tasks/{id}/cancel-execution` | 取消执行 | — | `{success: true}` |

### 6.3 租户与设备接口

| 方法 | 路径 | 说明 | 响应 |
|------|------|------|------|
| GET | `/api/tenants` | 租户列表（Mock） | `[{id, name}]` |
| GET | `/api/devices` | 设备列表（Mock） | `[{id, name}]` |

### 6.4 系统接口

| 方法 | 路径 | 说明 | 响应 |
|------|------|------|------|
| GET | `/health` | 健康检查 | `{status: "ok", service: "ccc-rpa-api"}` |

### 6.5 WebSocket

**连接地址**：`ws://host/ws`

**消息格式**：`{type: string, data: object}`

| 消息类型 | 方向 | 说明 | data 字段 |
|----------|------|------|-----------|
| `execution_progress` | 后端→前端 | 执行进度更新 | `{taskId, step, message}` |
| `qr_code` | 后端→前端 | 推送二维码 | `{taskId, qrImage}` |
| `company_list` | 后端→前端 | 推送单位列表 | `{taskId, companies[]}` |
| `login_result` | 后端→前端 | 登录结果 | `{taskId, success, message}` |
| `execution_error` | 后端→前端 | 执行错误 | `{taskId, message}` |
| `task_status_update` | 后端→前端 | 任务状态变更 | `{taskId, status, lastResult, lastExecutedAt}` |

---

## 7. 数据模型

### 7.1 User（users 表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | int | PK, AUTO_INCREMENT | 主键 |
| user_id | varchar(64) | UNIQUE, INDEX | 用户标识 |
| username | varchar(128) | NOT NULL | 用户名 |
| client_id | varchar(64) | NULLABLE | 客户端标识 |
| token | varchar(128) | NULLABLE | 登录 token |
| device_id | varchar(64) | NULLABLE | 设备标识 |
| is_active | boolean | DEFAULT true | 是否活跃 |
| created_at | datetime | server_default=now() | 创建时间 |
| updated_at | datetime | onupdate=now() | 更新时间 |

### 7.2 Task（tasks 表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | int | PK, AUTO_INCREMENT | 主键 |
| name | varchar(256) | NOT NULL, INDEX | 任务名称 |
| status | varchar(32) | DEFAULT "pending", INDEX | 状态：pending/running/completed/failed |
| tenant_id | varchar(64) | NULLABLE | 租户 ID |
| device_id | varchar(64) | NULLABLE | 设备 ID |
| customer_name | varchar(128) | NULLABLE | 客户名称 |
| handler_account | varchar(64) | NULLABLE | 处理账号 |
| sub_tasks | text | NULLABLE | 子任务列表（JSON 数组字符串） |
| province | varchar(64) | NULLABLE | 省份 |
| last_executed_at | datetime | NULLABLE | 上次执行时间 |
| next_executed_at | datetime | NULLABLE | 下次执行时间 |
| last_result | varchar(32) | NULLABLE | 上次结果：success/failed/None |
| remark | text | NULLABLE | 备注 |
| deleted | boolean | DEFAULT false, INDEX | 软删除标记 |
| created_at | datetime | server_default=now() | 创建时间 |
| updated_at | datetime | onupdate=now() | 更新时间 |

### 7.3 TaskExecutionLog（task_execution_log 表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | int | PK, AUTO_INCREMENT | 主键 |
| task_id | int | NOT NULL, INDEX | 关联任务 ID |
| task_name | varchar(256) | NOT NULL | 任务名称（冗余） |
| started_at | datetime | NOT NULL | 开始时间 |
| finished_at | datetime | NULLABLE | 结束时间 |
| status | varchar(32) | DEFAULT "running" | 状态：running/completed/failed |
| result_message | text | NULLABLE | 结果消息 |
| created_at | datetime | server_default=now() | 创建时间 |
| updated_at | datetime | onupdate=now() | 更新时间 |

---

## 8. 核心业务流程

### 8.1 任务执行完整流程

```
用户点击"执行"
    │
    ▼
POST /api/tasks/{id}/execute
    │  TaskService.execute_task()
    │  设置 task.status = "running"
    │  submit_task_execution(task_id)  → ThreadPoolExecutor 提交
    │
    ▼
[工作线程] _run_task_logic(task_id)
    │
    ├─ 1. 创建执行日志（TaskExecutionLog）
    │
    ├─ 2. 获取浏览器上下文
    │     BrowserSessionManager.get_context(province)
    │     ↳ 若已有该省份 context 则复用，否则从 storage_state 恢复或新建
    │     ↳ 广播: execution_progress {step: "checking_login"}
    │
    ├─ 3. 检查登录状态
    │     SiteAutomation.check_login_status(context, province)
    │     ↳ 检测页面是否出现"退出"或".user-info"元素
    │
    ├─ 4a. [未登录] 扫码登录流程
    │     ├─ 导航到登录页（gab.122.gov.cn/m/login?t=2）
    │     ├─ 截取二维码元素 → base64 图片
    │     ├─ 广播: qr_code {qrImage}
    │     ├─ 广播: execution_progress {step: "qr_scanning"}
    │     ├─ ExecutionWaiter.wait_for(task_id, timeout=120)  ← 阻塞等待
    │     │     ↑ 前端调用 POST /scan-complete 唤醒
    │     ├─ 保存 storage_state
    │     └─ 广播: login_result {success: true}
    │
    ├─ 4b. [已登录] 直接打开省份首页
    │
    ├─ 5. 抓取单位列表
    │     SiteAutomation.scrape_company_list(page)
    │     ↳ 多级选择器降级策略（14 种选择器 → 文本分析）
    │     ├─ 广播: company_list {companies[]}
    │     ├─ 广播: execution_progress {step: "waiting_company"}
    │     ├─ ExecutionWaiter.wait_for(task_id, timeout=300)  ← 阻塞等待
    │     │     ↑ 前端调用 POST /select-company 唤醒
    │     └─ 获取 company_id + company_name
    │
    ├─ 6. 选择单位
    │     SiteAutomation.select_company(page, company_id, company_name)
    │     ↳ 多策略匹配（文本匹配 → data-id → 索引 → JS 回退）
    │     ↳ 点击单位 → 点击登录按钮 → 等待页面跳转
    │
    ├─ 7. 保活循环（最大 8 小时）
    │     while True:
    │       ├─ 检查浏览器存活（崩溃则恢复）
    │       ├─ 检查超时（8 小时）
    │       ├─ 检查取消信号（非阻塞）
    │       ├─ SiteAutomation.keep_alive_on_page(page)
    │       │   ↳ 随机操作：小幅度滚动 / 鼠标移动 / Tab / 阅读等待
    │       │   ↳ 自动关闭意外弹窗
    │       ├─ SiteAutomation.check_pending_business(page)
    │       │   ↳ 检测待处理业务（备案/违章/合同调整等）
    │       ├─ [有业务] SiteAutomation.execute_sub_task(page, type)
    │       └─ 等待保活间隔（30~120s，分段等待响应取消信号）
    │
    └─ 8. 完成任务
          ├─ 关闭页面
          ├─ 更新 task.status = "completed"
          ├─ 更新执行日志
          ├─ 广播: task_status_update {status: "completed"}
          └─ 清理 ExecutionWaiter 资源
```

### 8.2 前端执行状态机

```
idle → checking_login → qr_scanning → waiting_company → executing → keeping_alive → completed
                           │                                      │                │
                           └─→ failed ←────────────────────────────┘                │
                           └─→ cancelled                                            │
                                                                                    └─→ failed
```

---

## 9. 部署与启动

### 9.1 Docker MySQL 启动

```bash
cd CCC-BrowserV4
docker-compose up -d
```

MySQL 配置（docker-compose.yml）：

| 配置项 | 值 |
|--------|-----|
| 镜像 | mysql:8.4 |
| 端口 | 3306:3306 |
| 数据库 | ccc_browser |
| 用户 | ccc_user |
| 密码 | ccc_password_2025 |
| Root 密码 | root_password_2025 |
| 字符集 | utf8mb4 / utf8mb4_unicode_ci |

### 9.2 后端启动

```bash
cd CCC_RPA_API
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 9.3 前端启动（开发模式）

```bash
cd CCC-BrowserV4/frontend
npm install
npm run dev                     # Vite 开发服务器，端口 5173
```

Vite 开发代理配置（`vite.config.ts`）：

| 路径 | 代理目标 | 说明 |
|------|----------|------|
| `/api` | `http://localhost:8000` | REST API |
| `/ws` | `ws://localhost:8000` | WebSocket |

### 9.4 Tauri 开发与构建

```bash
cd CCC-BrowserV4/frontend
npm run tauri dev               # Tauri 开发模式（热更新 + Rust 编译）
npm run tauri build             # 构建生产版本
```

### 9.5 环境变量配置

**CCC_RPA_API/.env**：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=ccc_user
DB_PASSWORD=ccc_password_2025
DB_DATABASE=ccc_browser
```

**CCC-BrowserV4/backend/.env**：

```env
DB_TYPE=mysql                   # 或 sqlite
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=ccc_user
DB_PASSWORD=ccc_password_2025
DB_DATABASE=ccc_browser
```

---

## 10. 开发规范

### 10.1 代码风格

- **Python**：标准 PEP8 风格，使用 SQLAlchemy 2.0 Mapped 声明式模型，Pydantic v2 数据校验
- **前端**：TypeScript + Vue3 Composition API（`<script setup>`），Pinia 状态管理，camelCase API 响应字段

### 10.2 浏览器自动化规范

- **非侵入式保活**：保活操作仅允许小幅度滚动（`scrollBy ±150~200px`）、鼠标随机移动、键盘 Tab、模拟阅读等待
- **禁止行为**：禁止点击业务链接或可交互元素，禁止触发布局重排或页面导航，禁止提交表单
- **弹窗处理**：自动识别并关闭意外弹出的对话框（关闭/取消按钮）
- **等待策略**：统一使用 `domcontentloaded`（政府网站 `networkidle` 容易超时），仅在登录状态检查时使用 `networkidle`
- **反检测**：禁用 `AutomationControlled` 特征，覆写 `navigator.webdriver`，模拟真人鼠标轨迹（带随机步数和偏移）

### 10.3 WebSocket 规范

- **后端广播**：工作线程通过 `asyncio.run_coroutine_threadsafe(ws_manager.broadcast(message), _main_loop)` 安全广播，避免在非 asyncio 线程中直接调用
- **前端重连**：`TaskWebSocket` 单例，断线后 3 秒自动重连，支持手动 `connect()`/`disconnect()`
- **消息分发**：前端 `task store` 作为 WS 消息分发中枢，更新任务状态后转发给 `execution store`

### 10.4 线程模型

```
主线程（asyncio 事件循环）
  └─ FastAPI + WebSocket
  └─ uvicorn

playwright-worker 线程
  └─ Playwright Sync API
  └─ Chromium 进程管理
  └─ 所有浏览器操作通过任务队列串行执行

task-exec 线程池（3 workers）
  └─ 任务执行逻辑（_run_task_logic）
  └─ 通过 BrowserSessionManager.run() 提交浏览器操作到 PW 线程

wait-block 线程池（3 workers）
  └─ ExecutionWaiter.wait_for() 阻塞等待
  └─ 不占用 PW 线程
```

### 10.5 Playwright 线程安全

所有 Playwright 操作必须通过 `BrowserSessionManager.run(fn)` 提交到专用 `playwright-worker` 线程执行，避免多线程冲突。若当前线程已是 PW 工作线程，则直接执行（防死锁）。

---

## 11. 当前状态与待办

### 11.1 已完成

- [x] 完整的任务 CRUD + 异步执行流程
- [x] 122.gov.cn 全站自动化（31 省份 URL 映射）
- [x] 二维码扫码登录 + 单位选择完整流程
- [x] 页面保活循环（非侵入式操作）
- [x] WebSocket 实时消息广播（后端→前端）
- [x] 前端执行状态机 + 演示模式
- [x] Tauri 桌面壳层（设备标识 + 登录回调）
- [x] 浏览器崩溃自动恢复机制
- [x] 任务执行取消功能

### 11.2 待办事项

| 待办 | 说明 |
|------|------|
| 租户/设备 API 持久化 | 当前使用 Mock 数据，待接入数据库 |
| 引入 Alembic | 当前数据库迁移使用 `startup ALTER TABLE`，待引入专业迁移工具 |
| CCC-BrowserV4/backend 定位 | 辅助后端功能定位待明确（已有配置/数据库/健康检查模块） |
| 子任务实际执行逻辑 | `SiteAutomation.execute_sub_task()` 当前为占位实现 |
| 浏览器状态文件 | `data/browser_states/` 已有广东/浙江两省份状态文件 |
| 认证鉴权 | 当前无 Bearer Token 验证，登录状态仅靠 `is_active` 标记 |
| 错误处理增强 | 统一错误码体系、接口限流 |

---

> 本文档基于项目实际代码编写，反映当前实现状态。
# 

# 商用级 AI 浏览器系统软件需求规格说明书（SRS V1\.1）

## 文档说明

1. 适配开发模式：**Trae / Workbuddy / Codebuddy 三套独立全栈开发团队**

2. 核心规则：每套团队内部自建全套子 Agent 完成完整五层架构，三套系统接口、数据、功能规范 100% 统一，可交叉对标、互通替换；无跨团队模块拆分依赖

3. 内部协作建议：每套团队内部分 3 类子 Agent 划分内部任务，仅团队内生效，对外独立交付完整成品

    - 内部子 Agent A：底层沙箱、容器、Chromium、调度底座

    - 内部子 Agent B：API 网关、自动化 SDK、Chrome 扩展、多租户后台、权限任务队列

    - 内部子 Agent C：AI 推理服务、视觉 OCR、数据库、缓存、监控、日志、容错

4. 文档版本：V1\.1 修订版（作废原跨团队模块拆分方案）

# 目录

1. 引言
1\.1 编写目的
1\.2 项目背景与核心目标
1\.3 术语与缩写定义
1\.4 开发团队模式说明（核心修订）
1\.5 项目包含 / 不包含范围

2. 总体系统设计（三套强制统一架构）
2\.1 五层标准分层架构
2\.2 两种标准化部署形态
2\.3 统一用户角色与 RBAC 权限体系
2\.4 全局强制约束规范

3. 分层完整功能需求（FR 统一编号，三套全量实现）
3\.1 基础设施隔离层 \+ Chromium 沙箱集群层（内部子 AgentA 开发）
3\.2 双通路控制层（内部子 AgentB 开发）
3\.3 多租户网关 \& 业务管理层（内部子 AgentB 开发）
3\.4 AI 智能驱动微服务层（内部子 AgentC 开发）
3\.5 数据持久化、监控、运维、容错模块（内部子 AgentC 开发）

4. 统一接口契约（三套系统互通标准，不可修改）
4\.1 对外 RESTful/WS API 网关规范
4\.2 内部 GRPC 微服务通信规范
4\.3 Chrome 扩展与调度服务 WS 消息协议
4\.4 底层 CDP 与第三方对接标准

5. 统一非功能需求（性能 / 安全 / 可靠 / 兼容 / 运维）

6. 统一数据层设计规范
6\.1 PostgreSQL 核心数据表结构
6\.2 Redis 缓存 Key 统一设计
6\.3 数据加密存储标准

7. 统一开发周期、里程碑、交付物清单

8. 统一风险与异常处理规范

9. 统一验收标准（三套共用一套验收用例）

10. 附录
附录 A：系统分层流程图
附录 B：全局技术栈清单
附录 C：K8s 浏览器沙箱 Pod 模板
附录 D：三套团队开发规则总览

---

# 1 引言

## 1\.1 编写目的

本文档为 Trae、Workbuddy、Codebuddy 三套独立开发团队唯一权威基准需求文档。

1. 每套团队独立完成整套商用 AI 浏览器全栈开发，不依赖其余两套团队任何代码、服务、模块；

2. 所有功能、接口、数据结构、隔离规则、加密标准、部署规范全局统一，三套成品可互相替换、交叉调用、横向性能 / 安全对标；

3. 所有功能需求编号 FR\-XX 为强制开发项，不允许删减；需求变更必须同步更新本文档并同步全部三套团队；

4. 作为开发编码、自测、联调、上线验收唯一依据。

## 1\.2 项目背景与核心目标

自研基于 Chromium 内核的商用 SaaS 级 AI 浏览器服务，三套团队目标完全一致：

1. **强隔离沙箱会话**：容器 / 进程级隔离，多租户账号 Cookie、存储、网络 IP、浏览器指纹、插件实例完全隔离，规避网站风控账号关联；

2. **双通路操控体系**：① Playwright 远程脚本自动化批量控制 ② 内置 Chrome V3 扩展可视化人工操作，两种通路双向互通；

3. **私有化本地 AI Agent**：支持自然语言指令自动执行页面操作、表单填写、弹窗自适应、验证码识别、结构化数据抽取；

4. **双部署兼容**：单机进程沙箱（内部测试）、K8s 容器分布式集群（商用生产环境）；

5. **商用完整能力**：多租户隔离、四级 RBAC 权限、会话并发配额、计费统计、全链路操作审计、数据加密存储、集群监控告警、故障自愈。

## 1\.3 术语与缩写定义

|缩写 / 术语|释义|
|---|---|
|SRS|软件需求规格说明书|
|CDP|Chrome DevTools Protocol，Chromium 底层控制协议|
|Sandbox 会话|单租户独立浏览器运行实例（独立 Pod / 独立进程）|
|UserDataDir|Chromium 用户数据目录，存储 Cookie、LocalStorage、缓存，每个会话唯一|
|Manifest V3|Chrome 最新标准扩展规范|
|GRPC|内部微服务高速通信协议|
|Ollama|本地私有化大模型推理底座|
|Namespace/Cgroup|Linux 操作系统资源、网络、挂载隔离组件|
|K8s|Kubernetes，商用容器编排集群|
|FR\-XX|全局统一功能需求编号，全团队跟踪开发|

## 1\.4 开发团队模式说明（核心修订）

### 废弃旧模式

三团队拆分模块、分工开发底层 / 控制层 / AI 层，存在强跨团队依赖，协同成本高。

### 现行强制新模式

1. Trae、Workbuddy、Codebuddy 为**三套对等、完全独立、完整全栈开发团队**；

2. 每套团队内部自行拆分 3 个子 Agent 完成全部五层架构，全程自给自足，不向外部团队请求服务 / 代码；

3. 每套最终产出一套完整可独立部署、商用交付的 AI 浏览器系统，包含底座、调度、自动化、扩展、AI 服务、租户后台、数据库、监控全套组件；

4. 三套仅共享本文档统一标准，开发完成后进行横向功能、性能、安全对标测试；

5. 内部分工仅在单团队内部生效，三套之间无模块协作。

### 单团队内部子 Agent 分工建议（仅内部使用）

1. 内部子 Agent A（底层底座）：Chromium 镜像、Dockerfile、K8s 编排、会话调度、进程 / 容器沙箱隔离、Playwright Core CDP 底层封装、资源管控；

2. 内部子 Agent B（控制层 \& 业务网关）：API 网关、Node/Python 双语言 Playwright SDK、BullMQ 任务队列、Chrome V3 扩展、租户管理后台、RBAC 权限、脚本引擎；

3. 内部子 Agent C（AI \& 数据运维）：Ollama LLM Agent、YOLO 视觉检测、PaddleOCR、PostgreSQL 数据表、Redis 缓存、AES 加密存储、Prometheus/Grafana 监控、ELK 审计日志、异常容错自愈。

## 1\.5 项目包含 / 不包含范围

### 每套系统必须完整开发（全覆盖）

1. 裁剪定制 Chromium 容器镜像，支持 headless 无头、headful 有界面双启动模式；

2. Linux Namespace\+Cgroup 单机进程沙箱、K8s 容器两级强隔离完整逻辑；

3. NodeJS / Python 两套标准化 Playwright SDK \+ REST/WS 远程 API 网关；

4. 完整 Chrome V3 扩展（ServiceWorker 后台、ContentScript 页面注入、SidePanel 可视化操作面板）；

5. 私有化本地 AI 推理服务：LLM 自然语言解析、页面视觉检测、离线 OCR、结构化数据抽取、会话独立向量记忆；

6. K8s 会话 Pod 编排、HPA 弹性扩缩容、会话故障自愈；

7. 多租户 CRUD、租户数据强隔离、独立加密密钥、四级 RBAC 权限、会话并发配额、计费统计；

8. Prometheus 指标采集、Grafana 可视化大盘、ELK 全链路审计日志、异常告警推送；

9. 标准代理池对接接口，单会话独立出站 IP 分配、释放、可用性检测；

10. 会话完整生命周期管理：创建、运行、闲置、超时、崩溃、销毁、资源全量清理。

### 三套统一不开发，仅预留标准对接接口（第三方外部系统）

1. 住宅 / 机房代理 IP 池服务（仅实现调用接口，不开发代理池业务）；

2. 公有云 K8s 集群底层运维、公有云 GPU 推理服务；

3. 第三方支付结算网关（仅输出计费统计数据，无支付下单、扣款逻辑）；

4. 业务专用 RPA 脚本模板库（仅提供通用脚本执行引擎，模板由业务侧自行编写）。

# 2 总体系统设计（三套强制统一架构）

## 2\.1 五层标准分层架构（每套系统分层完全一致）

自上而下分层，不可调整层级顺序：

1. **层 5：网关 \& 多租户业务管理层**：统一 API 入口、租户管理、RBAC 权限、计费统计、Web 管理后台、监控告警面板

2. **层 4：AI 智能驱动微服务层**：LLM 决策引擎、YOLO 视觉识别、PaddleOCR、结构化抽取、会话独立向量记忆库

3. **层 3：双通路控制层**：Playwright 自动化脚本通路、Chrome V3 扩展可视化通路、双向消息桥接、任务调度队列

4. **层 2：Chromium 沙箱会话集群层**：单会话 Pod / 进程实例、独立 UserData、CDP 通信、指纹伪装、代理绑定、会话调度中心

5. **层 1：基础设施隔离层**：K8s 容器编排、Linux Namespace/Cgroup、CPU / 内存资源硬限制、独立临时存储隔离

## 2\.2 两种标准化部署形态

1. **商用生产强制形态：K8s 容器分布式集群**

    - 最小单元：1 Pod = 1 独立浏览器沙箱会话，Pod 内仅运行单个 Chromium 进程；

    - Pod 资源硬限制：CPU 0\.5\\1 核，内存 1\\2Gi；

    - 会话存储使用 EmptyDir，Pod 销毁自动清空所有会话数据；

    - HPA 根据任务队列积压自动扩容会话 Pod，闲置超时自动销毁 Pod、回收代理 IP；

    - NetworkPolicy 隔离 Pod 网络，Pod 间无法互相访问。

2. **内部测试兼容形态：单机进程级沙箱**

    - Linux：unshare 创建独立 mnt/net 命名空间、cgroup v2 限制资源；

    - Windows：Win32 Job 对象管控进程资源、NTFS ACL 隔离 UserData 目录访问权限。

## 2\.3 统一用户角色与 RBAC 权限体系

四级固定角色，权限规则三套完全统一：

1. 超级管理员：集群全局配置、租户创建 / 禁用、全局会话配额、监控告警配置、镜像版本管理；

2. 租户管理员：管理本租户操作员、分配租户会话并发配额、查看租户全量审计日志、导出租户数据；

3. 操作员：创建沙箱会话、执行自动化脚本、下发 AI 自然语言指令、扩展面板手动操作、保存会话快照；

4. 只读用户：仅查看会话状态、任务执行记录、页面数据抽取结果，无创建、执行、导出权限。

## 2\.4 全局强制约束规范

1. 浏览器内核基于 Playwright 配套 Chromium 二进制裁剪，移除 Google 后台上报、自动更新组件，禁止直接使用官方 Chrome；

2. 全部内外通信强制 TLS 加密：对外 HTTPS、内部 GRPC TLS、实时通信 wss；

3. 会话登录快照统一采用 AES\-256\-CBC 加密存储，每个租户分配独立加密密钥；

4. 每个沙箱会话必须绑定唯一独立代理出站 IP，禁止多会话共享网络出口；

5. 会话销毁触发后必须递归清空 UserData、缓存、下载目录、扩展本地存储，无任何账号、Cookie 残留；

6. AI 推理全部私有化本地部署，页面 DOM、截图、验证码数据不出内网，禁止调用第三方公有大模型 API；

7. 禁用 Chromium 全局共享磁盘缓存、预连接池，防止跨会话指纹、数据泄露。

# 3 分层完整功能需求（FR 统一编号，三套全量实现）

## 3\.1 层 1 \+ 层 2 基础设施隔离层 \& Chromium 沙箱集群层（内部子 AgentA 开发）

### FR\-001 定制 Chromium 镜像构建能力

1. 输出可构建 Dockerfile，内置裁剪后 Chromium 二进制，移除多余媒体、上报组件；

2. 镜像支持启动参数切换无头 / 有界面运行模式；

3. 镜像预装扩展加载目录、指纹伪装库、CDP 通信依赖、资源监控采集脚本；

4. 镜像内置监控上报逻辑，进程 CPU / 内存指标推送 Prometheus。

### FR\-002 K8s 会话 Pod 完整编排能力

1. 提供全套 K8s 资源 Yaml：调度中心 Deployment、浏览器沙箱 Pod 模板、AI 服务 Pod、API 网关服务；

2. Pod 模板支持动态注入环境变量：SESSION\_ID、PROXY\_URL、TENANT\_ID、内存 / CPU 上限、最大存活时长；

3. EmptyDir 挂载独立会话存储目录，Pod 删除自动销毁全部会话数据；

4. HPA 弹性扩缩容逻辑，依据等待任务队列长度自动新建 / 销毁浏览器 Pod；

5. Pod 生命周期钩子：启动前初始化隔离目录、销毁前强制终止 Chromium 进程、清理临时文件。

### FR\-003 会话调度与会话生命周期状态机管理

1. 全局调度中心自动分配唯一 sessionId、自增空闲 CDP 调试端口（起始 9222）；

2. 会话标准状态流转：pending 创建中 → running 运行中 → idle 闲置 → timeout 超时销毁 → crash 崩溃销毁；

3. 创建前置校验：租户剩余并发配额、代理 IP 可用性、集群剩余资源；

4. 销毁触发条件：主动调用关闭接口、会话达到最大存活时长、内存超出硬阈值、页面连续崩溃 3 次；

5. 销毁执行逻辑：关闭所有页面标签、终止 Chromium 进程、归还代理 IP 至代理池、释放 CDP 端口、全量删除 UserData 目录；

6. 自愈重试机制：CDP 断开、代理网络超时自动重试 2 次，重试失败直接销毁会话并上报异常。

### FR\-004 全维度会话强隔离（商用核心需求）

每个沙箱会话独立隔离以下全部维度，无任何共享资源：

1. 文件层：独立 UserData、磁盘缓存、下载目录、扩展本地存储目录；

2. 网络层：独立代理 IP、独立网络命名空间、独立 DNS 缓存；

3. 进程层：独立 Chromium 进程 / Pod，单会话崩溃不影响集群其他会话；

4. 浏览器存储：Cookie、LocalStorage、IndexedDB、SessionStorage 完全隔离；

5. 指纹层：随机独立 UA、WebGL、Canvas、Audio、时区、分辨率、字体列表；

6. 插件层：每个会话加载独立 V3 扩展实例，扩展存储互不互通。

### FR\-005 会话资源硬限流管控

1. 单会话可配置硬上限：内存 1\\2Gi、CPU 单核上限、最大打开标签 10 个、会话最长存活 30min\\24h；

2. 进程 / Pod 资源超出阈值标记异常，超时强制销毁会话；

3. 集群全局并发会话上限管控，达到上限拒绝新会话创建请求并返回标准化错误。

### FR\-006 Playwright Core 底层 CDP 轻量化封装

1. 轻量化 Playwright Core，不内置浏览器二进制，仅封装 CDP 长连接通信；

2. 封装基础 CDP 指令：页面打开关闭、截图、DOM 获取、请求拦截、自定义 JS 注入；

3. 支持动态配置会话指纹、代理、存储隔离参数；

4. 捕获进程崩溃、CDP 断连异常，回调上报调度中心状态。

## 3\.2 层 3 双通路控制层（内部子 AgentB 开发）

### FR\-101 Playwright 自动化脚本完整体系

1. 开发 NodeJS、Python 两套标准化 SDK，屏蔽底层 Pod / 进程、端口、CDP 底层细节；

2. SDK 完整能力：页面跳转、点击、输入、滑动、文件上传下载、请求头篡改、网络抓包、截图录屏；

3. BullMQ\+Redis 任务队列引擎：支持同步单次执行、异步批量任务、定时循环任务、任务优先级；

4. 自定义脚本 DSL：在线编辑、版本保存、条件判断、循环、异常捕获、步骤重试；

5. 封装远程 REST/WS 接口，外部业务系统 HTTP 调用执行脚本，WS 实时推送执行日志、页面截图。

### FR\-102 Chrome V3 可视化扩展全套功能

每个沙箱会话独立加载一套扩展，分为三大模块：

1. Service Worker 后台服务：维持 WS 长连接至调度网关，接收 AI / 自动化指令，转发 CDP 操作；上报页面 DOM、截图、交互事件；

2. Content Script 页面注入：识别按钮、输入框、弹窗，高亮可交互元素，提取页面文本供给 AI 解析，拦截广告与第三方追踪脚本；

3. SidePanel 侧边可视化面板：人工手动操作页面、自然语言 AI 指令输入、实时查看会话日志与截图、一键录制人工操作生成 Playwright 脚本、加密导出会话登录快照。

### FR\-103 双通路双向消息桥接互通

1. 人工在扩展面板操作页面 → 自动录制标准化 Playwright 脚本存入租户脚本库；

2. 远程 SDK 调用自动化脚本执行 → 扩展面板实时同步页面变化、执行步骤、截图；

3. AI 指令执行成功 / 失败结果实时推送至扩展面板弹窗展示。

### FR\-104 统一 REST/WS API 网关

1. 标准化 RESTful HTTP 接口全套，统一根路径`/api/v1`；

2. WebSocket 实时通道，推送会话状态、页面截图、操作日志、AI 执行结果；

3. 统一 Bearer Token 鉴权、接口限流、请求参数校验、全局标准化错误码返回；

4. 输出 OpenAPI 3\.0 完整接口文档，对外提供对接参考。

## 3\.3 层 5 多租户网关 \& 业务管理层（内部子 AgentB 开发）

### FR\-201 租户管理模块

1. 租户完整 CRUD：创建、启用 / 禁用、配置租户独立会话并发配额；

2. 租户数据物理隔离：租户仅可查询、操作自身创建的会话、任务、快照、脚本；

3. 每个租户分配独立 AES 加密密钥，仅租户自身密钥可解密会话快照。

### FR\-202 RBAC 四级权限控制系统

精细化权限管控：创建会话、执行 AI 任务、导出数据、编辑脚本、查看审计日志、修改租户配置，不同角色权限严格隔离，禁止越权访问。

### FR\-203 计费与统计模块

1. 统一统计指标：会话运行时长、AI 调用次数、自动化脚本执行次数、租户并发峰值；

2. 按租户维度持久化统计数据，后台生成可视化统计报表；

3. 预留标准化对外数据接口，可对接第三方支付计费系统。

### FR\-204 租户 Web 管理后台

1. 集群全局监控大盘：在线会话总数、资源占用、代理 IP 状态、AI 推理负载；

2. 租户管理页面、会话列表、任务执行记录、审计日志检索；

3. 会话快照管理、自定义脚本模板库、全局告警配置页面。

## 3\.4 层 4 AI 智能驱动微服务层（内部子 AgentC 开发）

### FR\-301 Ollama LLM Agent GRPC 推理服务

1. 基于 Ollama 封装标准化 GRPC 推理接口，支持 NVIDIA GPU 加速、纯 CPU 离线双模式；

2. LLM 指令解析：接收自然语言浏览指令，结合页面 DOM \+ 截图拆解多步骤标准化 Playwright 操作序列；

3. 自适应流程决策：自动识别弹窗、验证码、页面跳转，动态调整后续操作步骤，支持单步骤失败自动重试；

4. 每个会话绑定独立 AI 记忆上下文，租户之间记忆完全隔离。

### FR\-302 页面视觉识别模块

1. YOLOv8 离线元素检测：识别按钮、输入框、提交控件、弹窗、验证码区域，输出标准化坐标、元素类型；

2. PaddleOCR 离线文字识别：提取页面全文、验证码字符，全程无需联网；

3. 识别结果标准化输出，供给 LLM 生成操作指令。

### FR\-303 结构化数据抽取模块

接收页面 DOM、截图与自定义抽取规则，输出标准 JSON 结构化数据（表格、商品、表单、订单信息）。

### FR\-304 租户独立向量记忆库

1. 单机部署使用 SQLite 存储单租户会话记忆，集群部署使用 Milvus 向量库；

2. 会话销毁自动清理对应临时记忆，持久化记忆加密绑定租户 ID。

## 3\.5 数据持久化、监控、运维、容错模块（内部子 AgentC 开发）

### FR\-401 统一数据存储规范

1. PostgreSQL 核心业务数据表，统一字段、索引、约束；

2. Redis 缓存统一 Key 设计，存储会话临时状态、任务队列、接口限流计数；

3. 会话快照、敏感配置 AES\-256 加密落盘；

4. 定时任务：归档过期日志、清理无效 Redis 缓存、自动删除过期会话快照。

### FR\-402 全链路监控与告警

1. Prometheus 统一采集指标：Pod / 进程 CPU、内存、CDP 长连接数量、AI 推理耗时、会话崩溃次数、代理 IP 失效数量；

2. Grafana 可视化监控大盘，区分全局 / 租户双维度指标；

3. ELK Stack 收集全量操作审计日志，日志强制留存 90 天；

4. 异常告警规则：会话批量崩溃、AI 推理超时、集群资源耗尽、代理 IP 批量失效，支持消息推送。

### FR\-403 全链路分层异常容错规范

1. 浏览器沙箱层：页面渲染崩溃、CDP 断连、代理网络失效自动重试，重试失败销毁会话；

2. AI 服务层：推理超时、模型加载失败返回标准化错误，不阻塞浏览器会话流程；

3. API 网关层：接口并发过载自动限流，返回友好错误码，防止服务雪崩；

4. 数据库层：主从备份、读写分离，数据库故障自动切换备用节点。

# 4 统一接口契约（三套系统互通标准，禁止私自修改）

## 4\.1 对外 RESTful/WS API 网关规范

1. 基础根路径：`/api/v1`，全部接口强制 HTTPS；

2. 统一鉴权请求头：`Authorization: Bearer {租户Token}`；

3. 核心接口清单（三套完全一致）
\| 接口路径 \| 请求方式 \| 功能 \|
\| \-\-\-\- \| \-\-\-\- \| \-\-\-\- \|
\| `/session/create` \| POST \| 创建隔离沙箱会话 \|
\| `/session/{sessionId}/close` \| POST \| 销毁指定会话 \|
\| `/session/{sessionId}/script/run` \| POST \| 执行 Playwright 自动化脚本 \|
\| `/session/{sessionId}/ai/command` \| POST \| 下发自然语言 AI 浏览指令 \|
\| `/session/{sessionId}/screenshot` \| GET \| 获取页面截图 \|
\| `/ws/session/{sessionId}` \| WebSocket \| 实时推送会话日志、截图、AI 执行状态 \|

## 4\.2 内部 GRPC 微服务通信规范

两套核心 GRPC 服务，方法名、入参结构体全局统一：

1. AI 推理 GRPC 服务方法

    - ParsePageTask \(DOM、screenshot、userCommand\) → Playwright 操作步骤列表

    - ExtractStructData \(DOM、ruleJson\) → 结构化 JSON 数据

    - OCRImage \(imageBuffer\) → 识别文本结果

2. 调度中心 GRPC 服务方法

    - AllocateSessionResource \(\) → 分配 Pod / 进程、CDP 端口资源

    - DestroySession \(sessionId\) → 销毁会话并回收全部资源

## 4\.3 Chrome 扩展 ↔ 调度网关 WS 消息协议

统一 JSON 消息结构，固定字段不可删减：

```json
{
  "msgType": "枚举消息类型",
  "sessionId": "会话唯一ID",
  "data": {},
  "timestamp": "毫秒时间戳"
}
```

消息枚举类型三套完全统一：页面操作请求、AI 指令回调、截图推送、脚本录制数据、异常告警。

## 4\.4 底层 CDP 与第三方对接标准

1. CDP 通信：标准 Chrome DevTools Protocol，底层封装统一，上层控制层调用标准化封装方法，禁止直接操作原始 CDP 报文；

2. 代理池对接 HTTP 接口：分配 IP、释放 IP、IP 可用性检测，请求 / 响应字段全局统一；

3. Ollama 本地推理调用规范统一，内部封装隔离，不对外暴露原生 Ollama 接口。

# 5 统一非功能需求

## 5\.1 性能指标（三套必须达标）

1. 会话创建耗时：集群 K8s 环境≤3s，单机进程模式≤1s；

2. AI 单条自然语言指令推理响应耗时：7B 本地模型≤1\.5s；

3. 单集群稳定并发会话最低支持 200 个，长期运行无持续内存泄漏；

4. API 网关单接口 QPS≥100，WebSocket 长连接同时在线≥1000 路；

5. CDP 页面操作指令执行延迟≤200ms。

## 5\.2 安全标准（三套统一安全基线）

1. 隔离安全：会话之间 Cookie、本地存储、网络完全隔离，无跨会话数据泄露通道；

2. 传输安全：全部内外通信 TLS 加密，禁止明文 HTTP、ws；

3. 存储安全：会话快照、账号登录数据 AES\-256 加密存储，租户独立密钥；

4. 访问安全：API 鉴权、RBAC 权限拦截越权操作，租户无法访问他人会话；

5. 浏览器防检测安全：抹平 CDP 自动化特征、随机化全套浏览器指纹、模拟人类鼠标 / 输入轨迹；

6. 审计安全：所有会话创建、AI 调用、数据导出、管理员操作全链路日志留存，日志不可删除篡改。

## 5\.3 可靠性标准

1. 会话崩溃隔离：单会话崩溃不影响集群其余会话，自动销毁异常实例；

2. 集群容灾：单 K8s 节点故障，会话可重建至其他可用节点；

3. 数据可靠：租户配置、任务日志每日数据库快照备份；

4. 系统 MTBF 平均无故障运行≥7 天，故障恢复时间≤30s。

## 5\.4 兼容性标准

1. 容器镜像兼容 Linux amd64 服务器；

2. Playwright SDK 兼容 NodeJS 18\+、Python 3\.9\+；

3. Chrome 扩展兼容 Chromium 120 \+ 内核，标准 Manifest V3；

4. AI 推理兼容 NVIDIA CUDA 12 GPU、纯 CPU 离线双模式。

## 5\.5 可运维交付标准

1. 完整一键部署脚本、Dockerfile、全套 K8s Yaml 资源文件；

2. 开箱即用 Grafana 监控大盘、告警通知配置模板；

3. 完整运维部署手册、故障排查文档、镜像更新规范。

# 6 统一数据层设计规范

## 6\.1 PostgreSQL 核心数据表（三套表结构完全一致）

1. `tenant` 租户表：tenantId、租户名称、并发配额、AES 密钥、创建时间、启用状态；

2. `browser_session` 会话记录表：sessionId、tenantId、proxyId、启动时间、销毁时间、内存上限、会话状态；

3. `task_record` 任务执行表：taskId、sessionId、任务类型 \(脚本 / AI\)、执行状态、耗时、结果存储路径；

4. `audit_log` 审计日志表：操作人 ID、tenantId、sessionId、操作类型、操作时间、操作详情；

5. `script_template` 脚本模板表：tenantId、脚本名称、DSL 脚本内容、创建时间。

## 6\.2 Redis 缓存 Key 统一设计

1. `session:{sessionId}:status`：会话运行临时状态；

2. `queue:browser_task`：BullMQ 自动化任务队列；

3. `rate_limit:tenant:{tenantId}`：租户接口限流计数。

## 6\.3 数据加密存储标准

1. 会话快照文件：AES\-256\-CBC 加密，密钥存储在 tenant 表独立字段；

2. 数据库敏感字段（租户密钥、代理地址）加密入库，不存储明文。

# 7 统一开发周期、里程碑、交付物清单

## 阶段 1：底层沙箱底座开发（14 天，每套内部子 AgentA 交付）

1. 定制 Chromium Docker 镜像、单机进程沙箱调度脚本；

2. K8s 会话 Pod 部署 Yaml、HPA 弹性扩缩配置；

3. Playwright Core CDP 底层封装、会话隔离创建 / 销毁完整逻辑；
交付物：可运行单机 / 集群沙箱 Demo，支持创建完全隔离浏览器会话。

## 阶段 2：控制层与扩展开发（18 天，每套内部子 AgentB 交付）

1. 全套 REST/WS API 网关、Node/Python Playwright SDK；

2. BullMQ 任务调度引擎、自定义脚本 DSL 执行器；

3. Chrome V3 完整扩展（SidePanel/ContentScript/ServiceWorker）；

4. 多租户 Web 管理后台、RBAC 权限模块；
交付物：可远程脚本操控、浏览器可视化人工操作完整 Demo。

## 阶段 3：AI 微服务、数据、监控开发（15 天，每套内部子 AgentC 交付）

1. Ollama LLM Agent、YOLO\+PaddleOCR 视觉识别 GRPC 服务；

2. PostgreSQL 建表迁移脚本、Redis 缓存逻辑、AES 加密存储；

3. Prometheus\+Grafana 监控、ELK 日志收集、告警推送模块；
交付物：支持自然语言驱动浏览器、页面结构化数据抽取完整 AI 能力。

## 阶段 4：全系统联调、压力测试、安全加固（7 天，三套团队各自自测）

1. 跨模块接口全链路联调，修复隔离泄露、通信超时、AI 指令延迟问题；

2. 200 并发会话稳定性压力测试，优化内存泄漏、资源回收逻辑；

3. 浏览器指纹防检测、系统安全加固、审计日志完善；

## 每套团队最终完整交付物

1. 本 SRS 需求规格说明书终版；

2. 系统架构流程图、数据库 ER 图、OpenAPI 接口文档；

3. 底层底座交付：Chromium 镜像 Dockerfile、全套 K8s Yaml、底层调度服务源码；

4. 控制层交付：API 网关源码、双语言 Playwright SDK、Chrome 扩展完整源码、租户管理后台；

5. AI \& 数据运维交付：AI 微服务源码、数据库迁移脚本、监控告警部署脚本；

6. 运维配套：一键部署脚本、运维手册、压力测试报告、安全加固文档。

# 8 统一风险与异常处理规范

1. 风险：会话内存持续泄漏
处理方案：硬内存阈值自动销毁会话、会话强制超时回收、定时清理 Chromium 磁盘缓存、内存指标异常告警；

2. 风险：网站识别自动化浏览器拦截访问
处理方案：全维度随机指纹、抹平 CDP 自动化特征、模拟真人鼠标轨迹、随机输入间隔；

3. 风险：租户会话数据跨沙箱泄露、Cookie 互通
处理方案：容器完全隔离文件系统、禁用全局磁盘缓存、会话销毁递归删除全部 UserData 目录；

4. 风险：集群并发过高，API 网关拥堵雪崩
处理方案：网关多副本负载均衡、任务队列削峰限流、租户独立并发配额限制；

5. 风险：AI 推理延迟过高，页面操作卡顿
处理方案：AI 服务多副本集群、本地 GPU 推理加速、通用操作指令模板预缓存。

# 9 统一验收标准（三套团队共用一套验收用例）

## 9\.1 沙箱隔离验收标准

1. 两个并行会话登录不同账号，Cookie、LocalStorage 互相不可读取；

2. 两个会话配置不同代理 IP，抓包验证出站网络 IP 独立；

3. 会话销毁后 UserData 目录全部文件删除，无账号、缓存残留；

4. 单会话页面崩溃，其余会话正常运行不受任何影响。

## 9\.2 自动化 \& 扩展功能验收标准

1. 通过 Python/Node SDK 远程下发脚本，浏览器自动完成点击、填表、数据抓取；

2. 扩展面板人工操作页面，一键生成可直接执行的标准 Playwright 脚本；

3. WebSocket 通道实时推送页面截图、操作日志，延迟≤300ms。

## 9\.3 AI 能力验收标准

1. 输入自然语言指令（如：填写页面全部注册表单并提交），AI 自动拆解多步骤执行；

2. 页面弹窗、验证码自动识别，自适应调整操作流程，失败自动重试；

3. 页面表格、商品信息一键抽取为标准 JSON 结构化数据。

## 9\.4 商用多租户验收标准

1. 租户 A 无法查询、操作租户 B 任何会话、任务、快照、脚本；

2. RBAC 四级角色权限管控生效，只读用户无法创建会话、导出数据；

3. 全链路操作审计日志完整留存，支持按租户、时间、操作类型检索。

## 9\.5 集群性能验收标准

1. 200 并发会话稳定运行 24 小时，内存无持续上涨、无批量会话崩溃；

2. K8s 依据任务队列自动扩容会话 Pod，闲置 Pod 自动销毁释放资源；

3. 监控大盘完整展示 CPU、内存、在线会话、AI 负载指标，异常触发告警推送。

# 10 附录

## 附录 A：系统分层流程图

```Plain Text
租户客户端/业务系统 ←→ API网关（层5 多租户管理层）
        ↓ ↑
Playwright SDK / Chrome V3扩展（层3 双通路控制层）
        ↓ ↑
会话调度中心 ←→ K8s浏览器沙箱Pod集群（层2+层1 隔离底座）
        ↕ GRPC双向调用
AI微服务集群（层4 AI智能驱动层）
```

## 附录 B：全局技术栈清单

1. 容器编排：Docker、Kubernetes

2. 浏览器内核：Chromium、Playwright Core、CDP 协议

3. 后端服务：NodeJS \(NestJS\)、Python \(FastAPI\)、BullMQ \(Redis\)

4. 前端 \& 扩展：TypeScript、Chrome Manifest V3、Vue3（管理后台）

5. AI 推理：Ollama、YOLOv8、PaddleOCR、GRPC

6. 数据存储：PostgreSQL、Redis、Milvus（集群向量库）

7. 监控运维：Prometheus、Grafana、ELK Stack

8. 加密通信：TLS/SSL、AES\-256\-CBC

## 附录 C：K8s 浏览器沙箱 Pod 基础模板

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: browser-sandbox-{sessionId}
spec:
  containers:
  - name: chromium
    image: custom-chromium:v1.0
    resources:
      limits:
        cpu: "1"
        memory: "2Gi"
      requests:
        cpu: "0.5"
        memory: "1Gi"
    env:
      - name: SESSION_ID
        value: "{sessionId}"
      - name: PROXY_URL
        value: "{proxyAddress}"
      - name: TENANT_ID
        value: "{tenantId}"
    volumeMounts:
      - name: session-data
        mountPath: /data/userdir
  volumes:
  - name: session-data
    emptyDir: {}
```

## 附录 D：三套团队开发规则总览

1. Trae / Workbuddy / Codebuddy 互相独立全栈开发，无模块拆分依赖；

2. 每套团队内部拆分 3 类子 Agent 完成五层架构全部功能；

3. 本文档所有 FR 需求、接口、数据、部署规范为强制统一标准，三套实现必须对齐；

4. 开发顺序：底层底座 → 控制层 \& 租户后台 → AI \& 数据监控 → 全链路联调压力测试；

5. 所有功能开发完成后使用同一套验收用例验证功能、隔离、性能、安全；

6. 需求变更同步更新本文档并推送全部三套开发团队。

> （注：部分内容可能由 AI 生成）
