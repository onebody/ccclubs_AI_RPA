"""健康检查接口"""

from fastapi import APIRouter

from app.database import check_connection

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """健康检查：返回服务状态和数据库连接状态"""
    db_ok = check_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }
