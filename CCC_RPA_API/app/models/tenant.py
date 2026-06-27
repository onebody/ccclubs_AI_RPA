from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from app.models.base import BaseModel


class Tenant(BaseModel):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tenant_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    province: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
