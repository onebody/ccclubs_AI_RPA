"""
任务并发调度器
管理多浏览器上下文的并行任务执行，提供任务队列和并发控制
"""
import asyncio
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field
from loguru import logger

from app.engine.browser_engine import BrowserEngine
from app.websocket.log_push import log_manager


class TaskPriority(Enum):
    """任务优先级"""
    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


class SchedulerStatus(Enum):
    """调度器状态"""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"


@dataclass
class ScheduledTask:
    """调度任务数据结构"""
    id: str
    task_id: str
    priority: TaskPriority = TaskPriority.NORMAL
    config: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending / queued / running / completed / failed
    session_id: Optional[str] = None
    instance_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_msg: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3


class TaskScheduler:
    """
    任务并发调度器
    
    核心职责：
    1. 管理任务优先级队列
    2. 控制并发执行数量（受限于系统资源和浏览器实例）
    3. 为每个任务分配独立的 BrowserContext
    4. 处理任务失败重试
    5. 通过 WebSocket 实时推送任务状态
    """

    def __init__(self, engine: BrowserEngine, max_concurrent: int = 5):
        self.engine = engine
        self.max_concurrent = max_concurrent
        self._queue: List[ScheduledTask] = []
        self._running: Dict[str, ScheduledTask] = {}
        self._completed: Dict[str, ScheduledTask] = {}
        self._status = SchedulerStatus.IDLE
        self._worker_task: Optional[asyncio.Task] = None
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def start(self):
        """启动调度器工作循环"""
        if self._status == SchedulerStatus.RUNNING:
            return
        self._status = SchedulerStatus.RUNNING
        self._worker_task = asyncio.create_task(self._worker_loop())
        await log_manager.log_system("info", "任务调度器已启动")
        logger.info(f"任务调度器已启动, 最大并发数: {self.max_concurrent}")

    async def stop(self):
        """停止调度器"""
        self._status = SchedulerStatus.STOPPED
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        await log_manager.log_system("info", "任务调度器已停止")
        logger.info("任务调度器已停止")

    def submit(
        self,
        task_id: str,
        config: Dict[str, Any] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
    ) -> str:
        """
        提交任务到调度队列
        
        Args:
            task_id: 任务配置ID
            config: 任务执行参数
            priority: 优先级
            max_retries: 最大重试次数
            
        Returns:
            调度任务ID
        """
        scheduled_id = str(uuid.uuid4())
        task = ScheduledTask(
            id=scheduled_id,
            task_id=task_id,
            priority=priority,
            config=config or {},
            max_retries=max_retries,
        )
        self._queue.append(task)
        # 按优先级排序
        self._queue.sort(key=lambda t: t.priority.value, reverse=True)

        logger.info(f"任务已提交调度: scheduled={scheduled_id}, task={task_id}, priority={priority.name}")
        asyncio.create_task(log_manager.log_system("info", f"任务已提交: {scheduled_id}"))
        return scheduled_id

    async def _worker_loop(self):
        """调度器工作循环：从队列中取出任务并执行"""
        while self._status == SchedulerStatus.RUNNING:
            if not self._queue:
                await asyncio.sleep(0.5)
                continue

            # 取出最高优先级任务
            task = self._queue.pop(0)
            task.status = "queued"

            # 等待信号量（并发控制）
            asyncio.create_task(self._execute_with_semaphore(task))

    async def _execute_with_semaphore(self, task: ScheduledTask):
        """使用信号量控制并发执行"""
        async with self._semaphore:
            await self._execute_task(task)

    async def _execute_task(self, task: ScheduledTask):
        """
        执行单个调度任务
        
        1. 创建独立的浏览器会话
        2. 执行任务逻辑
        3. 处理结果和异常
        4. 通过 WebSocket 推送状态
        """
        task.status = "running"
        task.started_at = datetime.now()
        self._running[task.id] = task

        # 推送开始事件
        await log_manager.log_task_event(
            task_id=task.task_id,
            instance_id=task.id,
            event_type="step_start",
            message=f"任务开始执行: {task.id}",
            data={"priority": task.priority.name},
        )

        try:
            # 创建独立的浏览器会话
            session_id = await self.engine.launch(
                url=task.config.get("target_url"),
                storage_state_path=task.config.get("storage_state_path"),
            )
            task.session_id = session_id

            await log_manager.log_task_event(
                task_id=task.task_id,
                instance_id=task.id,
                event_type="progress",
                message=f"浏览器会话已创建: {session_id}",
                data={"session_id": session_id},
            )

            # TODO: 此处接入 DAG 执行引擎
            # 根据 flow_config 中的 DAG 定义逐步执行
            flow_steps = task.config.get("steps", [])
            for i, step in enumerate(flow_steps):
                step_name = step.get("name", f"步骤{i+1}")
                await log_manager.log_task_event(
                    task_id=task.task_id,
                    instance_id=task.id,
                    event_type="progress",
                    message=f"执行: {step_name} ({i+1}/{len(flow_steps)})",
                    data={"step": i + 1, "total": len(flow_steps)},
                )
                # 模拟步骤执行延迟（后续替换为实际 DAG 引擎）
                await asyncio.sleep(0.1)

            # 执行成功
            task.status = "completed"
            task.completed_at = datetime.now()
            self._completed[task.id] = task
            del self._running[task.id]

            await log_manager.log_task_event(
                task_id=task.task_id,
                instance_id=task.id,
                event_type="step_complete",
                message="任务执行完成",
                data={"duration": str(task.completed_at - task.started_at)},
            )

        except Exception as e:
            task.retry_count += 1
            if task.retry_count <= task.max_retries:
                # 重试
                task.status = "pending"
                task.error_msg = str(e)
                self._queue.append(task)
                logger.warning(f"任务失败, 第{task.retry_count}次重试: {task.id}")

                await log_manager.log_task_event(
                    task_id=task.task_id,
                    instance_id=task.id,
                    event_type="error",
                    message=f"任务失败, 正在重试 ({task.retry_count}/{task.max_retries})",
                    data={"error": str(e), "retry": task.retry_count},
                )
            else:
                # 最终失败
                task.status = "failed"
                task.error_msg = str(e)
                task.completed_at = datetime.now()
                self._completed[task.id] = task
                if task.id in self._running:
                    del self._running[task.id]

                await log_manager.log_task_event(
                    task_id=task.task_id,
                    instance_id=task.id,
                    event_type="error",
                    message=f"任务最终失败失败: {str(e)}",
                    data={"error": str(e)},
                )

        finally:
            # 清理浏览器会话
            if task.session_id:
                try:
                    await self.engine.close(task.session_id)
                except Exception:
                    pass

    def get_status(self) -> Dict[str, Any]:
        """获取调度器状态概览"""
        return {
            "status": self._status.value,
            "max_concurrent": self.max_concurrent,
            "queued": len(self._queue),
            "running": len(self._running),
            "completed": len(self._completed),
        }

    def get_running_tasks(self) -> List[Dict[str, Any]]:
        """获取所有运行中的任务"""
        return [
            {
                "id": t.id,
                "task_id": t.task_id,
                "session_id": t.session_id,
                "started_at": t.started_at.isoformat() if t.started_at else None,
                "priority": t.priority.name,
            }
            for t in self._running.values()
        ]
