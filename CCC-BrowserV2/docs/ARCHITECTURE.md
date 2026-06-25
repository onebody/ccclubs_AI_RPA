# 架构设计文档

## 1. 系统架构概述

### 1.1 四层极简架构

```
┌─────────────────────────────────────────────────────────┐
│  Web可视化管理后台 (Vue3 + Element Plus)                 │
│  - 流程模板配置                                           │
│  - 业务API配置                                           │
│  - 任务调度监控                                           │
│  - 租户权限管理                                           │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP API (127.0.0.1)
┌─────────────────────────────────────────────────────────┐
│  本地桌面调度服务 (NestJS + BullMQ)                       │
│  - 任务队列管理                                           │
│  - 流程模板解析                                           │
│  - API数据拉取                                           │
│  - 租户权限校验                                           │
└─────────────────────────────────────────────────────────┘
                            ↓ IPC调用
┌─────────────────────────────────────────────────────────┐
│  Playwright沙箱引擎 (独立Chromium进程)                    │
│  - 多进程隔离                                             │
│  - WZWS防风控                                             │
│  - 真人仿真                                               │
│  - 会话缓存复用                                           │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP请求
┌─────────────────────────────────────────────────────────┐
│  外部用户业务API                                          │
│  - 批量数据获取                                           │
│  - 业务系统集成                                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 架构设计原则

| 原则 | 说明 | 实现方式 |
|------|------|----------|
| **极简性** | 无冗余功能,无录制,无扩展 | 仅保留核心业务链路 |
| **配置化** | 业务数据、流程规则全部配置化 | 数据库配置表,JSON模板 |
| **隔离性** | 多租户、多沙箱、多进程隔离 | tenant_id,独立userDataDir |
| **防风控** | 全套WZWS绕过能力 | 定制Chromium,Stealth插件 |
| **跨端统一** | 三端逻辑100%一致 | 统一代码,统一配置 |
| **安全性** | 本地监听,数据加密,权限控制 | 127.0.0.1,AES-256-GCM |

## 2. 架构决策记录 (ADR)

### ADR-001: 选择Tauri而非Electron

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要跨三端(Windows/macOS/Ubuntu)的桌面客户端框架,支持批量沙箱并发场景。

**决策**:
选择Tauri v2作为桌面客户端框架。

**理由**:
| 维度 | Tauri | Electron | 结论 |
|------|--------|----------|------|
| **体积** | ~3MB | ~150MB | Tauri胜 |
| **内存** | 低占用 | 高占用,易泄露 | Tauri胜 |
| **Chromium冗余** | 无内置 | 内置冗余Chromium | Tauri胜 |
| **三端一致性** | 高 | 中 | Tauri胜 |
| **批量并发** | 适合 | 易内存泄露 | Tauri胜 |

**后果**:
- ✅ 轻量化,适合批量沙箱并发
- ✅ 三端打包一致性高
- ⚠️ 需要内置独立Chromium内核
- ⚠️ Tauri v2仍在Beta阶段,需锁定版本

### ADR-002: 选择Playwright-Core而非Selenium

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要自动化浏览器引擎,支持WZWS防风控,支持定制Chromium内核。

**决策**:
选择Playwright-Core 1.45.3作为自动化内核。

**理由**:
| 维度 | Playwright-Core | Selenium | Puppeteer | 结论 |
|------|----------------|----------|-----------|------|
| **webdriver特征** | 无原生强特征 | 强特征 | 中等特征 | Playwright胜 |
| **CDP可控性** | 高 | 低 | 高 | Playwright胜 |
| **进程隔离** | 支持 | 不支持 | 不支持 | Playwright胜 |
| **定制内核** | 支持 | 不支持 | 支持 | Playwright胜 |
| **WZWS绕过** | 最优 | 困难 | 中等 | Playwright胜 |

**后果**:
- ✅ 无webdriver强特征,易绕过WZWS
- ✅ 支持进程级沙箱隔离
- ✅ 支持定制去特征Chromium
- ⚠️ 需锁定版本,禁止自动升级
- ⚠️ 需内置三端Chromium内核

### ADR-003: 选择NestJS而非Express

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要后端服务框架,支持任务队列、多租户权限体系、长期可维护性。

**决策**:
选择NestJS作为后端服务框架。

**理由**:
| 维度 | NestJS | Express | FastAPI | 结论 |
|------|--------|---------|---------|------|
| **模块化** | 强 | 弱 | 中 | NestJS胜 |
| **依赖注入** | 规范 | 无 | 中 | NestJS胜 |
| **任务队列** | BullMQ集成好 | 需手动集成 | Celery | NestJS胜 |
| **多租户** | 易实现 | 需手动实现 | 中 | NestJS胜 |
| **可维护性** | 高 | 中 | 中 | NestJS胜 |
| **异步模型** | 适配Playwright | 需手动处理 | 异步原生 | NestJS胜 |

**后果**:
- ✅ 模块化清晰,长期可维护
- ✅ 依赖注入规范,易扩展
- ✅ BullMQ集成友好
- ⚠️ 学习曲线较陡
- ⚠️ 需锁定Node.js版本

### ADR-004: 选择BullMQ而非Celery

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要任务队列中间件,支持延迟任务、定时任务、失败重试、并发控制。

**决策**:
选择BullMQ + Redis作为任务队列中间件。

**理由**:
| 维度 | BullMQ | Celery | RabbitMQ | 结论 |
|------|--------|--------|----------|------|
| **语言一致性** | Node.js原生 | Python | 多语言 | BullMQ胜 |
| **延迟任务** | 支持 | 支持 | 支持 | 平局 |
| **定时任务** | 支持 | 支持 | 需插件 | BullMQ胜 |
| **失败重试** | 内置 | 内置 | 需配置 | BullMQ胜 |
| **并发控制** | 内置 | 需配置 | 需配置 | BullMQ胜 |
| **状态持久化** | Redis | 多后端 | 内置 | BullMQ胜 |
| **集成难度** | 低 | 中 | 高 | BullMQ胜 |

**后果**:
- ✅ 与NestJS完美集成
- ✅ 支持延迟、定时、重试、并发
- ✅ 状态持久化到Redis
- ⚠️ 需本地部署Redis
- ⚠️ 禁止Redis集群和外网连接

### ADR-005: 选择PostgreSQL而非MySQL

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要关系型数据库,支持多租户结构化数据、任务日志、权限数据持久化。

**决策**:
选择PostgreSQL 15.8作为数据持久化方案。

**理由**:
| 维度 | PostgreSQL | MySQL | MongoDB | 结论 |
|------|------------|-------|---------|------|
| **稳定性** | 高 | 高 | 中 | PostgreSQL胜 |
| **事务支持** | 强 | 强 | 弱 | PostgreSQL胜 |
| **多租户** | 易实现 | 易实现 | 易实现 | 平局 |
| **结构化数据** | 强 | 强 | 弱 | PostgreSQL胜 |
| **任务日志** | 适合 | 适合 | 适合 | 平局 |
| **权限数据** | 适合 | 适合 | 不适合 | PostgreSQL胜 |

**后果**:
- ✅ 稳定可靠,适合结构化数据
- ✅ 事务支持强
- ⚠️ 需本地部署PostgreSQL
- ⚠️ 所有表需携带tenant_id

### ADR-006: 配置化而非硬编码

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要支持多场景、多表单、多业务数据源,避免频繁改代码。

**决策**:
采用配置化架构,业务数据、页面元素、流程规则全部配置化。

**理由**:
| 维度 | 配置化 | 硬编码 | 结论 |
|------|--------|--------|------|
| **灵活性** | 高 | 低 | 配置化胜 |
| **维护成本** | 低 | 高 | 配置化胜 |
| **扩展性** | 高 | 低 | 配置化胜 |
| **开发效率** | 初期慢,后期快 | 初期快,后期慢 | 配置化胜 |
| **出错风险** | 低 | 高 | 配置化胜 |

**后果**:
- ✅ 无需改代码即可新增场景
- ✅ 易适配新表单、新业务
- ⚠️ 初期开发复杂度较高
- ⚠️ 需设计完善的配置表结构

### ADR-007: 多进程沙箱隔离而非单进程

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要支持多租户、多任务并发,防止会话混用、防止关联。

**决策**:
采用多进程沙箱隔离架构,一任务一进程、一进程一userDataDir、一进程一代理IP。

**理由**:
| 维度 | 多进程隔离 | 单进程共享 | 结论 |
|------|------------|------------|------|
| **防关联** | 强 | 弱 | 多进程胜 |
| **会话隔离** | 强 | 弱 | 多进程胜 |
| **代理隔离** | 强 | 弱 | 多进程胜 |
| **资源占用** | 高 | 低 | 单进程胜 |
| **稳定性** | 高 | 低 | 多进程胜 |
| **错误隔离** | 强 | 弱 | 多进程胜 |

**后果**:
- ✅ 强防关联,会话隔离
- ✅ 错误隔离,单任务失败不影响其他
- ⚠️ 资源占用较高,需控制并发数
- ⚠️ 需完善的进程管理机制

### ADR-008: 本地监听而非外网暴露

**状态**: 已采纳
**决策日期**: 2026-06-23

**背景**:
需要防止外网攻击、数据泄露、未授权访问。

**决策**:
所有本地服务仅127.0.0.1监听,禁止外网暴露。

**理由**:
| 维度 | 本地监听 | 外网暴露 | 结论 |
|------|----------|----------|------|
| **安全性** | 高 | 低 | 本地胜 |
| **攻击风险** | 低 | 高 | 本地胜 |
| **数据泄露** | 低 | 高 | 本地胜 |
| **访问控制** | 简单 | 复杂 | 本地胜 |

**后果**:
- ✅ 高安全性,防止外网攻击
- ✅ 简化访问控制
- ⚠️ 仅支持本地使用
- ⚠️ 无法远程访问

## 3. 系统模块设计

### 3.1 模块划分

```
backend/
├── engine/                    # 沙箱引擎模块
│   ├── browser-launcher.ts    # Chromium启动器
│   ├── stealth-plugin.ts      # Stealth指纹抹平
│   ├── human-simulator.ts     # 真人行为仿真
│   ├── session-manager.ts     # 会话缓存管理
│   └── proxy-manager.ts       # 代理管理
│
├── process-config/            # 流程模板模块
│   ├── template-parser.ts     # 模板解析器
│   ├── login-executor.ts      # 登录执行器
│   ├── scene-runner.ts        # 场景执行器
│   └── form-filler.ts         # 表单填充器
│
├── task-queue/                # 任务队列模块
│   ├── queue-manager.ts       # 队列管理器
│   ├── task-scheduler.ts      # 任务调度器
│   ├── retry-handler.ts       # 重试处理器
│   └── concurrent-limiter.ts  # 并发限制器
│
├── api-client/                # API客户端模块
│   ├── http-client.ts         # HTTP请求客户端
│   ├── data-fetcher.ts        # 数据拉取器
│   ├── data-mapper.ts         # 数据映射器
│   └── batch-executor.ts      # 批量执行器
│
├── tenant-rbac/               # 租户权限模块
│   ├── tenant-service.ts      # 租户服务
│   ├── auth-service.ts        # 认证服务
│   ├── role-service.ts        # 角色服务
│   ├── permission-service.ts  # 权限服务
│
└── db/                        # 数据库模块
    ├── entities/              # 实体定义
    ├── migrations/            # 数据库迁移
    └── repositories/          # 数据访问层
