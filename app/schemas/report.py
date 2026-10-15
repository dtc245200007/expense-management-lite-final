from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ReportPeriod(BaseModel):
    month: int
    year: int


class ReportPeriodTotals(BaseModel):
    income: Decimal = Decimal(0)
    expense: Decimal = Decimal(0)
    net: Decimal = Decimal(0)


class ReportSummary(BaseModel):
    current: ReportPeriodTotals
    previous: ReportPeriodTotals
    income_difference: Decimal = Decimal(0)
    expense_difference: Decimal = Decimal(0)
    net_difference: Decimal = Decimal(0)
    income_change_percentage: Optional[float] = None
    expense_change_percentage: Optional[float] = None
    net_change_percentage: Optional[float] = None


class ReportCategoryComparison(BaseModel):
    category_id: str
    category_name: str
    icon: str
    current_amount: Decimal = Decimal(0)
    current_share: float = 0
    current_transaction_count: int = 0
    previous_amount: Decimal = Decimal(0)
    previous_share: float = 0
    previous_transaction_count: int = 0
    difference: Decimal = Decimal(0)
    change_percentage: Optional[float] = None


class ReportOut(BaseModel):
    current_period: ReportPeriod
    previous_period: ReportPeriod
    summary: ReportSummary
    categories: list[ReportCategoryComparison] = Field(default_factory=list)
    has_data: bool = False
