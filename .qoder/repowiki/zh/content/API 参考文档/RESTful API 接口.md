# RESTful API 接口

<cite>
**本文引用的文件**
- [app/main.py](file://app/main.py)
- [app/api/tasks.py](file://app/api/tasks.py)
- [app/api/auth.py](file://app/api/auth.py)
- [app/services/task.py](file://app/services/task.py)
- [app/services/auth.py](file://app/services/auth.py)
- [app/models/task.py](file://app/models/task.py)
- [app/models/execution_log.py](file://app/models/execution_log.py)
- [app/schemas/task.py](file://app/schemas/task.py)
- [app/schemas/execution_log.py](file://app/schemas/execution_log.py)
- [app/schemas/auth.py](file://app/schemas/auth.py)
- [app/database.py](file://app/database.py)
- [app/config.py](file://app/config.py)
- [CCC-RPA-API 项目说明](file://project.md)
- [前端请求封装 request.ts](file://CCC-BrowserV4/frontend/src/api/request.ts)
- [前端任务 API tasks.ts](file://CCC-BrowserV4/frontend/src/api/tasks.ts)
- [前端执行控制 API execution.ts](file://CCC-BrowserV4/frontend/src/api/execution.ts)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介
本文件为 CCC RPA 项目的 RESTful API 接口文档，覆盖任务管理、任务日志、执行控制与认证相关接口。文档说明每个接口的 HTTP 方法、URL 路径、请求参数、响应数据格式、状态码，并提供请求与响应示例、认证方式、请求头设置、参数验证规则以及分页、过滤与排序的使用说明。

## 项目结构
- 后端采用 FastAPI，路由集中在 app/api 下，业务逻辑位于 app/services，数据模型位于 app/models，数据校验模型位于 app/schemas。
- 前端使用 axios 封装统一请求，基础路径指向 /api，便于与后端路由匹配。
- 数据库通过 SQLAlchemy 连接，支持 MySQL。

```mermaid
graph TB
subgraph "后端"
M["app/main.py<br/>应用入口与路由注册"]
TAPI["app/api/tasks.py<br/>任务接口路由"]
AAPI["app/api/auth.py<br/>认证接口路由"]
TSVC["app/services/task.py<br/>任务服务"]
ASVC["app/services/auth.py<br/>认证服务"]
MODELS["app/models/*.py<br/>ORM 模型"]
SCHEMAS["app/schemas/*.py<br/>Pydantic 校验模型"]
DB["app/database.py<br/>数据库连接"]
CFG["app/config.py<br/>配置"]
end
subgraph "前端"
REQ["frontend/src/api/request.ts<br/>axios 封装"]
TASKS["frontend/src/api/tasks.ts<br/>任务 API"]
EXEC["frontend/src/api/execution.ts<br/>执行控制 API"]
end
REQ --> TASKS
REQ --> EXEC
TASKS --> TAPI
EXEC --> TAPI
AAPI --> ASVC
TAPI --> TSVC
TSVC --> MODELS
TSVC --> SCHEMAS
ASVC --> MODELS
ASVC --> SCHEMAS
M --> TAPI
M --> AAPI
M --> DB
DB --> CFG
```

图表来源
- [app/main.py:12-27](file://app/main.py#L12-L27)
- [app/api/tasks.py:10](file://app/api/tasks.py#L10)
- [app/api/auth.py:7](file://app/api/auth.py#L7)
- [app/services/task.py:44](file://app/services/task.py#L44)
- [app/services/auth.py:6](file://app/services/auth.py#L6)
- [app/database.py:1-19](file://app/database.py#L1-L19)
- [app/config.py:6-22](file://app/config.py#L6-L22)
- [CCC-BrowserV4/frontend/src/api/request.ts:1-18](file://CCC-BrowserV4/frontend/src/api/request.ts#L1-L18)
- [CCC-BrowserV4/frontend/src/api/tasks.ts:1-41](file://CCC-BrowserV4/frontend/src/api/tasks.ts#L1-L41)
- [CCC-BrowserV4/frontend/src/api/execution.ts:1-20](file://CCC-BrowserV4/frontend/src/api/execution.ts#L1-L20)

章节来源
- [app/main.py:12-27](file://app/main.py#L12-L27)
- [app/database.py:1-19](file://app/database.py#L1-L19)
- [app/config.py:6-22](file://app/config.py#L6-L22)
- [CCC-BrowserV4/frontend/src/api/request.ts:1-18](file://CCC-BrowserV4/frontend/src/api/request.ts#L1-L18)

## 核心组件
- 任务接口模块：提供任务的增删改查、执行、日志查询及执行过程中的交互信号。
- 认证接口模块：提供登录、登出、校验接口。
- 服务层：封装数据库操作、数据转换与执行调度。
- 数据模型与 Pydantic 校验模型：定义数据库表结构与请求/响应数据格式。
- 数据库与配置：MySQL 连接、环境变量配置。

章节来源
- [app/api/tasks.py:10-76](file://app/api/tasks.py#L10-L76)
- [app/api/auth.py:7-24](file://app/api/auth.py#L7-L24)
- [app/services/task.py:44-157](file://app/services/task.py#L44-L157)
- [app/services/auth.py:6-58](file://app/services/auth.py#L6-L58)
- [app/models/task.py:8-25](file://app/models/task.py#L8-L25)
- [app/models/execution_log.py:7-17](file://app/models/execution_log.py#L7-L17)
- [app/schemas/task.py:5-58](file://app/schemas/task.py#L5-L58)
- [app/schemas/execution_log.py:4-19](file://app/schemas/execution_log.py#L4-L19)
- [app/schemas/auth.py:5-26](file://app/schemas/auth.py#L5-L26)

## 架构总览
- 应用启动时创建数据库表并进行必要的列迁移，随后注册认证与任务路由。
- 前端通过 /api 基础路径调用后端接口，后端使用依赖注入获取数据库会话，服务层负责业务逻辑与数据转换。

```mermaid
sequenceDiagram
participant FE as "前端"
participant API as "FastAPI 应用"
participant Tasks as "任务路由"
participant Auth as "认证路由"
participant Svc as "服务层"
participant DB as "数据库"
FE->>API : "GET /api/tasks"
API->>Tasks : "路由分发"
Tasks->>Svc : "查询任务列表"
Svc->>DB : "SQL 查询"
DB-->>Svc : "结果集"
Svc-->>Tasks : "格式化响应"
Tasks-->>FE : "200 OK + JSON"
FE->>API : "POST /api/auth/login"
API->>Auth : "路由分发"
Auth->>Svc : "登录处理"
Svc->>DB : "查询/创建用户"
DB-->>Svc : "用户记录"
Svc-->>Auth : "生成令牌"
Auth-->>FE : "200 OK + 登录响应"
```

图表来源
- [app/main.py:24-27](file://app/main.py#L24-L27)
- [app/api/tasks.py:13-15](file://app/api/tasks.py#L13-L15)
- [app/api/auth.py:10-12](file://app/api/auth.py#L10-L12)
- [app/services/task.py:47-64](file://app/services/task.py#L47-L64)
- [app/services/auth.py:9-38](file://app/services/auth.py#L9-L38)

## 详细组件分析

### 认证接口
- 登录
  - 方法与路径：POST /api/auth/login
  - 请求头：Content-Type: application/json
  - 请求体字段：
    - client_id: 字符串，必填
    - token: 字符串，必填
    - device_id: 字符串，必填
    - username: 字符串，可选，默认“开发者”
  - 成功响应字段：
    - userId: 字符串
    - username: 字符串
    - token: 字符串
  - 状态码：200 成功；422 参数校验失败；500 服务器错误
  - 示例请求（JSON）：
    {
      "client_id": "your_client_id",
      "token": "your_token",
      "device_id": "device_001",
      "username": "张三"
    }
  - 示例响应（JSON）：
    {
      "userId": "user_abc",
      "username": "张三",
      "token": "login_token_123"
    }

- 登出
  - 方法与路径：POST /api/auth/logout
  - 请求体字段：
    - userId: 字符串，必填
  - 成功响应：{"message": "登出成功"}
  - 状态码：200 成功；422 参数校验失败；500 服务器错误

- 校验
  - 方法与路径：GET /api/auth/verify?userId={userId}
  - 查询参数：
    - userId: 字符串，必填
  - 成功响应字段：
    - valid: 布尔
    - userId: 字符串，可选
    - username: 字符串，可选
  - 状态码：200 成功；422 参数校验失败；500 服务器错误

章节来源
- [app/api/auth.py:10-23](file://app/api/auth.py#L10-L23)
- [app/schemas/auth.py:5-26](file://app/schemas/auth.py#L5-L26)
- [app/services/auth.py:9-57](file://app/services/auth.py#L9-L57)

### 任务管理接口
- 获取任务列表
  - 方法与路径：GET /api/tasks
  - 查询参数：
    - keyword: 字符串，可选，按任务名称模糊搜索
    - status: 字符串，可选，按状态过滤
    - page: 整数，可选，默认 1
    - page_size: 整数，可选，默认 20
  - 成功响应字段：
    - items: 数组，元素为任务对象
    - total: 整数，总数
    - page: 整数，当前页
    - page_size: 整数，页大小
  - 任务对象字段：
    - id: 整数
    - name: 字符串
    - status: 字符串，枚举：pending/running/completed/failed
    - tenantId: 字符串，可选
    - deviceId: 字符串，可选
    - customerName: 字符串，可选
    - handlerAccount: 字符串，可选
    - subTasks: 数组，字符串，可选
    - province: 字符串，可选
    - lastExecutedAt: 字符串，日期时间，可选
    - nextExecutedAt: 字符串，日期时间，可选
    - lastResult: 字符串，枚举：success/failed/None，可选
    - remark: 字符串，可选
    - deleted: 布尔
    - createdAt: 字符串，日期时间
    - updatedAt: 字符串，日期时间
  - 状态码：200 成功；422 参数校验失败；500 服务器错误
  - 示例请求：GET /api/tasks?keyword=采集&status=pending&page=1&page_size=20
  - 示例响应（片段）：
    {
      "items": [
        {
          "id": 1,
          "name": "企业信息采集",
          "status": "pending",
          "tenantId": "t_001",
          "deviceId": "d_001",
          "customerName": "默认客户",
          "handlerAccount": null,
          "subTasks": ["步骤A","步骤B"],
          "province": "北京",
          "lastExecutedAt": "",
          "nextExecutedAt": "",
          "lastResult": null,
          "remark": "定期采集企业工商信息变更",
          "deleted": false,
          "createdAt": "2025-01-01 12:00:00",
          "updatedAt": "2025-01-01 12:00:00"
        }
      ],
      "total": 1,
      "page": 1,
      "page_size": 20
    }

- 创建任务
  - 方法与路径：POST /api/tasks
  - 请求体字段：
    - name: 字符串，必填
    - tenant_id: 字符串，可选
    - device_id: 字符串，可选
    - customer_name: 字符串，可选
    - handler_account: 字符串，可选
    - sub_tasks: 数组，字符串，可选
    - province: 字符串，可选
    - remark: 字符串，可选
  - 成功响应：任务对象
  - 状态码：201 成功；422 参数校验失败；500 服务器错误
  - 示例请求（JSON）：
    {
      "name": "信用数据同步",
      "tenant_id": "t_001",
      "device_id": "d_001",
      "customer_name": "客户A",
      "handler_account": "user_a",
      "sub_tasks": ["步骤1","步骤2"],
      "province": "上海",
      "remark": "同步信用中国最新数据"
    }

- 获取单个任务
  - 方法与路径：GET /api/tasks/{task_id}
  - 路径参数：
    - task_id: 整数，必填
  - 成功响应：任务对象
  - 状态码：200 成功；404 任务不存在；422 参数校验失败；500 服务器错误

- 更新任务
  - 方法与路径：PUT /api/tasks/{task_id}
  - 路径参数：
    - task_id: 整数，必填
  - 请求体字段（可选字段组合）：
    - name: 字符串
    - status: 字符串，枚举：pending/running/completed/failed
    - tenant_id: 字符串
    - device_id: 字符串
    - customer_name: 字符串
    - handler_account: 字符串
    - sub_tasks: 数组，字符串
    - province: 字符串
    - remark: 字符串
    - last_executed_at: 字符串（日期时间）
    - next_executed_at: 字符串（日期时间）
    - last_result: 字符串，枚举：success/failed/None
  - 成功响应：任务对象
  - 状态码：200 成功；404 任务不存在；422 参数校验失败；500 服务器错误

- 删除任务
  - 方法与路径：DELETE /api/tasks/{task_id}
  - 路径参数：
    - task_id: 整数，必填
  - 成功响应：{"message": "删除成功"}
  - 状态码：200 成功；404 任务不存在；500 服务器错误

- 执行任务
  - 方法与路径：POST /api/tasks/{task_id}/execute
  - 路径参数：
    - task_id: 整数，必填
  - 成功响应：任务对象（状态更新为 running）
  - 错误响应：{"detail": "任务不存在"}（400）
  - 状态码：200 成功；400 任务不存在或执行错误；500 服务器错误
  - 注意：执行后会提交到执行器，具体执行状态可通过日志接口查询。

- 获取任务日志
  - 方法与路径：GET /api/tasks/{task_id}/logs
  - 路径参数：
    - task_id: 整数，必填
  - 查询参数：
    - page: 整数，可选，默认 1
    - page_size: 整数，可选，默认 20
  - 成功响应字段：
    - items: 数组，元素为日志对象
    - total: 整数，总数
  - 日志对象字段：
    - id: 整数
    - taskId: 整数
    - taskName: 字符串
    - startedAt: 字符串，日期时间
    - finishedAt: 字符串，日期时间，可选
    - status: 字符串，枚举：running/completed/failed
    - resultMessage: 字符串，可选
  - 状态码：200 成功；422 参数校验失败；500 服务器错误
  - 示例响应（片段）：
    {
      "items": [
        {
          "id": 101,
          "taskId": 1,
          "taskName": "企业信息采集",
          "startedAt": "2025-01-01 13:00:00",
          "finishedAt": "2025-01-01 13:05:00",
          "status": "completed",
          "resultMessage": "执行成功"
        }
      ],
      "total": 1
    }

- 扫码完成信号
  - 方法与路径：POST /api/tasks/{task_id}/scan-complete
  - 路径参数：
    - task_id: 整数，必填
  - 成功响应：{"success": true}
  - 状态码：200 成功；500 服务器错误

- 选择公司
  - 方法与路径：POST /api/tasks/{task_id}/select-company
  - 路径参数：
    - task_id: 整数，必填
  - 请求体字段：
    - company_id: 字符串，必填
    - company_name: 字符串，必填
  - 成功响应：{"success": true}
  - 状态码：200 成功；500 服务器错误

- 取消执行
  - 方法与路径：POST /api/tasks/{task_id}/cancel-execution
  - 路径参数：
    - task_id: 整数，必填
  - 成功响应：{"success": true}
  - 状态码：200 成功；500 服务器错误

章节来源
- [app/api/tasks.py:13-76](file://app/api/tasks.py#L13-L76)
- [app/schemas/task.py:5-58](file://app/schemas/task.py#L5-L58)
- [app/schemas/execution_log.py:4-19](file://app/schemas/execution_log.py#L4-L19)
- [app/services/task.py:47-157](file://app/services/task.py#L47-L157)
- [app/models/task.py:8-25](file://app/models/task.py#L8-L25)
- [app/models/execution_log.py:7-17](file://app/models/execution_log.py#L7-L17)

### 执行状态接口
- WebSocket 实时通道
  - 路径：/ws
  - 用途：用于推送执行状态、页面截图、操作日志、AI 执行结果等实时消息。
  - 说明：该通道用于与浏览器会话相关的实时通信，不在本节的 HTTP 接口范围内。

章节来源
- [app/main.py:119-127](file://app/main.py#L119-L127)

## 依赖关系分析
- 路由依赖：app/main.py 注册了认证与任务路由。
- 服务依赖：任务与认证服务依赖 SQLAlchemy 会话与模型。
- 数据模型：任务与执行日志模型定义字段与索引。
- 前端依赖：前端通过 axios 封装统一请求，基础路径为 /api。

```mermaid
graph LR
MAIN["app/main.py"] --> AUTH["app/api/auth.py"]
MAIN --> TASKS["app/api/tasks.py"]
TASKS --> SVC_TASK["app/services/task.py"]
AUTH --> SVC_AUTH["app/services/auth.py"]
SVC_TASK --> MODEL_TASK["app/models/task.py"]
SVC_TASK --> MODEL_LOG["app/models/execution_log.py"]
SVC_AUTH --> MODEL_USER["app/models/user.py"]
SVC_TASK --> SCHEMA_TASK["app/schemas/task.py"]
SVC_TASK --> SCHEMA_LOG["app/schemas/execution_log.py"]
SVC_AUTH --> SCHEMA_AUTH["app/schemas/auth.py"]
MAIN --> DB["app/database.py"]
DB --> CFG["app/config.py"]
FE_REQ["frontend/src/api/request.ts"] --> FE_TASKS["frontend/src/api/tasks.ts"]
FE_REQ --> FE_EXEC["frontend/src/api/execution.ts"]
```

图表来源
- [app/main.py:24-27](file://app/main.py#L24-L27)
- [app/api/tasks.py:10](file://app/api/tasks.py#L10)
- [app/api/auth.py:7](file://app/api/auth.py#L7)
- [app/services/task.py:44](file://app/services/task.py#L44)
- [app/services/auth.py:6](file://app/services/auth.py#L6)
- [app/models/task.py:8-25](file://app/models/task.py#L8-L25)
- [app/models/execution_log.py:7-17](file://app/models/execution_log.py#L7-L17)
- [app/schemas/task.py:5-58](file://app/schemas/task.py#L5-L58)
- [app/schemas/execution_log.py:4-19](file://app/schemas/execution_log.py#L4-L19)
- [app/schemas/auth.py:5-26](file://app/schemas/auth.py#L5-L26)
- [app/database.py:1-19](file://app/database.py#L1-L19)
- [app/config.py:6-22](file://app/config.py#L6-L22)
- [CCC-BrowserV4/frontend/src/api/request.ts:1-18](file://CCC-BrowserV4/frontend/src/api/request.ts#L1-L18)
- [CCC-BrowserV4/frontend/src/api/tasks.ts:1-41](file://CCC-BrowserV4/frontend/src/api/tasks.ts#L1-L41)
- [CCC-BrowserV4/frontend/src/api/execution.ts:1-20](file://CCC-BrowserV4/frontend/src/api/execution.ts#L1-L20)

章节来源
- [app/main.py:24-27](file://app/main.py#L24-L27)
- [app/database.py:1-19](file://app/database.py#L1-L19)
- [app/config.py:6-22](file://app/config.py#L6-L22)
- [CCC-BrowserV4/frontend/src/api/request.ts:1-18](file://CCC-BrowserV4/frontend/src/api/request.ts#L1-L18)

## 性能考虑
- 分页与排序：接口支持 page/page_size 与默认降序排序（任务按 id 降序），避免一次性返回大量数据。
- 过滤：支持按关键字与状态过滤，减少无关数据传输。
- 数据库索引：任务表对 name、status、deleted 等字段建立索引，提升查询效率。
- 建议：在高频查询场景下，合理设置 page_size，避免过大页导致响应缓慢。

## 故障排除指南
- 404 任务不存在：当请求的任务 ID 不存在或已被软删除时，返回 404 或错误详情。
- 400 执行错误：执行任务时若前置检查失败，返回 400 与错误详情。
- 422 参数校验失败：请求体或查询参数不符合 Pydantic 校验规则。
- 500 服务器错误：数据库异常、执行器未就绪等。

章节来源
- [app/api/tasks.py:26-28](file://app/api/tasks.py#L26-L28)
- [app/api/tasks.py:42-44](file://app/api/tasks.py#L42-L44)
- [app/api/tasks.py:50-51](file://app/api/tasks.py#L50-L51)
- [app/schemas/task.py:5-58](file://app/schemas/task.py#L5-L58)

## 结论
本接口文档覆盖了任务管理、任务日志、执行控制与认证的核心 HTTP 接口，明确了请求参数、响应格式、状态码与分页/过滤/排序的使用方式。前端通过统一的 axios 封装与后端路由保持一致，便于集成与扩展。

## 附录

### 认证与请求头
- 基础路径：/api
- 请求头：Content-Type: application/json
- 认证方式：后端提供登录/登出/校验接口，前端可参考认证接口进行用户态管理。

章节来源
- [app/api/auth.py:10-23](file://app/api/auth.py#L10-L23)
- [CCC-BrowserV4/frontend/src/api/request.ts:1-18](file://CCC-BrowserV4/frontend/src/api/request.ts#L1-L18)

### 数据模型概览
```mermaid
erDiagram
TASK {
int id PK
string name
string status
string tenant_id
string device_id
string customer_name
string handler_account
text sub_tasks
string province
datetime last_executed_at
datetime next_executed_at
string last_result
text remark
boolean deleted
}
EXECUTION_LOG {
int id PK
int task_id FK
string task_name
datetime started_at
datetime finished_at
string status
text result_message
}
TASK ||--o{ EXECUTION_LOG : "has logs"
```

图表来源
- [app/models/task.py:8-25](file://app/models/task.py#L8-L25)
- [app/models/execution_log.py:7-17](file://app/models/execution_log.py#L7-L17)

### 前端调用示例
- 任务列表：GET /api/tasks?keyword=&status=&page=1&page_size=20
- 创建任务：POST /api/tasks
- 更新任务：PUT /api/tasks/{task_id}
- 删除任务：DELETE /api/tasks/{task_id}
- 执行任务：POST /api/tasks/{task_id}/execute
- 任务日志：GET /api/tasks/{task_id}/logs?page=1&page_size=20
- 扫码完成：POST /api/tasks/{task_id}/scan-complete
- 选择公司：POST /api/tasks/{task_id}/select-company
- 取消执行：POST /api/tasks/{task_id}/cancel-execution

章节来源
- [CCC-BrowserV4/frontend/src/api/tasks.ts:5-40](file://CCC-BrowserV4/frontend/src/api/tasks.ts#L5-L40)
- [CCC-BrowserV4/frontend/src/api/execution.ts:4-19](file://CCC-BrowserV4/frontend/src/api/execution.ts#L4-L19)
- [CCC-BrowserV4/frontend/src/api/request.ts:1-18](file://CCC-BrowserV4/frontend/src/api/request.ts#L1-L18)

### 与项目说明的对照
- 项目说明中描述了统一 RESTful/WS API 网关规范与对外接口清单，本仓库实现了任务与认证相关接口，符合统一标准。

章节来源
- [project.md:447-462](file://project.md#L447-L462)