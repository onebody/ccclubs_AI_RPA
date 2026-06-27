import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.tenant import (
    TenantCreate, TenantUpdate, TenantResponse,
    TenantDetailResponse, TenantListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tenants", tags=["租户管理"])


def _to_simple_response(tenant: Tenant) -> dict:
    """转换为前端兼容的简化格式（id 返回 tenant_code）"""
    return {"id": tenant.tenant_code, "name": tenant.name}


def _to_detail_response(tenant: Tenant) -> dict:
    """转换为完整的详情格式（camelCase）"""
    return {
        "id": tenant.id,
        "tenantCode": tenant.tenant_code,
        "name": tenant.name,
        "province": tenant.province,
        "isActive": tenant.is_active,
        "createdAt": tenant.created_at.isoformat() if tenant.created_at else "",
        "updatedAt": tenant.updated_at.isoformat() if tenant.updated_at else "",
    }


@router.get("", response_model=List[TenantResponse])
def list_tenants(db: Session = Depends(get_db)):
    """获取租户列表（仅活跃租户，返回简化格式供下拉选择）"""
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    logger.debug("查询到 %d 个活跃租户", len(tenants))
    return [_to_simple_response(t) for t in tenants]


@router.get("/{tenant_id}", response_model=TenantDetailResponse)
def get_tenant(tenant_id: int, db: Session = Depends(get_db)):
    """获取租户详情"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="租户不存在")
    return _to_detail_response(tenant)


@router.post("", response_model=TenantDetailResponse)
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    """创建租户"""
    existing = db.query(Tenant).filter(Tenant.tenant_code == data.tenant_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="租户编码已存在")
    tenant = Tenant(
        tenant_code=data.tenant_code,
        name=data.name,
        province=data.province,
        is_active=True,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    logger.info("创建租户: %s (%s)", tenant.name, tenant.tenant_code)
    return _to_detail_response(tenant)


@router.put("/{tenant_id}", response_model=TenantDetailResponse)
def update_tenant(tenant_id: int, data: TenantUpdate, db: Session = Depends(get_db)):
    """更新租户"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="租户不存在")
    if data.name is not None:
        tenant.name = data.name
    if data.province is not None:
        tenant.province = data.province
    if data.is_active is not None:
        tenant.is_active = data.is_active
    db.commit()
    db.refresh(tenant)
    logger.info("更新租户: %s", tenant.name)
    return _to_detail_response(tenant)


@router.delete("/{tenant_id}")
def delete_tenant(tenant_id: int, db: Session = Depends(get_db)):
    """软删除租户（设置 is_active=False）"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="租户不存在")
    tenant.is_active = False
    db.commit()
    logger.info("软删除租户: %s (%s)", tenant.name, tenant.tenant_code)
    return {"message": "删除成功"}
