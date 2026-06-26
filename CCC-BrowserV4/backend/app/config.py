"""应用配置管理"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置，从 .env 文件和环境变量读取"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # 数据库类型: mysql / sqlite
    DB_TYPE: str = "mysql"

    # MySQL 配置
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USERNAME: str = "root"
    DB_PASSWORD: str = ""
    DB_DATABASE: str = "ccc_browser"

    @property
    def mysql_dsn(self) -> str:
        """构建 MySQL 连接字符串"""
        return (
            f"mysql+pymysql://{self.DB_USERNAME}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"
            f"?charset=utf8mb4"
        )

    @property
    def sqlite_path(self) -> Path:
        """SQLite 数据库文件路径"""
        return Path(__file__).resolve().parent.parent / "data" / "ccc_browser.db"

    @property
    def database_url(self) -> str:
        """根据 DB_TYPE 返回数据库连接 URL"""
        if self.DB_TYPE == "mysql":
            return self.mysql_dsn
        return f"sqlite:///{self.sqlite_path}"


# 全局配置单例
settings = Settings()
