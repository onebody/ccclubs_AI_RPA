"""
API 路由汇总
"""
from fastapi import APIRouter

from app.api.tasks import router as tasks_router
from app.api.browser import router as browser_router
from app.api.login import router as login_router
from app.api.extract import router as extract_router
from app.api.scheduler import router as scheduler_router

# 总路由
api_router = APIRouter()

# 健康检查端点
@api_router.get("/health", tags=["系统"])
async def health_check():
    """系统健康检查，供 Electron 主进程轮询"""
    return {"status": "ok", "service": "rpa-browser-v3-backend"}

# 注册子路由
api_router.include_router(browser_router, prefix="/browser", tags=["浏览器控制"])
api_router.include_router(login_router, prefix="/login", tags=["登录录制"])
api_router.include_router(extract_router, prefix="/extract", tags=["数据提取"])
api_router.include_router(scheduler_router, prefix="/schedule", tags=["调度与流程"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["任务管理"])
