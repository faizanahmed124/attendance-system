from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database import get_db
from app.modules.auth.model import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


def require_roles(*allowed_roles: str):
    """Usage: Depends(require_roles('admin', 'hr_manager'))"""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return role_checker


def require_permission(module: str, action: str):
    """
    Usage: Depends(require_permission('employee', 'write'))
    Checks the RolePermission matrix (Settings > Permissions in the UI).
    'admin' role always passes. Import is done lazily inside the function
    to avoid a circular import between core and modules.
    """

    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        from app.modules.permission.service import has_permission

        if not has_permission(db, current_user.role, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your role ('{current_user.role}') does not have '{action}' access to '{module}'",
            )
        return current_user

    return permission_checker
