import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.device import Device
from app.schemas.device import (
    DeviceCreate, DeviceUpdate, DeviceResponse,
    DeviceDetailResponse, DeviceListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/devices", tags=["设备管理"])


def _to_simple_response(device: Device) -> dict:
    """转换为前端兼容的简化格式（id 返回 device_code）"""
    return {"id": device.device_code, "name": device.name}


def _to_detail_response(device: Device) -> dict:
    """转换为完整的详情格式（camelCase）"""
    return {
        "id": device.id,
        "deviceCode": device.device_code,
        "name": device.name,
        "tenantId": device.tenant_id,
        "isActive": device.is_active,
        "createdAt": device.created_at.isoformat() if device.created_at else "",
        "updatedAt": device.updated_at.isoformat() if device.updated_at else "",
    }


@router.get("", response_model=List[DeviceResponse])
def list_devices(
    tenant_id: Optional[int] = Query(None, description="按租户筛选"),
    db: Session = Depends(get_db),
):
    """获取设备列表（仅活跃设备，返回简化格式供下拉选择）"""
    query = db.query(Device).filter(Device.is_active == True)
    if tenant_id is not None:
        query = query.filter(Device.tenant_id == tenant_id)
    devices = query.all()
    logger.debug("查询到 %d 个活跃设备 (tenant_id=%s)", len(devices), tenant_id)
    return [_to_simple_response(d) for d in devices]


@router.get("/{device_id}", response_model=DeviceDetailResponse)
def get_device(device_id: int, db: Session = Depends(get_db)):
    """获取设备详情"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return _to_detail_response(device)


@router.post("", response_model=DeviceDetailResponse)
def create_device(data: DeviceCreate, db: Session = Depends(get_db)):
    """创建设备"""
    existing = db.query(Device).filter(Device.device_code == data.device_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="设备编码已存在")
    device = Device(
        device_code=data.device_code,
        name=data.name,
        tenant_id=data.tenant_id,
        is_active=True,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    logger.info("创建设备: %s (%s)", device.name, device.device_code)
    return _to_detail_response(device)


@router.put("/{device_id}", response_model=DeviceDetailResponse)
def update_device(device_id: int, data: DeviceUpdate, db: Session = Depends(get_db)):
    """更新设备"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    if data.name is not None:
        device.name = data.name
    if data.tenant_id is not None:
        device.tenant_id = data.tenant_id
    if data.is_active is not None:
        device.is_active = data.is_active
    db.commit()
    db.refresh(device)
    logger.info("更新设备: %s", device.name)
    return _to_detail_response(device)


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    """软删除设备（设置 is_active=False）"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    device.is_active = False
    db.commit()
    logger.info("软删除设备: %s (%s)", device.name, device.device_code)
    return {"message": "删除成功"}
