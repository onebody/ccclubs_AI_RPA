"""
任务管理 API 路由
提供任务创建、执行、查询等接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from loguru import logger

router = APIRouter()

# 内存中的任务存储（Phase 1 使用内存，后续迁移至 PostgreSQL）
_tasks_store: dict = {}
_instances_store: dict = {}


# ============================
# 请求/响应模型
# ============================

class TaskCreateRequest(BaseModel):
    """创建任务请求"""
    name: str
    flow_type: str  # 'login' | 'business'
    target_url: Optional[str] = None
    flow_config: Optional[dict] = None


class TaskResponse(BaseModel):
    """任务响应"""
    id: str
    name: str
    flow_type: str
    target_url: Optional[str]
    flow_config: Optional[dict]
    created_at: str


class TaskExecuteRequest(BaseModel):
    """执行任务请求"""
    task_id: str
    session_id: str


class TaskInstanceResponse(BaseModel):
    """任务执行实例响应"""
    id: str
    task_id: str
    session_id: str
    status: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    error_msg: Optional[str] = None


# ============================
# API 端点
# ============================

@router.get("", response_model=List[TaskResponse])
async def list_tasks():
    """获取所有任务列表"""
    tasks = list(_tasks_store.values())
    return {"data": tasks}


@router.post("", response_model=TaskResponse)
async def create_task(request: TaskCreateRequest):
    """创建新任务"""
    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "name": request.name,
        "flow_type": request.flow_type,
        "target_url": request.target_url,
        "flow_config": request.flow_config or {},
        "created_at": datetime.now().isoformat(),
    }
    _tasks_store[task_id] = task
    logger.info(f"任务已创建: {task_id} - {request.name}")
    return task


@router.post("/execute", response_model=TaskInstanceResponse)
async def execute_task(request: TaskExecuteRequest):
    """
    执行指定任务
    将任务与浏览器会话绑定，启动自动化执行流程
    """
    # 校验任务是否存在
    if request.task_id not in _tasks_store:
        raise HTTPException(status_code=4001, detail="任务不存在")

    # 创建执行实例
    instance_id = str(uuid.uuid4())
    instance = {
        "id": instance_id,
        "task_id": request.task_id,
        "session_id": request.session_id,
        "status": "pending",
        "start_time": datetime.now().isoformat(),
        "end_time": None,
        "error_msg": None,
    }
    _instances_store[instance_id] = instance

    # TODO: Phase 1 后续 - 在此处触发实际的自动化执行流程
    # 将任务状态更新为 running
    instance["status"] = "running"
    logger.info(f"任务开始执行: task={request.task_id}, instance={instance_id}")

    return instance


@router.get("/instance/{instance_id}/status", response_model=TaskInstanceResponse)
async def get_task_instance_status(instance_id: str):
    """获取任务执行实例的状态"""
    if instance_id not in _instances_store:
        raise HTTPException(status_code=4001, detail="执行实例不存在")
    return _instances_store[instance_id]
