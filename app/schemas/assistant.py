from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


class AssistantPeriod(BaseModel):
    month: int
    year: int


class AssistantTotals(BaseModel):
    income: Decimal = Decimal(0)
    expense: Decimal = Decimal(0)
    net: Decimal = Decimal(0)
    transaction_count: int = 0


class AssistantCategoryEvidence(BaseModel):
    label: str
    icon: str
    current_amount: Decimal = Decimal(0)
    previous_amount: Decimal = Decimal(0)
    difference: Decimal = Decimal(0)
    current_share: float = 0
    current_transaction_count: int = 0


class AssistantForecast(BaseModel):
    elapsed_days: int
    days_in_month: int
    average_expense_per_day: Decimal = Decimal(0)
    projected_expense: Decimal = Decimal(0)
    projected_net: Decimal = Decimal(0)
    confidence: Literal["low", "medium"] = "low"


class AssistantEvidence(BaseModel):
    current_period: AssistantPeriod
    previous_period: AssistantPeriod
    current: AssistantTotals
    previous: AssistantTotals
    available_balance: Decimal = Decimal(0)
    expense_difference: Decimal = Decimal(0)
    expense_change_percentage: Optional[float] = None
    categories: list[AssistantCategoryEvidence] = Field(default_factory=list)
    forecast: AssistantForecast
    active_budget_count: int = 0
    over_budget_count: int = 0
    active_goal_count: int = 0
    goal_target_total: Decimal = Decimal(0)
    goal_saved_total: Decimal = Decimal(0)


class AssistantContextOut(BaseModel):
    evidence: AssistantEvidence
    has_data: bool
    privacy_notes: list[str]
    model: str


class AssistantMessageOut(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    context_month: Optional[int] = None
    context_year: Optional[int] = None
    evidence: Optional[AssistantEvidence] = None
    created_at: datetime


class AssistantConversationSummary(BaseModel):
    id: str
    title: str
    preview: str = ""
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class AssistantConversationOut(AssistantConversationSummary):
    messages: list[AssistantMessageOut] = Field(default_factory=list)


class AssistantAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    month: Optional[int] = Field(default=None, ge=1, le=12)
    year: Optional[int] = Field(default=None, ge=2000, le=2100)


class AssistantReplyOut(BaseModel):
    conversation: AssistantConversationOut
    model: str
