from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import get_current_user, require_permission
from app.modules.auth import service
from app.modules.auth.schema import (
    UserCreate, UserOut, LoginRequest, Token, UserRoleUpdate, PasswordResetRequest,
)
from app.modules.auth.model import User

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user, token = service.authenticate_user(db, payload)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ---- User management (admin) ----

@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user=Depends(require_permission("user", "read"))):
    return service.list_users(db)


@router.post("/users", response_model=UserOut)
def create_user(
    payload: UserCreate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("user", "create")),
):
    return service.register_user(db, payload)


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(
    user_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("user", "read")),
):
    return service.get_user(db, user_id)


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, payload: UserRoleUpdate, db: Session = Depends(get_db),
    current_user=Depends(require_permission("user", "write")),
):
    return service.update_user_role(db, user_id, payload)


@router.post("/users/{user_id}/reset-password", response_model=UserOut)
def reset_password(
    user_id: int, payload: PasswordResetRequest, db: Session = Depends(get_db),
    current_user=Depends(require_permission("user", "write")),
):
    return service.reset_password(db, user_id, payload.new_password)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_permission("user", "delete")),
):
    service.delete_user(db, user_id, current_user.id)
    return {"message": "User deleted successfully"}
