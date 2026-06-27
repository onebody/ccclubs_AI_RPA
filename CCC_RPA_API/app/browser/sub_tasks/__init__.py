from app.browser.sub_tasks.base import BaseSubTask
from app.browser.sub_tasks.filing import FilingSubTask
from app.browser.sub_tasks.contract_entry import ContractEntrySubTask
from app.browser.sub_tasks.violation_query import ViolationQuerySubTask
from app.browser.sub_tasks.contract_adjust import ContractAdjustSubTask
from app.browser.sub_tasks.violation_transfer import ViolationTransferSubTask
import logging

logger = logging.getLogger(__name__)


class SubTaskRegistry:
    _registry = {
        "合同备案": FilingSubTask,
        "备案查询": FilingSubTask,
        "备案": FilingSubTask,
        "合同录入": ContractEntrySubTask,
        "录入合同": ContractEntrySubTask,
        "违章查询": ViolationQuerySubTask,
        "合同调整": ContractAdjustSubTask,
        "违章转移": ViolationTransferSubTask,
        "转移违章": ViolationTransferSubTask,
    }

    @classmethod
    def get_handler(cls, sub_task_type: str):
        return cls._registry.get(sub_task_type)

    @classmethod
    def execute(
        cls, page, sub_task_type: str, context: dict,
        broadcast_fn=None, task_id=None,
    ) -> dict:
        handler_cls = cls.get_handler(sub_task_type)
        if not handler_cls:
            logger.warning(f"[SubTaskRegistry] 未知子任务类型: {sub_task_type}")
            return {"success": False, "message": f"未知子任务类型: {sub_task_type}"}
        handler = handler_cls(page, broadcast_fn=broadcast_fn, task_id=task_id)
        return handler.execute()
