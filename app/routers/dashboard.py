from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.clock import business_today
from app.core.finance import compute_available_balance
from app.database import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.dashboard import DashboardOut


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        return start, date(year + 1, 1, 1)
    return start, date(year, month + 1, 1)


def _shift_month(year: int, month: int, offset: int) -> tuple[int, int]:
    absolute_month = year * 12 + (month - 1) + offset
    shifted_year, shifted_month = divmod(absolute_month, 12)
    return shifted_year, shifted_month + 1


def _percentage(amount: Decimal, total: Decimal) -> float:
    if total <= 0:
        return 0
    return round(float(amount / total * Decimal(100)), 1)


@router.get("/", response_model=DashboardOut)
def get_dashboard(
    month: Optional[int] = Query(default=None, ge=1, le=12),
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = business_today()
    selected_month = month or today.month
    selected_year = year or today.year
    period_start, period_end = _month_bounds(selected_year, selected_month)

    monthly_rows = (
        db.query(Transaction.type, func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.txn_date >= period_start,
            Transaction.txn_date < period_end,
        )
        .group_by(Transaction.type)
        .all()
    )
    monthly_totals = {row_type: Decimal(total or 0) for row_type, total in monthly_rows}
    income = monthly_totals.get("income", Decimal(0))
    expense = monthly_totals.get("expense", Decimal(0))

    category_amount = func.sum(Transaction.amount).label("amount")
    category_rows = (
        db.query(Category.id, Category.name, Category.color, Category.icon, category_amount)
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Category.user_id == current_user.id,
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.txn_date >= period_start,
            Transaction.txn_date < period_end,
        )
        .group_by(Category.id, Category.name, Category.color, Category.icon)
        .order_by(category_amount.desc())
        .all()
    )
    spending_by_category = []
    for category_id, category_name, color, icon, amount in category_rows:
        amount = Decimal(amount or 0)
        spending_by_category.append(
            {
                "category_id": category_id,
                "category_name": category_name,
                "color": color,
                "icon": icon,
                "amount": amount,
                "percentage": _percentage(amount, expense),
            }
        )

    trend_months = [_shift_month(selected_year, selected_month, offset) for offset in (-2, -1, 0)]
    trend_start, _ = _month_bounds(*trend_months[0])
    trend_year = func.extract("year", Transaction.txn_date).label("year")
    trend_month = func.extract("month", Transaction.txn_date).label("month")
    trend_rows = (
        db.query(trend_year, trend_month, Transaction.type, func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.txn_date >= trend_start,
            Transaction.txn_date < period_end,
        )
        .group_by(trend_year, trend_month, Transaction.type)
        .all()
    )
    trend_totals: dict[tuple[int, int], dict[str, Decimal]] = {
        point: {"income": Decimal(0), "expense": Decimal(0)} for point in trend_months
    }
    for row_year, row_month, row_type, total in trend_rows:
        point = (int(row_year), int(row_month))
        if point in trend_totals and row_type in trend_totals[point]:
            trend_totals[point][row_type] = Decimal(total or 0)
    trend = [
        {
            "year": point_year,
            "month": point_month,
            "income": trend_totals[(point_year, point_month)]["income"],
            "expense": trend_totals[(point_year, point_month)]["expense"],
        }
        for point_year, point_month in trend_months
    ]

    recent_rows = (
        db.query(Transaction, Category.name, Category.color, Category.icon)
        .join(Category, Category.id == Transaction.category_id)
        .filter(
            Transaction.user_id == current_user.id,
            Category.user_id == current_user.id,
            Transaction.txn_date >= period_start,
            Transaction.txn_date < period_end,
        )
        .order_by(Transaction.txn_date.desc(), Transaction.id.desc())
        .limit(5)
        .all()
    )
    recent_transactions = [
        {
            "id": transaction.id,
            "category_id": transaction.category_id,
            "category_name": category_name,
            "category_color": color,
            "category_icon": icon,
            "amount": Decimal(transaction.amount),
            "type": transaction.type,
            "txn_date": transaction.txn_date,
            "note": transaction.note,
        }
        for transaction, category_name, color, icon in recent_rows
    ]

    return DashboardOut(
        month=selected_month,
        year=selected_year,
        summary={
            "income": income,
            "expense": expense,
            "net": income - expense,
            "available_balance": compute_available_balance(
                db,
                current_user.id,
                through_date=period_end - timedelta(days=1),
            ),
        },
        spending_by_category=spending_by_category,
        trend=trend,
        recent_transactions=recent_transactions,
    )
