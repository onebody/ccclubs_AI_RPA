# CCC RPA 自动化平台 - 项目交接文档

> 生成时间：2026-06-30
> 项目状态：阶段性开发完成，核心功能已实现并推送至 GitHub

---

## 一、项目概述

### 1.1 项目定位

CCC RPA 自动化平台是一个面向汽车租赁企业的浏览器自动化工具，通过 Playwright 驱动浏览器在 122.gov.cn（交通安全综合服务管理平台）上自动完成合同备案、违章查询、合同调整、违章转移、违章同步、备案作废等业务操作。

平台由三个子系统组成：

| 子系统 | 路径 | 定位 | 核心技术 |
|--------|------|------|----------|
| **CCC_RPA_API** | `CCC_RPA_API/` | 核心后端（自动化执行引擎 + REST API + WebSocket） | Python FastAPI + Playwright |
| **CCC-BrowserV4/frontend** | `CCC-BrowserV4/frontend/` | 桌面客户端前端 UI | Vue3 + Pinia + Element Plus + TypeScript |
| **CCC-BrowserV4/src-tauri** | `CCC-BrowserV4/src-tauri/` | Tauri 桌面壳层 | Rust + Tauri 2 |

核心能力流程：
```
自动登录 → 扫码认证 → 选择单位 → 页面保活 → 自动处理业务子任务
```

### 1.2 技术栈总览

| 层次 | 技术 | 版本 |
|------|------|------|
| 后端框架 | FastAPI + Uvicorn | 0.115.0 / 0.30.6 |
| ORM | SQLAlchemy 2.0（Mapped 类型 + mapped_column） | 2.0.51 |
| 数据库 | MySQL（pymysql） | pymysql 1.1.1 |
| 浏览器自动化 | Playwright + playwright-stealth | 1.60.0 / 1.0.6 |
| 前端框架 | Vue 3 + TypeScript | — |
| UI 组件库 | Element Plus | — |
| 状态管理 | Pinia | — |
| 桌面客户端 | Tauri 2 + Rust | — |
| 实时通信 | WebSocket（原生 FastAPI WebSocket） | — |
| 构建工具 | Vite | — |
| 配置管理 | pydantic-settings + .env | 2.5.2 |

---

## 二、已完成开发阶段

### 2.1 后端 API 框架搭建

后端采用 FastAPI 框架，应用入口位于 `CCC_RPA_API/app/main.py`。

**应用结构：**
- 启动时通过 `@app.on_event("startup")` 自动创建数据库表，并通过 `ALTER TABLE` 语句兼容历史字段迁移（`predecessor_id`、`sub_tasks`、`province`、`customer_name`、`handler_account`、`tenant_id`、`device_id`）
- 种子数据：启动时自动插入 4 条 mock 任务、3 条租户（广东/浙江/江苏分公司）、2 条设备记录
- CORS 配置：`allow_origins=["*"]`，开发阶段全开

**API 路由模块（`/api/`）：**

| 路由前缀 | 文件 | 功能 |
|----------|------|------|
| `/api/auth` | `auth.py` | 登录/登出/Token验证 |
| `/api/tasks` | `tasks.py` | 任务 CRUD、执行触发、日志查询、扫码完成通知、公司选择、取消执行 |
| `/api/tenants` | `tenants.py` | 租户（公司）CRUD，支持简化格式和详情格式 |
| `/api/devices` | `devices.py` | 设备 CRUD，支持简化格式和详情格式 |

**数据库模型（`app/models/`）：**

| 模型类 | 表名 | 关键字段 |
|--------|------|---------|
| `User` | `users` | id, username, password, token |
| `Task` | `tasks` | id, name, status, tenant_id, device_id, sub_tasks(JSON), province, customer_name, handler_account |
| `TaskExecutionLog` | `task_execution_logs` | id, task_id, status, message |
| `Tenant` | `tenants` | id, tenant_code, name, province, is_active |
| `Device` | `devices` | id, device_code, name, tenant_id, is_active |

**数据库配置：**
- 连接字符串格式：`mysql+pymysql://{user}:{pwd}@{host}:{port}/{db}?charset=utf8mb4`
- 连接池：`pool_pre_ping=True`，`pool_recycle=3600`
- 环境变量配置在 `.env` 文件

