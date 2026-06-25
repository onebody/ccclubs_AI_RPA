"""
RPA 自动化浏览器 - Python FastAPI 后端入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import settings
from app.api.router import api_router
from app.websocket.log_push import router as ws_router

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="RPA自动化浏览器后端控制层",
)

# 配置 CORS 跨域（允许 Electron 渲染进程访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 REST API 路由
app.include_router(api_router, prefix="/api/v1")

# 注册 WebSocket 路由（日志实时推送）
app.include_router(ws_router)


@app.on_event("startup")
async def startup_event():
    """应用启动事件：初始化资源"""
    logger.info(f"{settings.APP_NAME} 后端服务启动中...")
    logger.info(f"服务地址: http://{settings.SERVER_HOST}:{settings.SERVER_PORT}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件：清理浏览器引擎资源"""
    logger.info("后端服务正在关闭...")
    # 清理所有浏览器会话
    from app.api.browser import _engine as browser_engine
    if browser_engine:
        await browser_engine.shutdown()
        logger.info("浏览器引擎已关闭")
