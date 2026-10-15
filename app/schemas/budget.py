from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional

class BudgetCreate(BaseModel):
    category_id: str
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    limit_amount: Decimal = Field(gt=0)

class BudgetUpdate(BaseModel):
    limit_amount: Optional[Decimal] = Field(default=None, gt=0)

class BudgetOut(BaseModel):
    id: str
    category_id: str
    month: int
    year: int
    limit_amount: Decimal
    spent: Decimal = 0
    is_over: bool = False

    class Config:
        from_attributes = True