### 2.2 前端界面开发

前端使用 Vue 3 + TypeScript + Element Plus，采用 Vite 构建。

**页面结构（`frontend/src/pages/`）：**

| 页面文件 | 路由 | 功能 |
|---------|------|------|
| `LoginPage.vue` | `/login` | 用户登录 |
| `HomePage.vue` | `/` | 系统首页 |
| `TaskPage.vue` | `/tasks` | 任务列表管理 |
| `TaskEditPage.vue` | `/tasks/new` / `/tasks/:id/edit` | 任务新增/编辑表单 |

**核心组件（`frontend/src/components/`）：**

| 组件 | 功能 |
|------|------|
| `AppLayout.vue` | 整体布局框架（侧边栏 + 主内容区） |
| `SideMenu.vue` | 侧边导航菜单 |
| `StatusBar.vue` | 底部状态栏 |
| `ExecutionPanel.vue` | 任务执行面板（登录检查、扫码、单位选择、进度展示） |

**Store 状态管理（`frontend/src/stores/`）：**

| Store | 功能 |
|-------|------|
| `auth.ts` | 用户认证状态（登录/登出/Token） |
| `task.ts` | 任务列表与编辑状态 |
| `execution.ts` | 任务执行状态（WebSocket 消息处理） |
| `device.ts` | 设备信息状态 |

**API 封装（`frontend/src/api/`）：**

| 文件 | 功能 |
|------|------|
| `request.ts` | Axios 基础配置（baseURL、拦截器） |
| `auth.ts` | 认证 API |
| `tasks.ts` | 任务 CRUD API |
| `execution.ts` | 执行相关 API |
| `device.ts` | 设备 API |
| `ws.ts` | WebSocket 连接封装 |

**TaskEditPage 表单字段：**
- 任务名称、所属公司（下拉选择）、执行设备（下拉选择）
- 所属客户、经手人账号、省份（下拉选择）
- 子任务（复选框组：合同备案、备案作废、违章查询、违章同步、合同调整、违章转移）
- 下次执行时间（日期选择器）

### 2.3 浏览器自动化核心功能

**BrowserSessionManager（`browser/session_manager.py`）：**
- 按省份管理 Playwright 浏览器会话，支持持久化 `storage_state`（保存在 `data/browser_states/` 目录）
- 所有 Playwright 操作在**专用工作线程**中通过任务队列执行，避免线程冲突
- 支持浏览器存活检查（`check_alive`）、会话恢复（`recover`）、关闭所有会话（`close_all`）
- 启动参数：`headless=False`，`--disable-blink-features=AutomationControlled`

**SiteAutomation（`browser/site_automation.py`，751 行）：**
- 封装 122.gov.cn 的全部自动化操作
- 支持 31 个省份代码映射（`PROVINCE_CODES`），URL 格式：`https://{code}.122.gov.cn`
- 核心方法：`check_login_status`（登录状态检测）、`get_qr_code`（二维码获取）、`select_company`（单位选择）
- 保活方法：`keep_alive`（旧版，会导航）、`keep_alive_on_page`（新版，页面级轻量保活）
- `check_pending_business`：检测页面是否有待处理业务

**HumanBehavior（`browser/human_behavior.py`，86 行）：**
- 模拟真人操作行为，绕过 WZWS 行为分析
- 方法：`random_delay`（随机延迟）、`human_click`（鼠标移动到随机位置再点击）、`wait_like_human`（模拟阅读等待）

**ExecutionWaiter（`browser/waiter.py`，84 行）：**
- 使用 `threading.Event` 实现执行流程的暂停/恢复
- 支持：`wait_for`（阻塞等待）、`signal`（唤醒）、`cancel`（取消）、`check_signal`（非阻塞检查）
- 用于等待用户扫码、选择公司等交互式操作

### 2.4 WebSocket 实时通信机制

**ConnectionManager（`ws/manager.py`）：**
- 管理所有 WebSocket 连接，维护连接字典 `{ws: fail_count}`
- `broadcast` 方法：向所有连接广播 JSON 消息
- 容错机制：发送失败累计 3 次后自动移除连接，成功后重置计数
- 断开连接自动清理

