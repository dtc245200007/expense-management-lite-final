from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.clock import business_today
from app.database import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.report import ReportOut


router = APIRouter(prefix="/reports", tags=["reports"])


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        return start, date(year + 1, 1, 1)
    return start, date(year, month + 1, 1)


def _shift_month(year: int, month: int, offset: int) -> tuple[int, int]:
    absolute_month = year * 12 + month - 1 + offset
    shifted_year, shifted_month = divmod(absolute_month, 12)
    return shifted_year, shifted_month + 1


def _percentage(amount: Decimal, total: Decimal) -> float:
    if total <= 0:
        return 0
    return round(float(amount / total * Decimal(100)), 1)


def _change_percentage(current: Decimal, previous: Decimal) -> Optional[float]:
    if previous == 0:
        return 0 if current == 0 else None
    return round(float((current - previous) / previous * Decimal(100)), 1)


def _period_totals(db: Session, user_id: str, start: date, end: date) -> dict[str, Decimal]:
    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user_id,
            Transaction.txn_date >= start,
            Transaction.txn_date < end,
        )
        .group_by(Transaction.type)
        .all()
    )
    totals = {"income": Decimal(0), "expense": Decimal(0)}
    for transaction_type, amount in rows:
        if transaction_type in totals:
            totals[transaction_type] = Decimal(amount or 0)
    return totals


def _category_totals(db: Session, user_id: str, start: date, end: date) -> dict[str, dict]:
    amount_sum = func.sum(Transaction.amount).label("amount")
    transaction_count = func.count(Transaction.id).label("transaction_count")
    rows = (
        db.query(
            Category.id,
            Category.name,
            Category.icon,
            amount_sum,
            transaction_count,
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Category.user_id == user_id,
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.txn_date >= start,
            Transaction.txn_date < end,
        )
        .group_by(Category.id, Category.name, Category.icon)
        .all()
    )
    return {
        category_id: {
            "category_id": category_id,
            "category_name": category_name,
            "icon": icon,
            "amount": Decimal(amount or 0),
            "transaction_count": int(count or 0),
        }
        for category_id, category_name, icon, amount, count in rows
    }


@router.get("/", response_model=ReportOut)
def get_report(
    month: Optional[int] = Query(default=None, ge=1, le=12),
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = business_today()
    selected_month = month or today.month
    selected_year = year or today.year
    previous_year, previous_month = _shift_month(selected_year, selected_month, -1)

    current_start, current_end = _month_bounds(selected_year, selected_month)
    previous_start, previous_end = _month_bounds(previous_year, previous_month)

    current_totals = _period_totals(db, current_user.id, current_start, current_end)
    previous_totals = _period_totals(db, current_user.id, previous_start, previous_end)
    current_net = current_totals["income"] - current_totals["expense"]
    previous_net = previous_totals["income"] - previous_totals["expense"]

    current_categories = _category_totals(db, current_user.id, current_start, current_end)
    previous_categories = _category_totals(db, current_user.id, previous_start, previous_end)
    category_ids = set(current_categories) | set(previous_categories)
    categories = []
    for category_id in category_ids:
        current = current_categories.get(category_id)
        previous = previous_categories.get(category_id)
        category = current or previous
        current_amount = current["amount"] if current else Decimal(0)
        previous_amount = previous["amount"] if previous else Decimal(0)
        categories.append(
            {
                "category_id": category_id,
                "category_name": category["category_name"],
                "icon": category["icon"],
                "current_amount": current_amount,
                "current_share": _percentage(current_amount, current_totals["expense"]),
                "current_transaction_count": current["transaction_count"] if current else 0,
                "previous_amount": previous_amount,
                "previous_share": _percentage(previous_amount, previous_totals["expense"]),
                "previous_transaction_count": previous["transaction_count"] if previous else 0,
                "difference": current_amount - previous_amount,
                "change_percentage": _change_percentage(current_amount, previous_amount),
            }
        )
    categories.sort(
        key=lambda item: (item["current_amount"], item["previous_amount"], item["category_name"]),
        reverse=True,
    )

    has_data = any(
        amount != 0
        for amount in (
            current_totals["income"],
            current_totals["expense"],
            previous_totals["income"],
            previous_totals["expense"],
        )
    )

    return ReportOut(
        current_period={"month": selected_month, "year": selected_year},
        previous_period={"month": previous_month, "year": previous_year},
        summary={
            "current": {
                "income": current_totals["income"],
                "expense": current_totals["expense"],
                "net": current_net,
            },
            "previous": {
                "income": previous_totals["income"],
                "expense": previous_totals["expense"],
                "net": previous_net,
            },
            "income_difference": current_totals["income"] - previous_totals["income"],
            "expense_difference": current_totals["expense"] - previous_totals["expense"],
            "net_difference": current_net - previous_net,
            "income_change_percentage": _change_percentage(
                current_totals["income"], previous_totals["income"]
            ),
            "expense_change_percentage": _change_percentage(
                current_totals["expense"], previous_totals["expense"]
            ),
            "net_change_percentage": _change_percentage(current_net, previous_net),
        },
        categories=categories,
        has_data=has_data,
    )
