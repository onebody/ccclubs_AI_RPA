"""
浏览器控制 API 路由
提供浏览器会话的启动、关闭、状态查询等接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from loguru import logger

from app.engine.browser_engine import BrowserEngine

router = APIRouter()

# 全局浏览器引擎实例（单例）
_engine: Optional[BrowserEngine] = None


def get_engine() -> BrowserEngine:
    """获取或创建浏览器引擎实例"""
    global _engine
    if _engine is None:
        _engine = BrowserEngine()
    return _engine


# ============================
# 请求/响应模型
# ============================

class LaunchRequest(BaseModel):
    """启动浏览器请求"""
    url: Optional[str] = None
    headless: bool = False


class LaunchResponse(BaseModel):
    """启动浏览器响应"""
    session_id: str
    status: str
    message: str


# ============================
# API 端点
# ============================

@router.post("/launch", response_model=LaunchResponse)
async def launch_browser(request: LaunchRequest):
    """
    启动新的浏览器会话
    创建一个独立的 BrowserContext，支持可选的初始 URL
    """
    engine = get_engine()
    try:
        session_id = await engine.launch(
            url=request.url,
            headless=request.headless,
        )
        logger.info(f"浏览器会话已启动: {session_id}")
        return LaunchResponse(
            session_id=session_id,
            status="active",
            message="浏览器启动成功",
        )
    except Exception as e:
        logger.error(f"浏览器启动失败: {e}")
        raise HTTPException(status_code=5001, detail=f"浏览器启动失败: {str(e)}")


@router.post("/close/{session_id}")
async def close_browser(session_id: str):
    """关闭指定的浏览器会话"""
    engine = get_engine()
    try:
        await engine.close(session_id)
        logger.info(f"浏览器会话已关闭: {session_id}")
        return {"status": "ok", "message": "会话已关闭"}
    except KeyError:
        raise HTTPException(status_code=4003, detail="会话ID不存在或已销毁")
    except Exception as e:
        logger.error(f"关闭会话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}")
async def get_session_status(session_id: str):
    """获取浏览器会话状态"""
    engine = get_engine()
    try:
        status = engine.get_session_status(session_id)
        return {"session_id": session_id, **status}
    except KeyError:
        raise HTTPException(status_code=4003, detail="会话ID不存在或已销毁")
