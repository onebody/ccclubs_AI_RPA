"""
任务服务层
封装任务管理的核心业务逻辑，协调引擎层完成自动化执行
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
from loguru import logger

from app.engine.browser_engine import BrowserEngine
from app.engine.login_recorder import LoginRecorder
from app.engine.data_extractor import DataExtractor
from app.models.task import TaskStatus


class TaskService:
    """
    任务服务
    
    核心职责：
    1. 协调浏览器引擎、登录录制器、数据提取器完成完整任务流程
    2. 管理任务执行生命周期
    3. 处理任务执行中的异常和错误
    """

    def __init__(self):
        self.engine = BrowserEngine()
        self.login_recorder = LoginRecorder(self.engine)
        self.data_extractor = DataExtractor(self.engine)
        # 内存中的任务与实例存储
        self._tasks: Dict[str, dict] = {}
        self._instances: Dict[str, dict] = {}

    async def create_task(
        self,
        name: str,
        flow_type: str,
        target_url: Optional[str] = None,
        flow_config: Optional[dict] = None,
    ) -> dict:
        """创建新任务"""
        task_id = str(uuid.uuid4())
        task = {
            "id": task_id,
            "name": name,
            "flow_type": flow_type,
            "target_url": target_url,
            "flow_config": flow_config or {},
            "created_at": datetime.now().isoformat(),
        }
        self._tasks[task_id] = task
        logger.info(f"任务已创建: {task_id}")
        return task

    async def execute_task(
        self,
        task_id: str,
        session_id: str,
    ) -> dict:
        """
        执行指定任务
        
        将任务与浏览器会话绑定，根据任务类型执行不同的自动化流程。
        """
        if task_id not in self._tasks:
            raise ValueError(f"任务不存在: {task_id}")

        # 创建执行实例
        instance_id = str(uuid.uuid4())
        instance = {
            "id": instance_id,
            "task_id": task_id,
            "session_id": session_id,
            "status": TaskStatus.RUNNING.value,
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "error_msg": None,
        }
        self._instances[instance_id] = instance

        task = self._tasks[task_id]

        try:
            if task["flow_type"] == "login":
                # 登录流程：启动录制
                await self.login_recorder.start_recording(
                    session_id=session_id,
                    target_url=task.get("target_url", ""),
                )
            elif task["flow_type"] == "business":
                # 业务流程：执行数据提取
                flow_config = task.get("flow_config", {})
                selector = flow_config.get("selector", "body")
                data = await self.data_extractor.extract_by_selector(session_id, selector)
                await self.data_extractor.export_to_json(data)

            instance["status"] = TaskStatus.SUCCESS.value
            instance["end_time"] = datetime.now().isoformat()
            logger.info(f"任务执行成功: instance={instance_id}")

        except Exception as e:
            instance["status"] = TaskStatus.FAILED.value
            instance["error_msg"] = str(e)
            instance["end_time"] = datetime.now().isoformat()
            logger.error(f"任务执行失败: instance={instance_id}, error={e}")

        return instance

    def get_task(self, task_id: str) -> Optional[dict]:
        """获取任务详情"""
        return self._tasks.get(task_id)

    def list_tasks(self) -> List[dict]:
        """获取所有任务"""
        return list(self._tasks.values())

    def get_instance(self, instance_id: str) -> Optional[dict]:
        """获取执行实例"""
        return self._instances.get(instance_id)

    async def shutdown(self):
        """关闭服务，释放所有资源"""
        await self.engine.shutdown()
        logger.info("任务服务已关闭")
