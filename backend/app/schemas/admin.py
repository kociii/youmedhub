from pydantic import BaseModel
from datetime import datetime

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    is_admin: bool

class UserListResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserDetailResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class UserUpdateRequest(BaseModel):
    username: str | None = None
    email: str | None = None