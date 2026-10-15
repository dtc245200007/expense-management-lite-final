"""Balance for Lite: income minus expense, without savings-goal allocations."""
from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction


def compute_available_balance(db: Session, user_id: str, through_date: date | None = None) -> Decimal:
    query = db.query(Transaction.type, func.sum(Transaction.amount)).filter(Transaction.user_id == user_id)
    if through_date is not None:
        query = query.filter(Transaction.txn_date <= through_date)
    totals = {kind: Decimal(amount or 0) for kind, amount in query.group_by(Transaction.type).all()}
    return totals.get("income", Decimal(0)) - totals.get("expense", Decimal(0))