```

### 3.2 模块职责

| 模块 | 职责 | 关键类 |
|------|------|--------|
| **engine** | 沙箱引擎,防风控 | BrowserLauncher, StealthPlugin, HumanSimulator |
| **process-config** | 流程模板解析 | TemplateParser, LoginExecutor, SceneRunner |
| **task-queue** | 任务调度 | QueueManager, TaskScheduler, RetryHandler |
| **api-client** | 外部API调用 | HttpClient, DataFetcher, DataMapper |
| **tenant-rbac** | 租户权限 | TenantService, AuthService, RoleService |
| **db** | 数据持久化 | Entities, Repositories |

## 4. 数据库设计

### 4.1 核心表结构

#### 4.1.1 tenant (租户表)

```sql
CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active/suspended/expired
  concurrent_limit INT DEFAULT 5, -- 并发任务上限
  expire_time TIMESTAMP, -- 过期时间
  api_token VARCHAR(255), -- API Token(加密存储)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_status ON tenant(status);
CREATE INDEX idx_tenant_expire ON tenant(expire_time);
```

#### 4.1.2 rpa_process (流程模板表)

```sql
CREATE TABLE rpa_process (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  status VARCHAR(20) DEFAULT 'active', -- active/inactive/deleted
  session_cache_enable BOOLEAN DEFAULT true, -- 是否启用会话缓存
  session_ttl INT DEFAULT 3600, -- 会话缓存TTL(秒)
  delay_mode VARCHAR(20) DEFAULT 'balance', -- fast/balance/high_sim
  login_config JSONB, -- 登录配置(JSON)
  scene_list JSONB, -- 场景列表(JSON数组)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- 逻辑删除时间
);

