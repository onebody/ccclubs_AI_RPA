from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.schemas.execution_log import ExecutionLogListResponse
from app.schemas.execution import CompanySelectRequest
from app.services.task import TaskService
from app.browser.waiter import ExecutionWaiter

router = APIRouter(prefix="/api/tasks", tags=["站点任务"])


@router.get("", response_model=TaskListResponse)
def list_tasks(keyword: str = "", status: str = "", page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    return TaskService.get_tasks(db, keyword, status, page, page_size)


@router.post("", response_model=TaskResponse)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    return TaskService.create_task(db, data)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = TaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = TaskService.update_task(db, task_id, data)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    success = TaskService.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "删除成功"}


@router.post("/{task_id}/execute", response_model=TaskResponse)
def execute_task(task_id: int, db: Session = Depends(get_db)):
    result, error = TaskService.execute_task(db, task_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return result


@router.get("/{task_id}/logs", response_model=ExecutionLogListResponse)
def get_task_logs(task_id: int, page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    return TaskService.get_task_logs(db, task_id, page, page_size)


@router.post("/{task_id}/scan-complete")
def scan_complete(task_id: int, db: Session = Depends(get_db)):
    ExecutionWaiter.signal(task_id, data={"scanned": True})
    return {"success": True}


@router.post("/{task_id}/select-company")
def select_company(task_id: int, body: CompanySelectRequest, db: Session = Depends(get_db)):
    ExecutionWaiter.signal(task_id, data={"companyId": body.company_id, "companyName": body.company_name})
    return {"success": True}


@router.post("/{task_id}/cancel-execution")
def cancel_execution(task_id: int, db: Session = Depends(get_db)):
    ExecutionWaiter.cancel(task_id)
    return {"success": True}