**线程安全广播（`services/executor.py` 的 `_broadcast` 函数）：**
- 问题背景：Playwright 在独立工作线程运行，WebSocket 广播需回到主 asyncio 事件循环
- 解决方案：在 `main.py` 启动时捕获 `_main_loop`，工作线程通过 `asyncio.run_coroutine_threadsafe()` 将广播协程调度到主循环
- 添加 `done_callback` 检查协程异常，不阻塞工作线程

**WebSocket 消息类型：**

| type | 含义 |
|------|------|
| `execution_progress` | 任务执行进度（登录、扫码、单位选择等阶段） |
| `sub_task_progress` | 子任务执行进度（各步骤进度百分比） |
| `qr_code` | 二维码推送（base64 图片） |
| `company_list` | 单位列表推送（供用户选择） |

### 2.5 公司/设备选择功能

**前端（TaskEditPage.vue）：**
- 公司下拉框：`el-select` 绑定 `form.tenant_id`，`filterable` + `clearable`，数据来自 `/api/tenants`
- 设备下拉框：`el-select` 绑定 `form.device_id`，数据来自 `/api/devices`
- 选项格式：`{id: tenant_code/device_code, name: 显示名称}`

**后端（api/tenants.py、api/devices.py）：**
- 支持完整 CRUD：列表（分页）、创建、更新、删除、详情
- 两种响应格式：简化格式（`{id, name}` 供下拉框使用）和详情格式（完整字段，camelCase）

**执行时的公司选择（ExecutionPanel.vue）：**
- 执行流程中通过 WebSocket 推送 `company_list` 消息
- 前端展示公司选择弹窗，用户选择后调用 `POST /api/tasks/{task_id}/select-company`
- 后端通过 `ExecutionWaiter.signal()` 唤醒等待中的执行线程

### 2.6 租户/设备数据库 CRUD 接入

- ORM 模型：`Tenant`（tenant_code, name, province, is_active）、`Device`（device_code, name, tenant_id, is_active）
- Schema：`TenantCreate/Update/Response/DetailResponse/ListResponse`、`DeviceCreate/Update/Response/DetailResponse/ListResponse`
- API：完整 CRUD + 列表分页，支持关键词搜索和状态过滤
- 种子数据：启动时自动插入 3 条租户和 2 条设备（仅在数据库为空时插入）

### 2.7 子任务功能模块

子任务采用注册表模式（`SubTaskRegistry`），通过子任务类型字符串查找对应的处理器类。

**架构设计：**
- 基类 `BaseSubTask`：提供通用方法（`_broadcast_progress`、`_wait_human`、`_safe_click`、`_safe_type`、`_screenshot`、`_find_clickable_by_text`、`_wait_for_page_ready`）
- 注册表 `SubTaskRegistry`：维护类型字符串到处理器类的映射，支持多个别名指向同一处理器
- 执行入口：`SubTaskRegistry.execute(page, sub_task_type, context, broadcast_fn, task_id)`

**BaseSubTask 通用方法：**

| 方法 | 功能 |
|------|------|
| `_broadcast_progress(step, message, progress)` | 广播子任务进度 |
| `_wait_human(min_s, max_s)` | 模拟人类思考时间（PPM 控制） |
| `_safe_click(selector_or_element, description)` | 安全点击，带人类行为模拟 |
| `_safe_type(selector, text, description)` | 安全输入文本，逐字符模拟 |
| `_screenshot(name)` | 保存调试截图到 `/tmp/` |
| `_find_clickable_by_text(text, tag)` | 通过文本查找并点击元素（JS 回退） |
| `_wait_for_page_ready(timeout)` | 等待页面 DOM 加载完成 |

### 2.8 保活机制

保活逻辑在 `SiteAutomation.keep_alive_on_page()` 中实现，特点是**页面级轻量操作，不导航到其他页面**：

**保活操作类型（随机选择其一）：**
1. 小幅度随机滚动（`page.mouse.wheel`）
2. 鼠标随机移动（视口内随机坐标）
3. 键盘 Tab（切换焦点，不触发操作）
4. 模拟阅读等待（`HumanBehavior.wait_like_human`）
5. 鼠标移动到页面顶部区域（模拟查看导航栏）