CREATE INDEX idx_process_tenant ON rpa_process(tenant_id);
CREATE INDEX idx_process_status ON rpa_process(status);
CREATE INDEX idx_process_deleted ON rpa_process(deleted_at);
```

#### 4.1.3 api_data_source (业务API数据源表)

```sql
CREATE TABLE api_data_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  method VARCHAR(10) DEFAULT 'GET', -- GET/POST
  url VARCHAR(500) NOT NULL,
  headers JSONB, -- 请求头(JSON)
  params JSONB, -- 请求参数(JSON)
  data_path VARCHAR(100) DEFAULT 'data.list', -- 数据列表字段路径
  pagination_config JSONB, -- 分页配置(JSON)
  batch_size INT DEFAULT 50, -- 批量拉取数量
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- 逻辑删除时间
);

CREATE INDEX idx_api_source_tenant ON api_data_source(tenant_id);
CREATE INDEX idx_api_source_deleted ON api_data_source(deleted_at);
```

#### 4.1.4 rpa_task (任务调度表)

```sql
CREATE TABLE rpa_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  process_id UUID NOT NULL REFERENCES rpa_process(id),
  scene_id VARCHAR(50), -- 场景ID
  api_source_id UUID REFERENCES api_data_source(id),
  task_data JSONB, -- 任务数据(JSON)
  status VARCHAR(20) DEFAULT 'pending', -- pending/running/success/failed/cancelled
  progress INT DEFAULT 0, -- 进度百分比
  result JSONB, -- 执行结果(JSON)
  error_msg TEXT, -- 错误信息
  retry_count INT DEFAULT 0, -- 重试次数
  start_time TIMESTAMP, -- 开始时间
  end_time TIMESTAMP, -- 结束时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_tenant ON rpa_task(tenant_id);
