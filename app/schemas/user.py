from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from app.core.normalization import canonicalize_identity

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=1024)
    email: EmailStr

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = canonicalize_identity(value)
        if len(value) < 3 or "@" in value:
            raise ValueError("Tên đăng nhập cần ít nhất 3 ký tự và không chứa @.")
        return value

class UserLogin(BaseModel):
    identifier: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=80)
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("current_password")
    @classmethod
    def validate_current_password(cls, value: str) -> str:
        if not value:
            raise ValueError("Mật khẩu hiện tại không được để trống.")
        return value

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError("Mật khẩu mới phải có ít nhất 6 ký tự.")
        return value


class DeleteAccountRequest(BaseModel):
    current_password: str
    confirmation: str

    @field_validator("current_password")
    @classmethod
    def validate_delete_password(cls, value: str) -> str:
        if not value:
            raise ValueError("Mật khẩu hiện tại không được để trống.")
        return value

    @field_validator("confirmation")
    @classmethod
    def validate_delete_confirmation(cls, value: str) -> str:
        if value != "XÓA TÀI KHOẢN":
            raise ValueError('Vui lòng nhập chính xác "XÓA TÀI KHOẢN".')
        return value

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)  # khớp rule đăng ký hiện tại (UserRegister)

class MessageResponse(BaseModel):
    message: str