**安全机制：**
- 不会点击业务按钮、不触发表单提交、不执行页面导航
- 自动关闭意外弹出的对话框（如超时提示弹窗）
- 执行间隔：30~120 秒随机
- 最大保活时长：8 小时（`max_keep_alive_hours`）
- 保活期间持续检测浏览器存活状态，崩溃时自动恢复

---

## 三、子任务功能清单

| 子任务类名 | 文件 | 注册键 | 核心功能 | 代码行数 |
|-----------|------|--------|---------|---------|
| `FilingSubTask` | `filing.py` | `合同备案` / `备案查询` / `备案` | 自动完成合同备案操作：导航→验证页面→查找待备案合同→填写表单→提交→验证结果 | 676 |
| `ContractEntrySubTask` | `contract_entry.py` | `合同录入` / `录入合同` | 自动完成租赁合同录入：填写号牌信息、租赁类型、合同编号、时间、身份证件等字段 | 849 |
| `ViolationQuerySubTask` | `violation_query.py` | `违章查询` | 两种模式：`all`（全量同步含翻页/图片）和 `plate`（按车牌精确查询） | 1302 |
| `ContractAdjustSubTask` | `contract_adjust.py` | `合同调整` | 修改已有租赁合同信息：调整结束时间、证件号码等字段 | 770 |
| `ViolationTransferSubTask` | `violation_transfer.py` | `违章转移` / `转移违章` | 将违章记录转移到承租驾驶人 | 802 |
| `ViolationSyncSubTask` | `violation_sync.py` | `违章同步` / `数据同步` | 获取车辆列表→逐车查询违章→本地缓存→批量提交到 SaaS API | 1243 |
| `FilingCancellationSubTask` | `filing_cancellation.py` | `备案作废` / `合同备案作废` | 处理已备案合同的作废流程：导航→获取列表→选择→确认作废→验证 | 493 |

---

## 四、已解决的关键技术问题

### 4.1 WebSocket 广播线程安全

**问题：** Playwright 在独立工作线程中运行，而 FastAPI 的 WebSocket 广播必须在主 asyncio 事件循环中执行。直接在工作线程调用 `asyncio.run(ws_manager.broadcast())` 会创建新的事件循环，导致广播消息无法送达前端。

**解决方案：**
1. 在 `main.py` 的 `@app.on_event("startup")` 中捕获主事件循环引用：`_main_loop = asyncio.get_event_loop()`
2. 工作线程通过 `asyncio.run_coroutine_threadsafe(ws_manager.broadcast(msg), _main_loop)` 将协程调度到主循环
3. 添加 `done_callback` 检查协程执行异常，避免静默失败
4. 不等待 future 结果（不阻塞工作线程）

### 4.2 CSS 选择器匹配政府网站

**问题：** 122.gov.cn 的页面结构不稳定，CSS 选择器经常无法匹配目标元素，导致自动化操作失败。

**解决方案：**
- 采用多层回退策略：先用精确 CSS 选择器，失败后用文本匹配（JS evaluate）
- `BaseSubTask._find_clickable_by_text()`：通过 JavaScript 遍历 `a, button, div, span, li, td` 等标签，找到包含目标文本的最小元素并点击
- `HumanBehavior.human_click()`：使用 `bounding_box` 计算元素中心，加上随机偏移后点击，降低被 WZWS 检测风险

### 4.3 PPM 异常修复

**问题：** 政府网站的 PPM（页面性能监控）系统会对快速操作触发异常检测，导致页面弹窗或请求被拦截。

**解决方案：**
- 所有操作间加入随机延迟（`_wait_human` 方法，3~10 秒随机）
- 文本输入采用逐字符模式（`page.keyboard.type(char, delay=random.randint(50, 200))`）
- 鼠标移动使用多步骤（`steps=random.randint(5, 15)`）模拟真实轨迹

### 4.4 保活跳转回首页

**问题：** 旧版保活方法 `keep_alive()` 会点击页面链接导致导航到其他页面（如首页），破坏了当前业务页面的状态。

