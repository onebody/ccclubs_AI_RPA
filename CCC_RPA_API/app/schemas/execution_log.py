from pydantic import BaseModel
from typing import Optional, List

class ExecutionLogResponse(BaseModel):
    id: int
    taskId: int
    taskName: str
    startedAt: str
    finishedAt: Optional[str]
    status: str
    resultMessage: Optional[str]

    class Config:
        from_attributes = True

class ExecutionLogListResponse(BaseModel):
    items: List[ExecutionLogResponse]
    total: int
