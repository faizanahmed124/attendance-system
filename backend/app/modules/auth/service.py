from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateError, BadRequestError, NotFoundError
from app.core.security import hash_password, verify_password, create_access_token
from app.modules.auth.model import User
from app.modules.auth.schema import UserCreate, LoginRequest


def register_user(db: Session, payload: UserCreate) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise DuplicateError("A user with this email already exists")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role or "employee",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session):
    return db.query(User).all()


def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found")
    return user


def update_user_role(db: Session, user_id: int, payload) -> User:
    user = get_user(db, user_id)

    data = payload.model_dump(exclude_unset=True)
    new_email = data.get("email")
    if new_email and new_email != user.email:
        existing = db.query(User).filter(User.email == new_email, User.id != user_id).first()
        if existing:
            raise DuplicateError("A user with this email already exists")

    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def reset_password(db: Session, user_id: int, new_password: str) -> User:
    user = get_user(db, user_id)
    user.hashed_password = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, current_user_id: int) -> None:
    user = get_user(db, user_id)

    if user.id == current_user_id:
        raise BadRequestError("You can't delete your own account")

    if user.role == "admin":
        other_admins = (
            db.query(User)
            .filter(User.role == "admin", User.id != user_id, User.is_active.is_(True))
            .count()
        )
        if other_admins == 0:
            raise BadRequestError("Can't delete the last active admin - promote another user first")

    db.delete(user)
    db.commit()


def authenticate_user(db: Session, payload: LoginRequest) -> tuple[User, str]:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise BadRequestError("Invalid email or password")
    if not user.is_active:
        raise BadRequestError("This account is inactive")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return user, token
