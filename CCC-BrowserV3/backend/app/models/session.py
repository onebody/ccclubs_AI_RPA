"""
浏览器会话数据模型
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class SessionStatus(BaseModel):
    """会话状态响应"""
    session_id: str
    status: str
    url: Optional[str] = None
    created_at: Optional[str] = None


class LaunchBrowserRequest(BaseModel):
    """启动浏览器请求"""
    url: Optional[str] = None
    headless: bool = False
    storage_state_path: Optional[str] = None


class LoginStartRequest(BaseModel):
    """开始登录录制请求"""
    session_id: str
    target_url: str


class LoginStopRequest(BaseModel):
    """停止登录录制请求"""
    session_id: str
    filename: Optional[str] = None
