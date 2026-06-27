CCC RPA 自动化平台采用多语言混合架构，针对不同技术栈实施了标准化的依赖管理策略：

### 1. Python 后端 (FastAPI)
- **管理工具**：使用 `requirements.txt` 进行依赖声明。
- **版本控制**：采用**严格版本锁定**（Pinned Versions），例如 `fastapi==0.115.0`、`sqlalchemy==2.0.35`。这种做法确保了开发环境与生产环境的一致性，避免了因依赖库自动升级导致的兼容性问题。
- **核心依赖**：
  - Web 框架：`fastapi`, `uvicorn`
  - 数据库：`sqlalchemy`, `pymysql`
  - 自动化引擎：`playwright`, `playwright-stealth`
  - 配置管理：`pydantic-settings`, `python-dotenv`

### 2. 前端交互层 (Vue 3 + Tauri)
- **包管理器**：使用 `npm` 配合 `package-lock.json` (lockfileVersion 3) 确保依赖树确定性。
- **镜像源配置**：通过 `package-lock.json` 可见，项目配置了国内镜像源（如 `https://registry.npmmirror.com`），以加速依赖下载并提高网络稳定性。
- **核心依赖**：
  - 框架：`vue`, `vue-router`, `pinia`
  - UI 组件：`element-plus`
  - 桌面桥接：`@tauri-apps/api`, `@tauri-apps/cli`

### 3. 桌面原生层 (Rust/Tauri)
- **构建系统**：基于 `Cargo` 生态，通过 `Cargo.toml` 声明依赖，利用 `Cargo.lock` 锁定全量依赖图（包括间接依赖）。
- **插件化架构**：深度集成 Tauri v2 插件体系，如 `tauri-plugin-shell`、`tauri-plugin-store` 和 `tauri-plugin-opener`，实现了原生能力的安全调用。
- **异步运行时**：引入 `tokio` 作为核心异步运行时，支撑高并发任务处理。

### 4. 基础设施与外部服务
- **容器化依赖**：通过 `docker-compose.yml` 管理 MySQL 8.4 数据库服务，实现了数据持久化（`mysql_data` volume）与环境隔离。
- **环境配置**：各模块均配备 `.env.example`，规范了敏感信息（如数据库凭证、API 密钥）的管理流程。

### 开发者规范
- **禁止手动修改 Lock 文件**：严禁直接编辑 `package-lock.json` 或 `Cargo.lock`，应通过官方命令（`npm install`, `cargo update`）更新依赖。
- **同步更新示例文件**：新增环境变量时，必须同步更新 `.env.example` 以保持文档一致性。
- **跨模块版本对齐**：注意 `CCC-BrowserV4/backend` 与 `CCC_RPA_API` 之间 Python 依赖的版本差异（如 `sqlalchemy`），建议在后续迭代中统一基础库版本以降低维护成本。