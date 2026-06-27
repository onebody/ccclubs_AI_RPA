# SidePanel 侧边面板模块

<cite>
**本文档引用的文件**
- [ExecutionPanel.vue](file://CCC-BrowserV4/frontend/src/components/ExecutionPanel.vue)
- [execution.ts](file://CCC-BrowserV4/frontend/src/stores/execution.ts)
- [execution.ts](file://CCC-BrowserV4/frontend/src/types/execution.ts)
- [execution.ts](file://CCC-BrowserV4/frontend/src/api/execution.ts)
- [TaskPage.vue](file://CCC-BrowserV4/frontend/src/pages/TaskPage.vue)
- [ws.ts](file://CCC-BrowserV4/frontend/src/api/ws.ts)
- [execution-log.ts](file://CCC-BrowserV4/frontend/src/types/execution-log.ts)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概览](#架构概览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)

## 简介

SidePanel 侧边面板模块是 CCC-BrowserV4 项目中的核心执行控制组件，负责管理人工操作页面、自然语言 AI 指令输入、实时查看会话日志与截图、一键录制人工操作生成 Playwright 脚本、加密导出会话登录快照等高级功能。该模块采用 Vue 3 Composition API 和 Pinia 状态管理，结合 WebSocket 实现实时通信，为用户提供完整的 RPA 执行监控和控制体验。

## 项目结构

SidePanel 模块在项目中的组织结构如下：

```mermaid
graph TB
subgraph "前端模块结构"
A[TaskPage.vue] --> B[ExecutionPanel.vue]
C[execution.ts Store] --> D[execution.ts API]
E[execution.ts Types] --> F[ws.ts WebSocket]
G[execution-log.ts Types] --> H[日志显示组件]
end
subgraph "状态管理"
I[Pinia Store] --> J[执行状态管理]
K[WebSocket 连接] --> L[实时消息处理]
end
subgraph "UI 组件"
M[执行面板] --> N[步骤状态显示]
O[二维码扫描] --> P[公司选择]
Q[执行进度] --> R[结果反馈]
end
```

**图表来源**
- [TaskPage.vue:1-428](file://CCC-BrowserV4/frontend/src/pages/TaskPage.vue#L1-L428)
- [ExecutionPanel.vue:1-322](file://CCC-BrowserV4/frontend/src/components/ExecutionPanel.vue#L1-L322)
- [execution.ts:1-229](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L1-L229)

**章节来源**
- [TaskPage.vue:1-428](file://CCC-BrowserV4/frontend/src/pages/TaskPage.vue#L1-L428)
- [ExecutionPanel.vue:1-322](file://CCC-BrowserV4/frontend/src/components/ExecutionPanel.vue#L1-L322)
- [execution.ts:1-229](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L1-L229)

## 核心组件

### 执行状态管理器

执行状态管理器是整个 SidePanel 模块的核心，负责管理任务执行的完整生命周期：

```mermaid
classDiagram
class ExecutionStore {
+number taskId
+ExecutionStep step
+string message
+string qrImage
+CompanyInfo[] companies
+CompanyInfo selectedCompany
+number activeTaskId
+boolean isDemo
+handleWsMessage(msg) void
+doScanComplete() Promise
+doSelectCompany(company) Promise
+doCancel() Promise
+startExecution(id) void
+startDemo(id) Promise
+clearExecution() void
+reset() void
}
class ExecutionStep {
<<enumeration>>
idle
checking_login
qr_scanning
waiting_company
executing
keeping_alive
completed
failed
cancelled
}
class CompanyInfo {
+string id
+string name
+string creditCode
}
ExecutionStore --> ExecutionStep : uses
ExecutionStore --> CompanyInfo : manages
```

**图表来源**
- [execution.ts:6-229](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L6-L229)
- [execution.ts:1-17](file://CCC-BrowserV4/frontend/src/types/execution.ts#L1-L17)

### 执行面板组件

执行面板组件提供可视化的执行状态展示和用户交互：

```mermaid
flowchart TD
A[任务开始] --> B{检查登录状态}
B --> |需要扫码| C[显示二维码]
B --> |已登录| D[等待公司选择]
C --> E[用户扫码完成]
E --> F[验证登录状态]
F --> G[显示公司列表]
G --> H[用户选择公司]
H --> I[执行业务流程]
I --> J{业务状态}
J --> |进行中| K[保持活跃状态]
J --> |完成| L[执行完成]
J --> |失败| M[执行失败]
K --> I
```

**图表来源**
- [ExecutionPanel.vue:110-128](file://CCC-BrowserV4/frontend/src/components/ExecutionPanel.vue#L110-L128)
- [execution.ts:22-67](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L22-L67)

**章节来源**
- [execution.ts:1-229](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L1-L229)
- [ExecutionPanel.vue:1-322](file://CCC-BrowserV4/frontend/src/components/ExecutionPanel.vue#L1-L322)

## 架构概览

SidePanel 模块采用分层架构设计，实现了清晰的关注点分离：

```mermaid
graph TB
subgraph "表现层 (Presentation Layer)"
A[TaskPage.vue] --> B[ExecutionPanel.vue]
C[UI 组件库 Element Plus]
end
subgraph "状态管理层 (State Management)"
D[Pinia Store]
E[执行状态管理]
F[WebSocket 消息处理]
end
subgraph "业务逻辑层 (Business Logic)"
G[任务执行控制]
H[API 通信]
I[演示模式支持]
end
subgraph "数据访问层 (Data Access)"
J[RESTful API]
K[WebSocket 服务器]
L[本地存储]
end
A --> D
B --> D
D --> G
G --> H
H --> J
H --> K
F --> K
```

**图表来源**
- [TaskPage.vue:138-166](file://CCC-BrowserV4/frontend/src/pages/TaskPage.vue#L138-L166)
- [execution.ts:1-229](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L1-L229)
- [ws.ts:8-88](file://CCC-BrowserV4/frontend/src/api/ws.ts#L8-L88)

## 详细组件分析

### 任务执行流程控制

任务执行流程是 SidePanel 模块的核心功能，实现了完整的自动化执行控制：

```mermaid
sequenceDiagram
participant U as 用户
participant TP as TaskPage
participant ES as ExecutionStore
participant API as 后端API
participant WS as WebSocket
U->>TP : 点击执行按钮
TP->>ES : startExecution(taskId)
ES->>ES : 设置执行状态为 checking_login
ES->>API : 请求任务执行
API-->>WS : 推送 qr_code 消息
WS-->>ES : handleWsMessage(qr_code)
ES->>ES : 更新状态为 qr_scanning
ES->>U : 显示二维码
U->>ES : 完成扫码
ES->>API : scanComplete(taskId)
API-->>WS : 推送 company_list 消息
WS-->>ES : handleWsMessage(company_list)
ES->>ES : 更新状态为 waiting_company
ES->>U : 显示公司选择界面
U->>ES : 选择公司
ES->>API : selectCompany(taskId, companyId)
API-->>WS : 推送 execution_progress 消息
WS-->>ES : handleWsMessage(execution_progress)
ES->>ES : 更新状态为 executing
ES->>U : 显示执行进度
loop 业务执行循环
WS-->>ES : 推送 execution_progress
ES->>ES : 更新执行状态
ES->>U : 实时显示进度
end
WS-->>ES : 推送 task_status_update
ES->>ES : 设置最终状态
ES->>U : 显示执行结果
```

**图表来源**
- [TaskPage.vue:255-267](file://CCC-BrowserV4/frontend/src/pages/TaskPage.vue#L255-L267)
- [execution.ts:122-132](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L122-L132)
- [execution.ts:69-108](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L69-L108)
- [execution.ts:22-67](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L22-L67)

### WebSocket 实时通信机制

WebSocket 通信机制确保了执行状态的实时更新和用户交互的即时响应：

```mermaid
classDiagram
class TaskWebSocket {
-WebSocket ws
-WsHandler[] handlers
-number reconnectDelay
-boolean shouldConnect
+connect() void
-_doConnect() void
-_scheduleReconnect() void
+disconnect() void
+onMessage(handler) void
+offMessage(handler) void
}
class WsMessage {
+string type
+any data
}
class WsHandler {
<<interface>>
+(msg : WsMessage) void
}
TaskWebSocket --> WsMessage : handles
TaskWebSocket --> WsHandler : manages
```

**图表来源**
- [ws.ts:8-88](file://CCC-BrowserV4/frontend/src/api/ws.ts#L8-L88)

### 演示模式实现

演示模式提供了在后端服务不可用时的完整功能演示能力：

```mermaid
flowchart TD
A[startDemo] --> B[设置 isDemo = true]
B --> C[状态: checking_login]
C --> D[延迟 1500ms]
D --> E[生成模拟二维码]
E --> F[状态: qr_scanning]
F --> G[模拟扫码完成]
G --> H[状态: waiting_company]
H --> I[生成模拟公司列表]
I --> J[模拟执行过程]
J --> K[状态: keeping_alive]
K --> L[模拟业务执行]
L --> M[状态: completed]
```

**图表来源**
- [execution.ts:135-180](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L135-L180)

**章节来源**
- [TaskPage.vue:255-271](file://CCC-BrowserV4/frontend/src/pages/TaskPage.vue#L255-L271)
- [execution.ts:69-120](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L69-L120)
- [ws.ts:20-56](file://CCC-BrowserV4/frontend/src/api/ws.ts#L20-L56)

## 依赖关系分析

SidePanel 模块的依赖关系展现了清晰的模块化设计：

```mermaid
graph LR
subgraph "外部依赖"
A[Vue 3]
B[Element Plus]
C[Pinia]
D[WebSocket API]
end
subgraph "内部模块"
E[TaskPage]
F[ExecutionPanel]
G[ExecutionStore]
H[ExecutionAPI]
I[WebSocket Manager]
end
subgraph "类型定义"
J[ExecutionStep]
K[CompanyInfo]
L[ExecutionLog]
end
E --> F
E --> G
F --> G
G --> H
G --> I
G --> J
G --> K
I --> D
H --> A
F --> B
G --> C
```

**图表来源**
- [TaskPage.vue:144-150](file://CCC-BrowserV4/frontend/src/pages/TaskPage.vue#L144-L150)
- [ExecutionPanel.vue:113-118](file://CCC-BrowserV4/frontend/src/components/ExecutionPanel.vue#L113-L118)
- [execution.ts:1-6](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L1-L6)

**章节来源**
- [execution.ts:1-229](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L1-L229)
- [execution.ts:1-17](file://CCC-BrowserV4/frontend/src/types/execution.ts#L1-L17)

## 性能考虑

SidePanel 模块在设计时充分考虑了性能优化：

### 状态管理优化
- 使用 Pinia 的响应式状态管理，避免不必要的组件重新渲染
- 通过计算属性 `isExecuting` 提供高效的执行状态判断
- 演示模式下的本地状态模拟，减少网络请求开销

### WebSocket 连接管理
- 自动重连机制，确保连接稳定性
- 消息过滤机制，只处理相关任务的消息
- 连接池管理，避免重复连接

### UI 性能优化
- 条件渲染策略，根据执行状态动态显示相应内容
- 防抖机制用于搜索和筛选操作
- 虚拟滚动支持大量任务列表的高效渲染

## 故障排除指南

### 常见问题及解决方案

**执行状态异常**
- 症状：执行状态卡在某个步骤
- 解决方案：检查 WebSocket 连接状态，重启执行流程

**二维码显示问题**
- 症状：二维码无法正常显示或刷新
- 解决方案：验证后端二维码生成服务，检查网络连接

**公司选择功能失效**
- 症状：无法选择公司或选择后无响应
- 解决方案：确认任务状态为 `waiting_company`，检查 API 响应

**WebSocket 连接中断**
- 症状：执行状态不更新或消息延迟
- 解决方案：检查网络连接，等待自动重连或手动刷新页面

**章节来源**
- [execution.ts:22-67](file://CCC-BrowserV4/frontend/src/stores/execution.ts#L22-L67)
- [ws.ts:58-64](file://CCC-BrowserV4/frontend/src/api/ws.ts#L58-L64)

## 结论

SidePanel 侧边面板模块通过精心设计的架构和实现，为用户提供了完整的 RPA 执行控制体验。模块采用了现代化的前端技术栈，结合 WebSocket 实现实时通信，实现了从任务执行到状态监控的全流程管理。

该模块的主要优势包括：

1. **完整的执行生命周期管理**：从登录验证到业务执行的每个环节都有明确的状态控制
2. **实时通信机制**：通过 WebSocket 确保执行状态的即时更新
3. **灵活的演示模式**：在后端服务不可用时仍能提供完整的功能演示
4. **用户友好的界面设计**：直观的状态指示和操作反馈
5. **健壮的错误处理**：完善的异常处理和恢复机制

未来可以考虑的功能扩展包括：
- 增强的日志记录和分析功能
- 更丰富的会话管理和导出选项
- 支持更多类型的 AI 指令输入
- 集成更多的自动化录制和回放功能