**解决方案：**
- 新增 `keep_alive_on_page()` 方法，严格限制在当前页面执行轻量操作
- 操作类型限定为：滚动、鼠标移动、键盘 Tab、模拟阅读，不点击任何业务按钮
- 保活操作前保存当前 URL，操作后验证 URL 未变化

### 4.5 Git 仓库体积清理

**问题：** 误将截图文件和构建产物提交到 Git，导致仓库体积过大。

**解决方案：**
- 提交 `6a2942a`：移除误提交的截图文件并更新 `.gitignore`
- 提交 `155c344`：更新 `.gitignore` 排除 Rust target 目录、Python venv 和 `__pycache__`
- 提交 `7f59f6d`：删除项目配置文件和依赖锁定文件

---

## 五、当前存在的问题和待优化点

### 5.1 已知问题

1. **数据库迁移方式原始**：使用 `ALTER TABLE` 手动添加列，无版本控制，生产环境迁移风险高
2. **SQLite 配置残留**：项目文档提及 SQLite，但实际配置使用 MySQL（`config.py` 中 `DATABASE_URL` 指向 MySQL），文档与实现不一致
3. **Playwright headless=False**：生产环境需要无头模式运行，当前硬编码为 `False`
4. **种子数据硬编码**：租户和设备种子数据写在 `main.py` 的启动事件中，无法配置化
5. **CORS 全开**：`allow_origins=["*"]` 仅适合开发，生产需收紧
6. **认证机制简单**：auth 模块功能存在但未深入集成到所有 API

### 5.2 待优化项

1. **引入 Alembic** 替代手动 ALTER TABLE，实现数据库版本管理
2. **Playwright 无头模式** 通过环境变量控制 `headless` 参数
3. **错误重试机制**：子任务执行失败后自动重试（当前直接返回失败）
4. **日志持久化**：当前日志仅输出到控制台，需接入文件或日志服务
5. **子任务参数传递**：部分子任务使用硬编码默认数据（如 `DEFAULT_CONTRACT_DATA`），需改为从前端/API 传入
6. **浏览器状态持久化**：`storage_state` 保存逻辑存在，但跨重启的恢复验证不充分
7. **WebSocket 连接管理**：缺少心跳检测和自动重连机制

### 5.3 后续开发方向建议

1. **定时任务调度**：集成 APScheduler 或 Celery，支持 cron 表达式定时执行任务
2. **执行历史记录**：完善 `TaskExecutionLog` 的记录维度，支持执行回放
3. **多用户并发**：当前 `ThreadPoolExecutor(max_workers=3)` 限制了并发数，需评估扩展方案
4. **SaaS 平台对接**：违章同步子任务已有 SaaS API 提交逻辑，可进一步扩展数据双向同步
5. **监控告警**：接入 Prometheus/Grafana 监控任务成功率和执行时长

---

## 六、技术架构

### 6.1 系统架构

```
用户
  │
  │ HTTP REST / WebSocket
  ▼
┌──────────────────────────────────────────────────────────┐
│  Tauri 桌面客户端（CCC-BrowserV4）                        │
│  ┌────────────────┐   ┌────────────────────────────────┐│
│  │  Rust 层        │   │  Vue3 前端                      ││
│  │  设备标识/系统API│◄─►│  页面/组件/Pinia Store/API封装  ││
│  └────────────────┘   └────────────┬───────────────────┘│
└─────────────────────────────────────┼────────────────────┘
                                      │ HTTP + WebSocket
                                      ▼
┌──────────────────────────────────────────────────────────┐
│  CCC_RPA_API（FastAPI 后端，端口 8000）                    │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐ │
│  │ API 路由 │  │ Services │  │   WS    │  │  Models  │ │
│  │ auth     │  │ executor │  │ Manager │  │ Task     │ │
│  │ tasks    │  │ task     │  │         │  │ Tenant   │ │
│  │ tenants  │  │ auth     │  │         │  │ Device   │ │
│  │ devices  │  │          │  │         │  │ User     │ │
│  └──────────┘  └──────────┘  └─────────┘  └──────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Browser 层（Playwright 工作线程）                   │ │
│  │  SessionManager → SiteAutomation → SubTaskRegistry │ │
│  │  HumanBehavior  → Waiter        → BaseSubTask      │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
         │
         │ Playwright (Chromium)
         ▼
   122.gov.cn（政府交通安全综合服务管理平台）
```

