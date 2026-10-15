from pydantic import BaseModel, Field, field_validator
from datetime import date
from decimal import Decimal
from typing import Optional
from app.core.clock import business_today

class TransactionCreate(BaseModel):
    category_id: str
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2, lt=Decimal("1000000000000"))
    txn_date: date
    note: Optional[str] = None

    @field_validator("txn_date")
    @classmethod
    def no_future_date(cls, value: date) -> date:
        if value > business_today():
            raise ValueError("Không thể tạo giao dịch cho ngày trong tương lai")
        return value

class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2, lt=Decimal("1000000000000"))
    txn_date: Optional[date] = None
    note: Optional[str] = None

    @field_validator("category_id", "amount", mode="before")
    @classmethod
    def required_when_present(cls, value):
        if value is None:
            raise ValueError("Danh mục và số tiền không được để trống")
        return value

    @field_validator("txn_date")
    @classmethod
    def no_future_date(cls, value: Optional[date]) -> date:
        if value is None:
            raise ValueError("Ngày giao dịch không được để trống")
        if value > business_today():
            raise ValueError("Không thể tạo giao dịch cho ngày trong tương lai")
        return value

class TransactionOut(BaseModel):
    id: str
    category_id: str
    amount: Decimal
    type: str
    txn_date: date
    note: Optional[str] = None

    class Config:
        from_attributes = True
