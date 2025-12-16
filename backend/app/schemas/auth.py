from pydantic import BaseModel, EmailStr
from datetime import datetime
from pydantic import Field

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(min_length=6)

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    credits: int
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
