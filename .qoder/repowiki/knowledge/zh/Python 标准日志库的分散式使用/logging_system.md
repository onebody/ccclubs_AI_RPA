### 1. 系统/方法概述
该仓库在后端服务（`CCC_RPA_API`）中采用 Python 标准库 `logging` 模块进行日志记录。未引入第三方日志框架（如 `loguru` 或 `structlog`），也未在应用启动处（`main.py`）进行统一的日志配置（如 `logging.basicConfig` 或字典配置）。日志行为主要依赖 Python 默认的 `WARNING` 级别输出到标准错误流（stderr）。

### 2. 关键文件与包
核心日志逻辑分散在以下模块中，均通过 `logging.getLogger(__name__)` 获取 logger 实例：
- **自动化行为模拟**: `CCC_RPA_API/app/browser/human_behavior.py` - 记录点击、滚动、等待等模拟人类行为的调试信息。
- **站点自动化交互**: `CCC_RPA_API/app/browser/site_automation.py` - 记录导航、二维码截取、单位列表抓取等关键业务流程的状态与异常。
- **任务执行引擎**: `CCC_RPA_API/app/services/executor.py` - 记录任务生命周期（开始、完成、失败）、浏览器恢复状态及业务处理结果。
- **执行等待控制**: `CCC_RPA_API/app/browser/waiter.py` - 记录用户交互等待的阻塞与唤醒事件。
- **会话管理**: `CCC_RPA_API/app/browser/session_manager.py` - **例外情况**，该文件混用了 `print()` 函数进行初始化状态的输出，且部分逻辑引用了未定义的 `logger` 变量（潜在运行时错误）。

### 3. 架构与约定
- **模块化 Logger**: 遵循 Python 惯例，每个模块独立创建 logger，名称对应模块路径（如 `app.browser.site_automation`）。
- **日志级别策略**:
  - `DEBUG`: 用于高频操作细节（如鼠标坐标、滚动像素、随机延迟时间）。
  - `INFO`: 用于关键业务节点（如“二维码已加载”、“登录成功”、“任务执行完成”）。
  - `WARNING`: 用于非致命异常或降级处理（如“检查登录状态失败”、“降级为整页截图”）。
  - `ERROR`: 用于导致流程中断的严重错误（如“导航完全失败”、“任务执行异常”）。
- **缺乏统一配置**: 由于缺少全局配置，生产环境中可能无法直接捕获 `DEBUG` 和 `INFO` 级别的日志，且日志格式仅为默认的 `level:name:message`，缺乏时间戳、线程 ID 或请求上下文等结构化字段。

### 4. 开发者应遵循的规则
- **禁止直接使用 print**: 除 `session_manager.py` 中的遗留代码外，新代码应严格使用 `logging` 模块。
- **Logger 命名**: 必须使用 `logger = logging.getLogger(__name__)` 以确保日志层级清晰。
- **异常记录**: 在捕获异常并决定继续执行时，应使用 `logger.warning` 或 `logger.error` 并包含异常信息（如 `exc_info=True` 或在消息中嵌入 `str(e)`）。
- **敏感信息脱敏**: 记录自动化任务日志时，注意避免明文记录用户凭证或敏感的 Cookie 信息（当前代码中未见明显违规，但需保持警惕）。
- **修复潜在 Bug**: `session_manager.py` 中第 105、156、167 行使用了 `logger` 但未导入或定义，需补充 `import logging` 及 logger 初始化，否则在触发浏览器恢复逻辑时会抛出 `NameError`。