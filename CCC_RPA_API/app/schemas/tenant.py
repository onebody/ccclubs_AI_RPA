from pydantic import BaseModel
from typing import Optional, List


class TenantCreate(BaseModel):
    tenant_code: str
    name: str
    province: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    province: Optional[str] = None
    is_active: Optional[bool] = None


class TenantResponse(BaseModel):
    """简化的租户响应，用于下拉选择（保持前端兼容）"""
    id: str  # 返回 tenant_code
    name: str

    class Config:
        from_attributes = True


class TenantDetailResponse(BaseModel):
    """完整的租户详情"""
    id: int
    tenantCode: str
    name: str
    province: Optional[str] = None
    isActive: bool
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    items: List[TenantDetailResponse]
    total: int
