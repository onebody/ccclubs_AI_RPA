from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, VerifyResponse


class AuthService:

    @staticmethod
    def login(db: Session, req: LoginRequest) -> LoginResponse:
        user = db.query(User).filter(User.client_id == req.client_id).first()

        if not user:
            user = User(
                user_id=req.client_id,
                client_id=req.client_id,
                username=req.username or "开发者",
                token=req.token,
                device_id=req.device_id,
                is_active=True,
            )
            db.add(user)
        else:
            user.token = req.token
            user.device_id = req.device_id
            user.is_active = True
            if req.username and req.username != "开发者":
                user.username = req.username
            elif not user.username:
                user.username = req.username or "开发者"

        db.commit()
        db.refresh(user)

        return LoginResponse(
            userId=user.user_id,
            username=user.username,
            token=user.token or "",
        )

    @staticmethod
    def logout(db: Session, user_id: str) -> None:
        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            user.is_active = False
            db.commit()

    @staticmethod
    def verify(db: Session, user_id: str) -> VerifyResponse:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return VerifyResponse(valid=False)

        return VerifyResponse(
            valid=user.is_active,
            userId=user.user_id,
            username=user.username,
        )
