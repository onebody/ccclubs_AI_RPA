from pydantic import BaseModel
from typing import Optional, List


class DeviceCreate(BaseModel):
    device_code: str
    name: str
    tenant_id: Optional[int] = None


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    tenant_id: Optional[int] = None
    is_active: Optional[bool] = None


class DeviceResponse(BaseModel):
    """简化的设备响应，用于下拉选择（保持前端兼容）"""
    id: str  # 返回 device_code
    name: str

    class Config:
        from_attributes = True


class DeviceDetailResponse(BaseModel):
    """完整的设备详情"""
    id: int
    deviceCode: str
    name: str
    tenantId: Optional[int] = None
    isActive: bool
    createdAt: str
    updatedAt: str

    class Config:
        from_attributes = True


class DeviceListResponse(BaseModel):
    items: List[DeviceDetailResponse]
    total: int