CREATE INDEX idx_task_status ON rpa_task(status);
CREATE INDEX idx_task_process ON rpa_task(process_id);
CREATE INDEX idx_task_time ON rpa_task(created_at);
```

#### 4.1.5 sandbox_session (沙箱会话缓存表)

```sql
CREATE TABLE sandbox_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  session_dir VARCHAR(255) NOT NULL, -- 会话目录路径
  proxy_ip VARCHAR(100), -- 代理IP
  user_agent VARCHAR(500), -- User-Agent
  fingerprint JSONB, -- 指纹信息(JSON)
  expire_time TIMESTAMP, -- 过期时间
  status VARCHAR(20) DEFAULT 'active', -- active/expired/destroyed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_tenant ON sandbox_session(tenant_id);
CREATE INDEX idx_session_status ON sandbox_session(status);
CREATE INDEX idx_session_expire ON sandbox_session(expire_time);
```

#### 4.1.6 user (用户表)

```sql
CREATE TABLE user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL, -- 加密存储
  email VARCHAR(100),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active', -- active/inactive/deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- 逻辑删除时间
);

CREATE INDEX idx_user_tenant ON user(tenant_id);
CREATE INDEX idx_user_username ON user(username);
CREATE INDEX idx_user_deleted ON user(deleted_at);
```

#### 4.1.7 role (角色表)

```sql
CREATE TABLE role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active', -- active/inactive/deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- 逻辑删除时间
);

CREATE INDEX idx_role_tenant ON role(tenant_id);
CREATE INDEX idx_role_deleted ON role(deleted_at);
```

#### 4.1.8 permission (权限表)

```sql
CREATE TABLE permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL, -- 资源名称
  action VARCHAR(50) NOT NULL, -- 操作: read/write/delete
  description VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permission_tenant ON permission(tenant_id);
