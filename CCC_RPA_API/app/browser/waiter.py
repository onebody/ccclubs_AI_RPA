import threading
import logging

logger = logging.getLogger(__name__)


class ExecutionWaiter:
    """用 threading.Event 实现执行流程的暂停/恢复"""

    _events: dict = {}
    _data: dict = {}
    _lock = threading.Lock()

    @classmethod
    def wait_for(cls, task_id: int, timeout: int = 300):
        """阻塞等待用户操作"""
        event = threading.Event()
        with cls._lock:
            cls._events[task_id] = event
            cls._data.pop(task_id, None)

        logger.info(f"等待任务 {task_id} 的用户操作...")
        result = event.wait(timeout=timeout)

        with cls._lock:
            data = cls._data.pop(task_id, None)
            cls._events.pop(task_id, None)

        if not result:
            raise TimeoutError(f"等待超时: task_id={task_id}")

        return data

    @classmethod
    def signal(cls, task_id: int, data=None):
        """唤醒等待"""
        with cls._lock:
            cls._data[task_id] = data
            event = cls._events.get(task_id)

        if event:
            event.set()
            logger.info(f"唤醒任务 {task_id} 的等待")

    @classmethod
    def cancel(cls, task_id: int):
        """取消等待"""
        with cls._lock:
            event = cls._events.get(task_id)
            cls._data[task_id] = {"cancelled": True}

        if event:
            event.set()

    @classmethod
    def cleanup(cls, task_id: int):
        """清理资源"""
        with cls._lock:
            cls._events.pop(task_id, None)
            cls._data.pop(task_id, None)
