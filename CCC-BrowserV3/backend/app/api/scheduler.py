"""
调度器 API 路由
提供任务提交、调度状态查询、流程执行等接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger

from app.engine.browser_engine import BrowserEngine
from app.engine.scheduler import TaskScheduler, TaskPriority
from app.engine.flow_executor import FlowExecutor, parse_flow_definition

router = APIRouter()

# 全局实例
_engine: Optional[BrowserEngine] = None
_scheduler: Optional[TaskScheduler] = None
_flow_executor: Optional[FlowExecutor] = None


def get_scheduler() -> TaskScheduler:
    """获取或创建调度器"""
    global _engine, _scheduler
    if _scheduler is None:
        if _engine is None:
            _engine = BrowserEngine()
        _scheduler = TaskScheduler(_engine, max_concurrent=5)
    return _scheduler


def get_flow_executor() -> FlowExecutor:
    """获取或创建流程执行器"""
    global _engine, _flow_executor
    if _flow_executor is None:
        if _engine is None:
            _engine = BrowserEngine()
        _flow_executor = FlowExecutor(_engine)
    return _flow_executor


# ============================
# 请求/响应模型
# ============================

class SubmitTaskRequest(BaseModel):
    """提交任务请求"""
    task_id: str
    config: Optional[Dict[str, Any]] = None
    priority: str = "normal"  # low / normal / high / urgent
    max_retries: int = 3


class ExecuteFlowRequest(BaseModel):
    """执行 DAG 流程请求"""
    session_id: str
    flow_definition: Dict[str, Any]
    task_id: str = ""
    instance_id: str = ""


# ============================
# 调度器 API
# ============================

@router.post("/scheduler/start")
async def start_scheduler():
    """启动任务调度器"""
    scheduler = get_scheduler()
    await scheduler.start()
    return {"status": "ok", "message": "调度器已启动"}


@router.post("/scheduler/stop")
async def stop_scheduler():
    """停止任务调度器"""
    scheduler = get_scheduler()
    await scheduler.stop()
    return {"status": "ok", "message": "调度器已停止"}


@router.get("/scheduler/status")
async def get_scheduler_status():
    """获取调度器状态"""
    scheduler = get_scheduler()
    status = scheduler.get_status()
    status["running_tasks"] = scheduler.get_running_tasks()
    return status


@router.post("/scheduler/submit")
async def submit_task(request: SubmitTaskRequest):
    """提交任务到调度队列"""
    scheduler = get_scheduler()
    priority = TaskPriority[request.priority.upper()]
    scheduled_id = scheduler.submit(
        task_id=request.task_id,
        config=request.config,
        priority=priority,
        max_retries=request.max_retries,
    )
    return {"scheduled_id": scheduled_id, "status": "submitted"}


# ============================
# DAG 流程执行 API
# ============================

@router.post("/flow/execute")
async def execute_flow(request: ExecuteFlowRequest):
    """
    执行 DAG 流程
    
    接收前端 ReactFlow 画布导出的 JSON 格式流程定义，
    在指定的浏览器会话中逐步执行。
    """
    executor = get_flow_executor()
    try:
        flow = parse_flow_definition(request.flow_definition)
        results = await executor.execute(
            flow=flow,
            session_id=request.session_id,
            instance_id=request.instance_id,
            task_id=request.task_id,
        )
        return {
            "status": "ok",
            "message": "流程执行完成",
            "node_count": len(flow.nodes),
            "results": {k: str(v)[:200] for k, v in results.items()},
        }
    except Exception as e:
        logger.error(f"流程执行失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/flow/validate")
async def validate_flow(flow_definition: Dict[str, Any]):
    """
    验证 DAG 流程定义的有效性
        
    检查节点连接、环路检测、入口节点等
    """
    try:
        flow = parse_flow_definition(flow_definition)

        # 检查入口节点
        if flow.entry_node_id not in flow.nodes:
            raise ValueError(f"入口节点不存在: {flow.entry_node_id}")

        # 检查所有 next_nodes 引用
        for node in flow.nodes.values():
            for next_id in node.next_nodes:
                if next_id not in flow.nodes:
                    raise ValueError(f"节点 {node.id} 引用了不存在的后续节点: {next_id}")

        # 简单的环路检测（DFS）
        visited = set()
        rec_stack = set()

        def has_cycle(node_id: str) -> bool:
            visited.add(node_id)
            rec_stack.add(node_id)
            node = flow.nodes.get(node_id)
            if node:
                for next_id in node.next_nodes:
                    if next_id not in visited:
                        if has_cycle(next_id):
                            return True
                    elif next_id in rec_stack:
                        return True
            rec_stack.discard(node_id)
            return False

        if has_cycle(flow.entry_node_id):
            raise ValueError("流程定义中存在环路")

        return {
            "status": "valid",
            "node_count": len(flow.nodes),
            "message": "流程定义有效",
        }
    except Exception as e:
        return {
            "status": "invalid",
            "message": str(e),
        }
