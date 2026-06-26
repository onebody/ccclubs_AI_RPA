from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, LogoutRequest, VerifyResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    return AuthService.login(db, req)


@router.post("/logout")
def logout(req: LogoutRequest, db: Session = Depends(get_db)):
    AuthService.logout(db, req.userId)
    return {"message": "登出成功"}


@router.get("/verify", response_model=VerifyResponse)
def verify(userId: str, db: Session = Depends(get_db)):
    return AuthService.verify(db, userId)
