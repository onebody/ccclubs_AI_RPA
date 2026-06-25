"""
任务数据模型（Pydantic Schema）
对应数据库 tasks 表和 task_instances 表的结构定义
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class FlowType(str, Enum):
    """流程类型枚举"""
    LOGIN = "login"       # 登录流程
    BUSINESS = "business"  # 业务流程


class TaskStatus(str, Enum):
    """任务执行状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    INTERCEPTED = "intercepted"  # 被风控拦截


class Task(BaseModel):
    """任务配置模型 - 对应 tasks 表"""
    id: str
    name: str = Field(..., max_length=255)
    flow_type: FlowType
    flow_config: Dict[str, Any] = Field(default_factory=dict)
    target_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class TaskInstance(BaseModel):
    """任务执行实例模型 - 对应 task_instances 表"""
    id: str
    task_id: str
    session_id: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    error_code: Optional[int] = None
    error_msg: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class BrowserSession(BaseModel):
    """浏览器会话模型 - 对应 browser_sessions 表"""
    id: str
    task_id: Optional[str] = None
    user_data_dir: Optional[str] = None
    storage_state_path: Optional[str] = None
    proxy_config: Optional[Dict[str, Any]] = None
    status: str = "idle"  # idle | active | expired
