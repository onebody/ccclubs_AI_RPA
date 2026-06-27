### 1. 核心系统与工具
本项目采用 **Pydantic Settings** (`pydantic_settings`) 作为后端配置管理的核心框架，结合 **Tauri 原生配置** (`tauri.conf.json`) 和 **Vite 环境变量** 机制，构建了分层、多环境的配置体系。

- **后端 (FastAPI)**: 使用 `BaseSettings` 自动从 `.env` 文件和环境变量中加载配置，支持类型校验和默认值回退。
- **桌面端 (Tauri)**: 通过 `tauri.conf.json` 管理应用元数据、窗口行为及安全策略（CSP）。
- **前端 (Vue3/Vite)**: 利用 Vite 的 `envPrefix` 机制隔离环境变量，并通过 `vite.config.ts` 中的代理配置处理开发环境的服务转发。

### 2. 关键配置文件
- **后端配置逻辑**: 
  - `CCC-BrowserV4/backend/app/config.py`: 定义了 `Settings` 类，支持 MySQL/SQLite 动态切换，通过 `@property` 动态构建 DSN。
  - `CCC_RPA_API/app/config.py`: 类似的配置结构，专注于 MySQL 连接字符串的生成。
- **环境变量模板**: 
  - `CCC-BrowserV4/backend/.env.example`
  - `CCC_RPA_API/.env.example`
- **Tauri 应用配置**: 
  - `CCC-BrowserV4/src-tauri/tauri.conf.json`: 定义产品名称、版本、构建命令及 CSP 安全策略。
- **前端构建配置**: 
  - `CCC-BrowserV4/frontend/vite.config.ts`: 配置开发服务器端口、API 代理及环境变量前缀。

### 3. 架构设计与约定
- **配置单例模式**: 两个后端模块均在 `config.py` 中实例化全局 `settings` 对象，确保配置在应用生命周期内的一致性。
- **敏感信息隔离**: 数据库密码等敏感信息通过 `.env` 文件管理，且 `.env` 已被加入 `.gitignore`，仅提交 `.env.example` 作为模板。
- **动态数据库适配**: `CCC-BrowserV4` 的后端配置支持通过 `DB_TYPE` 环境变量在 MySQL 和 SQLite 之间无缝切换，增强了本地开发与生产部署的灵活性。
- **安全策略显式化**: Tauri 配置中明确限制了 `connect-src`，仅允许连接到本地后端及指定的认证域名，防止非法外联。

### 4. 开发者规范
- **新增配置项**: 应在 `app/config.py` 的 `Settings` 类中添加字段，并同步更新 `.env.example` 文件。
- **环境变量命名**: 遵循全大写加下划线规范（如 `DB_HOST`），前端环境变量必须以 `VITE_` 或 `TAURI_` 开头才能被正确注入。
- **本地开发**: 复制 `.env.example` 为 `.env` 并填入真实凭证，严禁将包含真实密码的 `.env` 文件提交至版本控制系统。