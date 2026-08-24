from sqlalchemy.orm import Session

from app.modules.permission.model import RolePermission, MODULES, ACTIONS
from app.modules.permission.schema import RolePermissionUpdate

# Roles that exist in the system. "admin" is always treated as full-access
# and is not stored in the DB (so it can never accidentally get locked out).
ROLES = ["hr_manager", "employee"]


def list_permissions(db: Session):
    return db.query(RolePermission).all()


def get_role_permission(db: Session, role: str, module: str) -> RolePermission | None:
    return (
        db.query(RolePermission)
        .filter(RolePermission.role == role, RolePermission.module == module)
        .first()
    )


def upsert_permission(db: Session, payload: RolePermissionUpdate) -> RolePermission:
    perm = get_role_permission(db, payload.role, payload.module)
    if not perm:
        perm = RolePermission(role=payload.role, module=payload.module)
        db.add(perm)

    perm.can_read = payload.can_read
    perm.can_create = payload.can_create
    perm.can_write = payload.can_write
    perm.can_delete = payload.can_delete

    db.commit()
    db.refresh(perm)
    return perm


def bulk_upsert(db: Session, items: list[RolePermissionUpdate]):
    results = [upsert_permission(db, item) for item in items]
    return results


def has_permission(db: Session, role: str, module: str, action: str) -> bool:
    """admin always has full access. Everyone else is checked against the table."""
    if role == "admin":
        return True

    perm = get_role_permission(db, role, module)
    if not perm:
        return False

    return {
        "read": perm.can_read,
        "create": perm.can_create,
        "write": perm.can_write,
        "delete": perm.can_delete,
    }.get(action, False)


def seed_default_permissions(db: Session):
    """Sensible starting matrix - run once on first startup / seed.py."""
    defaults = {
        "hr_manager": {m: {"can_read": True, "can_create": True, "can_write": True, "can_delete": False} for m in MODULES},
        "employee": {m: {"can_read": True, "can_create": False, "can_write": False, "can_delete": False} for m in MODULES},
    }
    # employees can punch their own attendance
    defaults["employee"]["attendance"]["can_create"] = True

    for role, modules in defaults.items():
        for module, perms in modules.items():
            existing = get_role_permission(db, role, module)
            if existing:
                continue
            db.add(RolePermission(role=role, module=module, **perms))
    db.commit()
