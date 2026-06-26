from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    client_id: str
    token: str
    device_id: str
    username: Optional[str] = "开发者"


class LoginResponse(BaseModel):
    userId: str
    username: str
    token: str


class LogoutRequest(BaseModel):
    userId: str


class VerifyResponse(BaseModel):
    valid: bool
    userId: Optional[str] = None
    username: Optional[str] = None