### 6.2 目录结构

```
ccclubs_AI_RPA/
├── CCC_RPA_API/                      # 核心后端
│   ├── app/
│   │   ├── main.py                   # FastAPI 应用入口
│   │   ├── config.py                 # 配置管理（pydantic-settings）
│   │   ├── database.py               # 数据库连接与会话
│   │   ├── api/                      # API 路由层
│   │   │   ├── auth.py               #   认证 API
│   │   │   ├── tasks.py              #   任务管理 API
│   │   │   ├── tenants.py            #   租户管理 API
│   │   │   └── devices.py            #   设备管理 API
│   │   ├── browser/                  # 浏览器自动化层
│   │   │   ├── session_manager.py    #   Playwright 会话管理（专用线程）
│   │   │   ├── site_automation.py    #   122.gov.cn 操作封装（751行）
│   │   │   ├── human_behavior.py     #   真人行为模拟
│   │   │   ├── waiter.py             #   执行流程暂停/恢复
│   │   │   └── sub_tasks/            #   子任务模块
│   │   │       ├── __init__.py       #     SubTaskRegistry 注册表
│   │   │       ├── base.py           #     BaseSubTask 基类
│   │   │       ├── filing.py         #     合同备案（676行）
│   │   │       ├── filing_cancellation.py  # 备案作废（493行）
│   │   │       ├── contract_entry.py #     合同录入（849行）
│   │   │       ├── contract_adjust.py#     合同调整（770行）
│   │   │       ├── violation_query.py#     违章查询（1302行）
│   │   │       ├── violation_transfer.py   # 违章转移（802行）
│   │   │       └── violation_sync.py #     违章同步（1243行）
│   │   ├── models/                   # ORM 数据模型
│   │   │   ├── base.py               #   BaseModel（id, created_at, updated_at）
│   │   │   ├── user.py               #   User 模型
│   │   │   ├── task.py               #   Task 模型
│   │   │   ├── execution_log.py      #   TaskExecutionLog 模型
│   │   │   ├── tenant.py             #   Tenant 模型
│   │   │   └── device.py             #   Device 模型
│   │   ├── schemas/                  # Pydantic Schema
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── executor.py           #   任务执行引擎（372行）
│   │   │   ├── task.py               #   任务服务
│   │   │   └── auth.py               #   认证服务
│   │   └── ws/
│   │       └── manager.py            #   WebSocket 连接管理器
│   ├── data/
│   │   ├── browser_states/           # Playwright storage_state 持久化
│   │   └── violation_results/        # 违章查询结果 JSON 缓存
│   ├── tests/                        # 测试脚本
│   ├── .env                          # 环境变量（数据库配置）
│   └── requirements.txt              # Python 依赖
│
├── CCC-BrowserV4/                    # 桌面客户端
│   ├── frontend/                     # Vue3 前端
│   │   ├── src/
│   │   │   ├── pages/                #   页面组件
│   │   │   ├── components/           #   通用组件
│   │   │   ├── stores/               #   Pinia 状态管理
│   │   │   ├── api/                  #   API 请求封装
│   │   │   ├── types/                #   TypeScript 类型定义
│   │   │   └── router/               #   Vue Router 路由配置
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── backend/                      # 辅助后端（功能待明确）
│   └── src-tauri/                    # Tauri 桌面壳层（Rust）
│
├── project.md                        # 项目技术文档（1498行）
└── HANDOVER.md                       # 本文档
```

### 6.3 关键文件索引

