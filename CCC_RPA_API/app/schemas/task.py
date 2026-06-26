from pydantic import BaseModel
from typing import Optional, List


class TaskCreate(BaseModel):
    name: str
    customer_name: Optional[str] = None
    handler_account: Optional[str] = None
    sub_tasks: Optional[List[str]] = None
    province: Optional[str] = None
    remark: Optional[str] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    customer_name: Optional[str] = None
    handler_account: Optional[str] = None
    sub_tasks: Optional[List[str]] = None
    province: Optional[str] = None
    remark: Optional[str] = None
    last_executed_at: Optional[str] = None
    next_executed_at: Optional[str] = None
    last_result: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    name: str
    status: str
    customerName: Optional[str] = None
    handlerAccount: Optional[str] = None
    subTasks: Optional[List[str]] = None
    province: Optional[str] = None
    lastExecutedAt: Optional[str]
    nextExecutedAt: Optional[str]
    lastResult: Optional[str]
    remark: Optional[str]
    deleted: bool
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int
    page: int
    page_size: int
