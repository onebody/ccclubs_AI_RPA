import json
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.services.executor import submit_task_execution
from app.models.execution_log import TaskExecutionLog
from app.schemas.execution_log import ExecutionLogResponse, ExecutionLogListResponse


def _format_dt(dt) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S") if dt else ""


def _task_to_response(db: Session, task: Task) -> TaskResponse:
    sub_tasks = None
    if task.sub_tasks:
        try:
            sub_tasks = json.loads(task.sub_tasks)
        except Exception:
            sub_tasks = None

    return TaskResponse(
        id=task.id,
        name=task.name,
        status=task.status,
        tenantId=task.tenant_id,
        deviceId=task.device_id,
        customerName=task.customer_name,
        handlerAccount=task.handler_account,
        subTasks=sub_tasks,
        province=task.province,
        lastExecutedAt=_format_dt(task.last_executed_at),
        nextExecutedAt=_format_dt(task.next_executed_at),
        lastResult=task.last_result,
        remark=task.remark,
        deleted=task.deleted,
        createdAt=task.created_at.strftime("%Y-%m-%d %H:%M:%S") if task.created_at else "",
        updatedAt=task.updated_at.strftime("%Y-%m-%d %H:%M:%S") if task.updated_at else "",
    )


class TaskService:

    @staticmethod
    def get_tasks(db: Session, keyword: str = "", status: str = "", page: int = 1, page_size: int = 20) -> TaskListResponse:
        query = db.query(Task).filter(Task.deleted == False)

        if keyword:
            query = query.filter(Task.name.like(f"%{keyword}%"))

        if status:
            query = query.filter(Task.status == status)

        total = query.count()
        items = query.order_by(Task.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

        return TaskListResponse(
            items=[_task_to_response(db, t) for t in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def get_task(db: Session, task_id: int) -> Optional[TaskResponse]:
        task = db.query(Task).filter(Task.id == task_id, Task.deleted == False).first()
        if not task:
            return None
        return _task_to_response(db, task)

    @staticmethod
    def create_task(db: Session, data: TaskCreate) -> TaskResponse:
        task = Task(
            name=data.name,
            tenant_id=data.tenant_id,
            device_id=data.device_id,
            customer_name=data.customer_name,
            handler_account=data.handler_account,
            sub_tasks=json.dumps(data.sub_tasks, ensure_ascii=False) if data.sub_tasks else None,
            province=data.province,
            remark=data.remark,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return _task_to_response(db, task)

    @staticmethod
    def update_task(db: Session, task_id: int, data: TaskUpdate) -> Optional[TaskResponse]:
        task = db.query(Task).filter(Task.id == task_id, Task.deleted == False).first()
        if not task:
            return None

        update_data = data.model_dump(exclude_unset=True)
        # sub_tasks 列表需要转为 JSON 字符串存储
        for json_field in ("sub_tasks",):
            if json_field in update_data:
                val = update_data.pop(json_field)
                setattr(task, json_field, json.dumps(val, ensure_ascii=False) if val else None)
        for key, value in update_data.items():
            setattr(task, key, value)

        db.commit()
        db.refresh(task)
        return _task_to_response(db, task)

    @staticmethod
    def delete_task(db: Session, task_id: int) -> bool:
        task = db.query(Task).filter(Task.id == task_id, Task.deleted == False).first()
        if not task:
            return False

        task.deleted = True
        db.commit()
        return True

    @staticmethod
    def execute_task(db: Session, task_id: int):
        """返回 (TaskResponse, None) 或 (None, error_msg)"""
        task = db.query(Task).filter(Task.id == task_id, Task.deleted == False).first()
        if not task:
            return None, "任务不存在"

        task.status = "running"
        task.last_result = None
        db.commit()
        db.refresh(task)

        submit_task_execution(task_id)

        return _task_to_response(db, task), None

    @staticmethod
    def get_task_logs(db: Session, task_id: int, page: int = 1, page_size: int = 20) -> ExecutionLogListResponse:
        query = db.query(TaskExecutionLog).filter(TaskExecutionLog.task_id == task_id)
        total = query.count()
        items = query.order_by(TaskExecutionLog.id.desc())\
            .offset((page - 1) * page_size).limit(page_size).all()

        return ExecutionLogListResponse(
            items=[
                ExecutionLogResponse(
                    id=log.id,
                    taskId=log.task_id,
                    taskName=log.task_name,
                    startedAt=log.started_at.strftime("%Y-%m-%d %H:%M:%S"),
                    finishedAt=log.finished_at.strftime("%Y-%m-%d %H:%M:%S") if log.finished_at else None,
                    status=log.status,
                    resultMessage=log.result_message,
                )
                for log in items
            ],
            total=total,
        )
