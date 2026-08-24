from typing import List
from pydantic import BaseModel, ConfigDict


class RolePermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    module: str
    can_read: bool
    can_create: bool
    can_write: bool
    can_delete: bool


class RolePermissionUpdate(BaseModel):
    role: str
    module: str
    can_read: bool = False
    can_create: bool = False
    can_write: bool = False
    can_delete: bool = False


class RolePermissionBulkUpdate(BaseModel):
    permissions: List[RolePermissionUpdate]


class ModuleInfo(BaseModel):
    modules: List[str]
    actions: List[str]
    roles: List[str]
