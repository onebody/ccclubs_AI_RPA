"""
应用配置管理
使用 pydantic-settings 从环境变量/.env 文件加载配置
"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置"""

    # 应用基础配置
    APP_NAME: str = "rpa-browser-v3"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # FastAPI 服务配置
    SERVER_HOST: str = "127.0.0.1"
    SERVER_PORT: int = 8900

    # PostgreSQL 数据库配置
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 5432
    DB_NAME: str = "rpa_browser_v3"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    # Playwright 浏览器配置
    BROWSER_HEADLESS: bool = False
    BROWSER_SLOW_MO: int = 50
    CHROMIUM_PATH: str = ""

    # 数据存储路径
    DATA_DIR: str = "../data"
    STORAGE_STATE_DIR: str = "../data/storage_states"
    EXPORT_DIR: str = "../data/exports"

    # 安全配置
    API_KEY: str = ""
    ENCRYPTION_KEY: str = ""

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = "../data/logs"

    @property
    def database_url(self) -> str:
        """生成异步 PostgreSQL 连接 URL"""
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def storage_state_path(self) -> Path:
        """登录态持久化目录"""
        path = Path(self.STORAGE_STATE_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def export_path(self) -> Path:
        """数据导出目录"""
        path = Path(self.EXPORT_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 全局配置单例
settings = Settings()
