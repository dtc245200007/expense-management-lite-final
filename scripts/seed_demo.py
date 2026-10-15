"""Idempotent synthetic fixtures for Lite; never imports the original database."""
import argparse
import os
from datetime import date, timedelta
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from app.core.security import hash_password, verify_password
from app.core.clock import business_today
from app.core.normalization import normalize_identity
from app.database import SessionLocal
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

DEMO_USER_ID = "lite-demo-user"


def stable_id(key: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"expense-tracker-lite-demo/{key}"))


def sample_rows(as_of: date) -> list[tuple[str, str, Decimal, date, str]]:
    current = as_of.replace(day=1)
    previous = (current - timedelta(days=1)).replace(day=1)
    return [
        ("salary", "salary", Decimal("15000000"), current, "Lương tháng — dữ liệu mẫu"),
        ("food", "food", Decimal("350000"), current, "Đi chợ — dữ liệu mẫu"),
        ("travel", "travel", Decimal("200000"), current, "Di chuyển — dữ liệu mẫu"),
        ("home", "home", Decimal("3000000"), current, "Tiền nhà — dữ liệu mẫu"),
        ("coffee", "food", Decimal("45000"), min(current + timedelta(days=1), as_of), "Cà phê — dữ liệu mẫu"),
        ("previous-salary", "salary", Decimal("14000000"), previous, "Lương tháng trước — dữ liệu mẫu"),
        ("previous-food", "food", Decimal("500000"), previous, "Ăn uống tháng trước — dữ liệu mẫu"),
        ("previous-travel", "travel", Decimal("300000"), previous, "Di chuyển tháng trước — dữ liệu mẫu"),
        ("previous-home", "home", Decimal("3000000"), previous, "Tiền nhà tháng trước — dữ liệu mẫu"),
    ]


def seed_demo(as_of: date, password: str) -> dict[str, int]:
    if not 12 <= len(password) <= 1024:
        raise ValueError("Set a DEMO_PASSWORD of 12 to 1024 characters in the Lite .env.")
    counts = {"users": 0, "categories": 0, "transactions": 0}
    with SessionLocal() as db:
        # Preflight all identity namespaces, including historical @ usernames.
        conflicts = db.query(User).filter(
            (User.username_normalized.in_(["demo", "demo@example.com"]))
            | (User.email_normalized == "demo@example.com")
            | (User.id == DEMO_USER_ID)
        ).all()
        if any(candidate.id != DEMO_USER_ID for candidate in conflicts):
            raise ValueError("Demo username/email belongs to a non-fixture account; nothing was changed.")
        user = db.get(User, DEMO_USER_ID)
        if user is not None and (normalize_identity(user.username) != "demo" or normalize_identity(user.email) != "demo@example.com"):
            raise ValueError("Demo fixture identity was changed; nothing was changed.")
        if user is None:
            user = User(id=DEMO_USER_ID, username="demo", email="demo@example.com", password_hash=hash_password(password))
            db.add(user)
            db.flush()
            counts["users"] += 1
        elif not verify_password(password, user.password_hash):
            raise ValueError("DEMO_PASSWORD differs from the existing demo account; nothing was changed.")
        for key, name, kind, color, icon in [
            ("salary", "Lương", "income", "#2563eb", "banknote"),
            ("food", "Ăn uống", "expense", "#07845c", "utensils"),
            ("travel", "Di chuyển", "expense", "#f29b00", "car"),
            ("home", "Nhà ở", "expense", "#7757e8", "house"),
        ]:
            category_id = stable_id(f"category/{key}")
            if db.get(Category, category_id) is None:
                db.add(Category(id=category_id, user_id=user.id, name=name, type=kind, color=color, icon=icon))
                counts["categories"] += 1
        db.flush()
        rows = sample_rows(as_of)
        for period in sorted({row[3].replace(day=1) for row in rows}):
            next_period = (period.replace(day=28) + timedelta(days=4)).replace(day=1)
            keys = ["salary", "food", "travel", "home", "coffee"]
            fixture_ids = [stable_id(f"transaction/{period:%Y-%m}/{key}") for key in keys]
            # Recognize IDs generated before this fix without rewriting history.
            fixture_ids += [stable_id(f"transaction/{next_period:%Y-%m}/previous-{key}") for key in keys]
            if db.query(Transaction.id).filter(Transaction.user_id == user.id, Transaction.id.in_(fixture_ids)).first():
                continue
            for key, category, amount, txn_date, note in rows:
                if txn_date.replace(day=1) != period:
                    continue
                txn_id = stable_id(f"transaction/{period:%Y-%m}/{key.removeprefix('previous-')}")
                db.add(Transaction(id=txn_id, user_id=user.id, category_id=stable_id(f"category/{category}"), amount=amount, type="income" if category == "salary" else "expense", txn_date=txn_date, note=note))
                counts["transactions"] += 1
        db.commit()
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, default=business_today(), help="YYYY-MM-DD; defaults to today's Vietnamese date")
    args = parser.parse_args()
    if args.as_of > business_today():
        parser.error("--as-of must not be in the future")
    print("Created:", seed_demo(args.as_of, os.getenv("DEMO_PASSWORD", "")))
    print("Login: demo; password: DEMO_PASSWORD in the Lite .env. All data is synthetic.")


if __name__ == "__main__":
    main()
