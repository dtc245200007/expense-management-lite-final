from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

class GoalCreate(BaseModel):
    name: str
    target_amount: Decimal = Field(gt=0)
    deadline: Optional[date] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Tên mục tiêu không được để trống")
        if len(value) > 100:
            raise ValueError("Tên mục tiêu không được vượt quá 100 ký tự")
        return value


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = Field(default=None, gt=0)
    deadline: Optional[date] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Tên mục tiêu không được để trống")
        if len(value) > 100:
            raise ValueError("Tên mục tiêu không được vượt quá 100 ký tự")
        return value

class GoalItemCreate(BaseModel):
    name: str
    cost: Decimal = Field(gt=0)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Tên hạng mục không được để trống")
        return value


class GoalItemUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[Decimal] = Field(default=None, gt=0)
    is_purchased: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Tên hạng mục không được để trống")
        return value

class GoalItemOut(BaseModel):
    id: str
    name: str
    cost: Decimal
    is_purchased: bool
    class Config:
        from_attributes = True

class GoalTxCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    note: Optional[str] = None


class GoalTransactionOut(BaseModel):
    id: str
    amount: Decimal
    type: str
    txn_date: date
    note: Optional[str] = None

    class Config:
        from_attributes = True


class GoalCompleteRequest(BaseModel):
    mode: Literal["keep", "release", "spend"] = "keep"
    category_id: Optional[str] = None
    note: Optional[str] = None

class GoalOut(BaseModel):
    id: str
    name: str
    target_amount: Decimal
    deadline: Optional[date] = None
    status: str
    current_amount: Decimal = 0
    completion_amount: Optional[Decimal] = None
    completion_mode: Optional[Literal["keep", "release", "spend"]] = None
    items: list[GoalItemOut] = Field(default_factory=list)
    class Config:
        from_attributes = True
