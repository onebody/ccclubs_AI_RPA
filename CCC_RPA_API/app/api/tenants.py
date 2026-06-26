from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/tenants", tags=["租户管理"])


class TenantResponse(BaseModel):
    id: str
    name: str


# Mock 租户数据（后续替换为数据库查询）
MOCK_TENANTS: List[TenantResponse] = [
    TenantResponse(id="1", name="广东分公司"),
    TenantResponse(id="2", name="浙江分公司"),
    TenantResponse(id="3", name="江苏分公司"),
]


@router.get("", response_model=List[TenantResponse])
def list_tenants():
    """获取租户列表"""
    return MOCK_TENANTS
