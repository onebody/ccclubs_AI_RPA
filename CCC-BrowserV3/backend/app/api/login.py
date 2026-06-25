"""
登录录制 API 路由
提供登录流程录制、二维码捕获、登录态保存等接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from loguru import logger

from app.engine.browser_engine import BrowserEngine
from app.engine.login_recorder import LoginRecorder

router = APIRouter()

# 全局引擎和录制器实例
_engine: Optional[BrowserEngine] = None
_recorder: Optional[LoginRecorder] = None


def get_recorder() -> LoginRecorder:
    """获取或创建登录录制器实例"""
    global _engine, _recorder
    if _recorder is None:
        if _engine is None:
            _engine = BrowserEngine()
        _recorder = LoginRecorder(_engine)
    return _recorder


def get_engine() -> BrowserEngine:
    """获取引擎实例"""
    global _engine
    if _engine is None:
        _engine = BrowserEngine()
    return _engine


# ============================
# 请求/响应模型
# ============================

class LoginStartRequest(BaseModel):
    """开始登录录制请求"""
    session_id: str = ""
    target_url: str


class LoginStopRequest(BaseModel):
    """停止登录录制请求"""
    session_id: str
    filename: Optional[str] = None


class QrCaptureRequest(BaseModel):
    """二维码捕获请求"""
    session_id: str
    qr_selector: str


class LoginStatusRequest(BaseModel):
    """登录状态检测请求"""
    session_id: str
    success_selector: Optional[str] = None
    success_url_pattern: Optional[str] = None


# ============================
# API 端点
# ============================

@router.post("/start-recording")
async def start_recording(request: LoginStartRequest):
    """
    开始录制登录流程
    
    如果 session_id 为空，自动创建新的浏览器会话。
    导航至目标 URL 后，用户可在浏览器窗口中完成登录操作。
    """
    engine = get_engine()
    recorder = get_recorder()

    session_id = request.session_id

    # 如果未提供 session_id，自动创建新会话
    if not session_id:
        session_id = await engine.launch(url=request.target_url)
        logger.info(f"自动创建浏览器会话: {session_id}")
    else:
        # 已有会话，直接导航至目标 URL
        page = engine.get_page(session_id)
        await page.goto(request.target_url, wait_until="domcontentloaded")

    return {
        "session_id": session_id,
        "status": "recording",
        "target_url": request.target_url,
        "message": "请在浏览器窗口中完成登录操作",
    }


@router.post("/stop-recording")
async def stop_recording(request: LoginStopRequest):
    """
    停止录制并保存登录态
    
    将当前会话的 Cookie 和 LocalStorage 序列化保存至本地文件，
    后续任务可直接加载该文件实现免登录。
    """
    recorder = get_recorder()

    result = await recorder.stop_recording(
        session_id=request.session_id,
        filename=request.filename,
    )

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    return result


@router.post("/capture-qr")
async def capture_qr_code(request: QrCaptureRequest):
    """
    捕获页面中的二维码元素截图
    
    通过 CSS 选择器定位二维码 DOM 节点，截图后以 base64 格式返回，
    供 Electron 前端展示扫码面板。
    """
    recorder = get_recorder()

    qr_base64 = await recorder.capture_qr_code(
        session_id=request.session_id,
        qr_selector=request.qr_selector,
    )

    if qr_base64 is None:
        raise HTTPException(status_code=5003, detail="未找到二维码元素")

    return {
        "session_id": request.session_id,
        "qr_image": qr_base64,
        "message": "二维码已捕获",
    }


@router.post("/check-login-status")
async def check_login_status(request: LoginStatusRequest):
    """
    检测登录是否成功
    
    支持两种检测方式：
    1. DOM 元素检测：等待特定元素出现（如"退出登录"按钮）
    2. URL 模式匹配：检测页面 URL 是否包含特定模式
    """
    recorder = get_recorder()

    is_logged_in = await recorder.check_login_status(
        session_id=request.session_id,
        success_selector=request.success_selector,
        success_url_pattern=request.success_url_pattern,
    )

    return {
        "session_id": request.session_id,
        "is_logged_in": is_logged_in,
    }
