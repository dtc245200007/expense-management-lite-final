from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    income: Decimal = Decimal(0)
    expense: Decimal = Decimal(0)
    net: Decimal = Decimal(0)
    available_balance: Decimal = Decimal(0)


class DashboardCategorySpending(BaseModel):
    category_id: str
    category_name: str
    color: str
    icon: str
    amount: Decimal
    percentage: float


class DashboardTrendPoint(BaseModel):
    month: int
    year: int
    income: Decimal = Decimal(0)
    expense: Decimal = Decimal(0)


class DashboardRecentTransaction(BaseModel):
    id: str
    category_id: str
    category_name: str
    category_color: str
    category_icon: str
    amount: Decimal
    type: str
    txn_date: date
    note: Optional[str] = None


class DashboardOut(BaseModel):
    month: int
    year: int
    summary: DashboardSummary
    spending_by_category: list[DashboardCategorySpending] = Field(default_factory=list)
    trend: list[DashboardTrendPoint] = Field(default_factory=list)
    recent_transactions: list[DashboardRecentTransaction] = Field(default_factory=list)
