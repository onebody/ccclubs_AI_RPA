from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/devices", tags=["设备管理"])


class DeviceResponse(BaseModel):
    id: str
    name: str


# Mock 设备数据（后续替换为数据库查询）
MOCK_DEVICES: List[DeviceResponse] = [
    DeviceResponse(id="device-001", name="本地设备-A"),
    DeviceResponse(id="device-002", name="本地设备-B"),
]


@router.get("", response_model=List[DeviceResponse])
def list_devices():
    """获取设备列表"""
    return MOCK_DEVICES