CREATE INDEX idx_permission_resource ON permission(resource);
```

#### 4.1.9 user_role (用户角色关联表)

```sql
CREATE TABLE user_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user(id),
  role_id UUID NOT NULL REFERENCES role(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_role_user ON user_role(user_id);
CREATE INDEX idx_user_role_role ON user_role(role_id);
```

#### 4.1.10 role_permission (角色权限关联表)

```sql
CREATE TABLE role_permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role(id),
  permission_id UUID NOT NULL REFERENCES permission(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_role_permission_role ON role_permission(role_id);
CREATE INDEX idx_role_permission_permission ON role_permission(permission_id);
```

### 4.2 数据库约束

| 约束 | 说明 |
|------|------|
| **租户隔离** | 所有表强制携带tenant_id |
| **逻辑删除** | 流程模板、API配置、任务记录禁止物理删除 |
| **加密存储** | 密码、API Token、代理信息加密存储 |
| **索引优化** | 关键查询字段建立索引 |

## 5. API接口设计

### 5.1 RESTful API规范

**基础路径**: `http://127.0.0.1:3000/api/v1`

**统一响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1234567890
}
```

**错误响应格式**:
```json
{
  "code": 400,
  "message": "error message",
  "error": "ERROR_CODE",
  "timestamp": 1234567890
}
```

### 5.2 核心API接口

#### 5.2.1 租户管理API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建租户 | POST | `/tenants` | 创建新租户 |
| 获取租户列表 | GET | `/tenants` | 获取租户列表 |
| 获取租户详情 | GET | `/tenants/:id` | 获取租户详情 |
| 更新租户 | PUT | `/tenants/:id` | 更新租户信息 |
| 删除租户 | DELETE | `/tenants/:id` | 删除租户(逻辑删除) |

#### 5.2.2 流程模板API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建流程模板 | POST | `/processes` | 创建流程模板 |
| 获取流程模板列表 | GET | `/processes` | 获取流程模板列表 |
| 获取流程模板详情 | GET | `/processes/:id` | 获取流程模板详情 |
| 更新流程模板 | PUT | `/processes/:id` | 更新流程模板 |
| 删除流程模板 | DELETE | `/processes/:id` | 删除流程模板(逻辑删除) |

#### 5.2.3 API数据源API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建API数据源 | POST | `/api-sources` | 创建API数据源 |
| 获取API数据源列表 | GET | `/api-sources` | 获取API数据源列表 |
| 获取API数据源详情 | GET | `/api-sources/:id` | 获取API数据源详情 |
| 更新API数据源 | PUT | `/api-sources/:id` | 更新API数据源 |
| 删除API数据源 | DELETE | `/api-sources/:id` | 删除API数据源(逻辑删除) |

#### 5.2.4 任务调度API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建任务 | POST | `/tasks` | 创建任务 |
| 获取任务列表 | GET | `/tasks` | 获取任务列表 |
| 获取任务详情 | GET | `/tasks/:id` | 获取任务详情 |
| 取消任务 | PUT | `/tasks/:id/cancel` | 取消任务 |
| 重试任务 | PUT | `/tasks/:id/retry` | 重试任务 |
| 批量创建任务 | POST | `/tasks/batch` | 批量创建任务 |

#### 5.2.5 任务监控API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取任务进度 | GET | `/tasks/:id/progress` | 获取任务进度 |
| 获取任务日志 | GET | `/tasks/:id/logs` | 获取任务日志 |
| 获取任务截图 | GET | `/tasks/:id/screenshots` | 获取任务截图 |
| 获取任务统计 | GET | `/tasks/stats` | 获取任务统计 |

#### 5.2.6 用户权限API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 用户登录 | POST | `/auth/login` | 用户登录 |
| 用户注册 | POST | `/auth/register` | 用户注册 |
| 获取用户信息 | GET | `/auth/user` | 获取用户信息 |
| 获取角色列表 | GET | `/roles` | 获取角色列表 |
| 获取权限列表 | GET | `/permissions` | 获取权限列表 |

### 5.3 API鉴权机制

**鉴权方式**: JWT Token

**请求头**:
```
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Token有效期**: 24小时

**刷新机制**: Token过期前30分钟可刷新

## 6. 防风控设计

### 6.1 WZWS绕过能力清单

| 能力 | 实现方式 | 优先级 |
|------|----------|--------|
| **cdc变量删除** | 定制Chromium内核 | P0 |
| **AutomationControlled禁用** | 启动参数+注入脚本 | P0 |
| **webdriver隐藏** | 注入脚本 | P0 |
| **Stealth指纹抹平** | playwright-stealth插件 | P0 |
| **真人鼠标轨迹** | 贝塞尔曲线+随机停顿 | P0 |
| **真人键盘输入** | 随机输入间隔 | P0 |
| **真人浏览行为** | 自然滚动+前置浏览 | P0 |
| **JA3指纹对齐** | TLS配置 | P1 |
| **请求头标准化** | 真人请求头模板 | P1 |

### 6.2 Chromium启动参数固化

```javascript
const launchOptions = {
  headless: "new", // 新版无头模式
  executablePath: getChromiumPath(), // 内置定制Chromium
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--allow-running-insecure-content',
    '--disable-webgl',
    '--disable-canvas-aa',
    '--disable-2d-canvas-clip-aa',
    '--disable-gl-drawing-for-tests',
    '--disable-gl-extensions',
    '--disable-gpu-driver-bug-workarounds',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-background-networking',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-client-side-phishing-detection',
    '--disable-session-crashed-bubble',
    '--disable-autofill',
    '--disable-translate',
    '--disable-notifications',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--force-device-scale-factor=1',
    '--window-size=1920,1080'
  ],
  ignoreDefaultArgs: ['--enable-automation'],
  userDataDir: getSessionDir(), // 独立userDataDir
  proxy: getProxyConfig() // 独立代理
};
```

### 6.3 真人行为仿真参数

| 参数 | 值 | 说明 |
|------|------|------|
| **鼠标移动速度** | 200-500ms | 贝塞尔曲线移动 |
| **鼠标停顿概率** | 30% | 随机停顿 |
| **键盘输入间隔** | 50-150ms | 随机间隔 |
| **页面滚动速度** | 100-300ms | 自然滚动 |
| **前置浏览时间** | 2-5s | 模拟真人浏览 |
| **页面停留时间** | 3-10s | 随机停留 |

## 7. 性能设计

### 7.1 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **单进程内存** | < 500MB | Chromium进程内存上限 |
| **并发任务数** | ≤ 10 | 单租户并发上限 |
| **任务启动时间** | < 3s | 任务启动延迟 |
| **任务执行时间** | < 30s | 单任务执行时间 |
| **会话复用率** | > 80% | 会话缓存复用率 |
| **任务成功率** | > 95% | 任务执行成功率 |

### 7.2 性能优化策略

| 策略 | 说明 |
|------|------|
| **进程池管理** | 预启动进程池,减少启动延迟 |
| **会话缓存复用** | 避免重复登录,提高效率 |
| **任务队列调度** | 合理分配任务,避免资源竞争 |
| **资源强制回收** | 任务结束强制清理进程和缓存 |
| **并发限制** | 控制并发数,防止资源耗尽 |

## 8. 安全设计

### 8.1 安全机制

| 机制 | 说明 |
|------|------|
| **本地监听** | 所有服务仅127.0.0.1监听 |
| **JWT鉴权** | 所有API接口强制鉴权 |
| **租户隔离** | 数据严格隔离,禁止跨租户访问 |
| **数据加密** | 密码、Token、代理信息AES-256-GCM加密 |
| **敏感数据脱敏** | 前台展示脱敏处理 |
| **权限控制** | RBAC权限体系 |

### 8.2 加密方案

**加密算法**: AES-256-GCM

**加密字段**:
- 用户密码
- API Token
- 代理信息
- 业务API密钥

**密钥管理**:
- 主密钥存储在环境变量
- 每个租户独立密钥
- 密钥定期轮换

## 9. 跨端统一设计

### 9.1 跨端一致性保证

| 维度 | 统一策略 |
|------|----------|
| **代码逻辑** | 统一代码库,无平台分支 |
| **配置参数** | 统一配置文件,无平台差异 |
| **Chromium内核** | 三端独立内核,但特征统一 |
| **执行延时** | 统一延时规则 |
| **指纹参数** | 统一指纹配置 |
| **流程解析** | 统一解析规则 |

### 9.2 三端打包策略

| 平台 | 打包产物 | 架构 |
|------|----------|------|
| **Windows** | exe安装包 | x64 |
| **macOS** | dmg镜像包 | x64/arm64 |
| **Ubuntu** | deb安装包 | x64/arm64 |

**打包命令**:
```bash
# Windows
tauri build --target x86_64-pc-windows-msvc

# macOS
tauri build --target x86_64-apple-darwin
tauri build --target aarch64-apple-darwin

# Ubuntu
tauri build --target x86_64-unknown-linux-gnu
tauri build --target aarch64-unknown-linux-gnu
```

## 10. 技术选型总结

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| **桌面端壳** | Tauri | v2.0.0-beta.28 | 轻量、无冗余、跨端一致 |
| **自动化内核** | Playwright-Core | 1.45.3 | 无webdriver特征、支持定制内核 |
| **后端框架** | NestJS | 10.3.0 | 模块化、依赖注入、易维护 |
| **前端框架** | Vue3 | 3.4.15 | 组件成熟、开发效率高 |
| **任务队列** | BullMQ | 5.12.0 | 支持延迟、定时、重试、并发 |
| **数据库** | PostgreSQL | 15.8 | 稳定、事务强、适合结构化数据 |
| **缓存** | Redis | 7.0.15 | 任务状态持久化 |
| **加密** | AES-256-GCM | - | 强加密算法 |

---

**架构师**: Architect
**创建日期**: 2026-06-23
**最后更新**: 2026-06-23