| 文件路径 | 行数 | 功能描述 |
|---------|------|---------|
| `CCC_RPA_API/app/main.py` | 156 | FastAPI 应用入口、路由注册、启动/关闭事件、WebSocket 端点 |
| `CCC_RPA_API/app/services/executor.py` | 372 | 任务执行引擎：线程池、浏览器恢复、保活循环、子任务调度 |
| `CCC_RPA_API/app/browser/site_automation.py` | 751 | 122.gov.cn 全部操作封装（登录/扫码/选单位/保活/业务检测） |
| `CCC_RPA_API/app/browser/session_manager.py` | 186 | Playwright 会话管理器（专用工作线程、省份会话、状态持久化） |
| `CCC_RPA_API/app/browser/sub_tasks/__init__.py` | 46 | SubTaskRegistry 注册表（类型字符串→处理器类映射） |
| `CCC_RPA_API/app/browser/sub_tasks/base.py` | 122 | BaseSubTask 基类（通用操作方法） |
| `CCC_RPA_API/app/browser/sub_tasks/violation_query.py` | 1302 | 违章查询子任务（最复杂的子任务，支持全量/精确两种模式） |
| `CCC_RPA_API/app/browser/sub_tasks/violation_sync.py` | 1243 | 违章同步子任务（车辆列表→逐车查询→本地缓存→SaaS API 批量提交） |
| `CCC_RPA_API/app/ws/manager.py` | 43 | WebSocket 连接管理器（广播、容错、死连接清理） |
| `CCC-BrowserV4/frontend/src/pages/TaskEditPage.vue` | 286 | 任务编辑页面（表单、子任务选择、公司/设备下拉） |
| `CCC-BrowserV4/frontend/src/components/ExecutionPanel.vue` | — | 执行面板（扫码、公司选择、进度展示） |
| `project.md` | 1498 | 完整项目技术文档 |

---

## 七、Git 提交历史摘要

| 提交哈希 | 提交信息 | 里程碑意义 |
|---------|---------|----------|
| `d07235d` | feat(v2.0): 商用级 AI 浏览器系统全栈交付 | 项目初始版本，全栈框架搭建 |
| `70e1f9a` | feat(frontend): 添加任务管理功能并集成后端API | 任务 CRUD 功能完成 |
| `daa6767` | docs: 重写 project.md 项目技术文档 | 技术文档体系建立 |
| `155c344` | chore: update .gitignore to exclude Rust target, Python venv | 仓库清理 |
| `7e587e3` | feat: 租户和设备 API 接入真实数据库 | 数据库 CRUD 接入 |
| `f967885` | feat: 实现备案子任务功能模块 | 首个子任务实现 |
| `9273959` | fix: 修复 WebSocket 广播可靠性 | 线程安全广播问题解决 |
| `5b176df` | feat: 实现合同录入子任务模块 | 合同录入功能完成 |
| `c7d4fb2` | feat: 实现违章查询/合同调整/违章转移三个子任务模块 | 批量子任务实现 |
| `53bb35b` | feat: 增强违章查询子任务 - 全量同步与精确查询 | 违章查询增强 |
| `501083e` | feat: 实现违章记录数据同步子任务 | SaaS API 对接 |
| `d056187` | feat: 新增备案作废子任务 | 备案作废功能完成 |
| `440ebd2` | refactor: 前端将合同录入改为备案作废 + 完善合同备案子任务 | 前端子任务选项调整 |
| `2337503` | test: 添加备案子任务测试数据和验证脚本 | 测试用例补充 |

---

## 八、运行指南

### 8.1 环境准备

**后端（Python）：**
```bash
# Python 3.10+
cd CCC_RPA_API

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate   # macOS/Linux

# 安装依赖
pip install -r requirements.txt

# 安装 Playwright 浏览器
playwright install chromium
```

**前端（Node.js）：**
```bash
# Node.js 18+
cd CCC-BrowserV4/frontend

# 安装依赖
npm install
```

**数据库（MySQL）：**
- 确保 MySQL 服务运行
- 创建数据库 `ccc_browser`
- 创建用户 `ccc_user` 并授权

### 8.2 后端启动

```bash
cd CCC_RPA_API
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动成功后：
- API 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health`
- WebSocket：`ws://localhost:8000/ws`

### 8.3 前端启动

```bash
cd CCC-BrowserV4/frontend
npm run dev
```

默认启动端口：`http://localhost:5173`（Vite 默认）

### 8.4 环境变量配置

**CCC_RPA_API/.env：**
```env
# MySQL 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=ccc_user
DB_PASSWORD=ccc_password_2025
DB_DATABASE=ccc_browser
```

**CCC-BrowserV4/frontend/.env（如有）：**
```env
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:8000
```

---

> 文档结束。如有疑问，请参考 `project.md`（1498 行完整技术文档）获取更详细的技术细节。
