### 1. 总体策略
该仓库采用**分层错误处理**策略，结合了 HTTP 状态码、通用异常捕获以及前端状态降级（Fallback）。
- **后端 (FastAPI)**：依赖 `HTTPException` 进行 API 级别的错误响应，使用原生 `Exception` 和 `ValueError` 处理业务逻辑与自动化流程中的异常。
- **前端 (Vue3 + Tauri)**：通过 Axios 拦截器统一捕获网络错误，并在 Store 层实现“演示模式”作为后端不可用时的容错机制。
- **自动化引擎**：在多线程环境下通过 `try-except` 块保护执行流，确保任务失败时能正确更新数据库状态并广播错误消息。

### 2. 核心实现细节

#### 后端 API 层 (`CCC_RPA_API/app/api/`)
- **HTTP 异常映射**：在 `tasks.py` 中，当资源未找到或操作失败时，直接抛出 `HTTPException`。例如：
  - `404 Not Found`：用于任务不存在的情况。
  - `400 Bad Request`：用于任务执行启动失败，并将底层错误信息传递给前端。
- **服务层封装**：`TaskService.execute_task` 采用 `(result, error)` 元组返回模式，将底层异常转换为字符串错误信息，由 API 层决定如何抛出 `HTTPException`。

#### 自动化执行引擎 (`CCC_RPA_API/app/services/executor.py`)
- **线程安全与异常隔离**：任务在独立线程池 `_executor` 中运行。主逻辑被包裹在大型 `try-except Exception` 块中。
- **状态同步**：一旦捕获到异常（如扫码超时、浏览器崩溃），引擎会：
  1. 记录日志 (`logger.error`)。
  2. 更新数据库中的任务状态为 `failed`。
  3. 通过 WebSocket (`_broadcast`) 向客户端推送 `execution_error` 事件。
- **特定异常定义**：使用 `TimeoutError` 处理等待超时，使用自定义 `Exception("用户取消执行")` 处理中断信号。

#### 浏览器自动化层 (`CCC_RPA_API/app/browser/`)
- **防御性编程**：在 `site_automation.py` 和 `session_manager.py` 中大量使用 `try-except Exception` 来应对 Playwright 操作的不确定性（如元素未找到、页面跳转失败）。
- **静默失败与恢复**：部分非关键步骤（如数据库迁移、会话保存）在失败时会捕获异常并忽略或仅打印警告，以保证主流程不中断。

#### 前端容错 (`CCC-BrowserV4/frontend/`)
- **全局拦截**：`request.ts` 中的 Axios 响应拦截器负责记录所有 API 请求失败。
- **业务降级**：`execution.ts` Store 中实现了 `isDemo` 标志。当 API 调用（如 `scanComplete`）失败时，自动切换到模拟流程，确保用户在离线或后端故障时仍能体验完整交互。

### 3. 开发者规范
- **API 错误**：在 API 路由中应优先使用 `HTTPException` 并携带明确的 `detail` 信息。
- **引擎异常**：在执行器中捕获异常后，必须确保通过 WebSocket 通知前端，避免前端处于“加载中”的死锁状态。
- **资源清理**：在 `finally` 块中执行资源释放（如关闭数据库会话 `db.close()`、清理等待信号 `ExecutionWaiter.cleanup`）。
- **避免裸奔**：严禁在生产代码中使用空的 `except: pass`，除非是明确的兼容性检查（如数据库列存在性检查）。
