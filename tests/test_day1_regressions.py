from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
from passlib.hash import bcrypt

from app.core import clock
from app.core.security import hash_password, verify_password, pwd_context
from app.models.transaction import Transaction
from app.models.user import User
from scripts import seed_demo
from conftest import register_and_login


@pytest.fixture
def owner(client):
    headers = register_and_login(client)
    category = client.post("/api/categories/", headers=headers, json={"name": "Audit food", "type": "expense"}).json()
    return headers, category["id"]


def create_transaction(client, owner, amount="1.23", txn_date="2025-01-05"):
    headers, category_id = owner
    return client.post("/api/transactions/", headers=headers, json={"category_id": category_id, "amount": amount, "txn_date": txn_date, "note": "Audit"})


@pytest.mark.parametrize("amount", ["0.001", "1.235", "1000000000000", "999999999999.999", "NaN", "Infinity", "-1", "0"])
def test_invalid_money_rejected_for_create_and_update(client, owner, amount):
    transaction = create_transaction(client, owner).json()
    assert create_transaction(client, owner, amount).status_code == 422
    assert client.put("/api/transactions/" + transaction["id"], headers=owner[0], json={"amount": amount}).status_code == 422
    rows = client.get("/api/transactions/", headers=owner[0]).json()
    assert len(rows) == 1 and Decimal(rows[0]["amount"]) == Decimal("1.23")


@pytest.mark.parametrize("amount", ["0.01", "1.23", "999999999999.99"])
def test_money_roundtrip_is_exact(client, owner, amount):
    response = create_transaction(client, owner, amount)
    assert response.status_code == 200, response.text
    updated = client.put("/api/transactions/" + response.json()["id"], headers=owner[0], json={"amount": amount})
    assert updated.status_code == 200
    assert Decimal(updated.json()["amount"]) == Decimal(amount)


@pytest.mark.parametrize("field", ["amount", "category_id", "txn_date"])
def test_required_transaction_fields_reject_explicit_null(client, owner, field):
    row = create_transaction(client, owner).json()
    assert client.put("/api/transactions/" + row["id"], headers=owner[0], json={field: None}).status_code == 422
    # Omitting a field and clearing an optional note remain supported.
    response = client.put("/api/transactions/" + row["id"], headers=owner[0], json={"note": None})
    assert response.status_code == 200 and response.json()["note"] is None
    assert Decimal(response.json()["amount"]) == Decimal("1.23")


@pytest.mark.parametrize("field", ["name", "type", "color", "icon"])
def test_category_null_is_validation_error_without_mutation(client, owner, field):
    headers, category_id = owner
    response = client.put("/api/categories/" + category_id, headers=headers, json={field: None})
    assert response.status_code == 422
    assert client.get("/api/categories/", headers=headers).json()[0]["name"] == "Audit food"


@pytest.mark.parametrize("used", [False, True])
def test_category_type_is_immutable_even_via_api(client, owner, used):
    if used:
        create_transaction(client, owner)
    headers, category_id = owner
    assert client.put("/api/categories/" + category_id, headers=headers, json={"type": "income"}).status_code == 400
    assert client.put("/api/categories/" + category_id, headers=headers, json={"name": "Renamed", "type": "expense"}).status_code == 200
    if used:
        assert client.get("/api/transactions/", headers=headers).json()[0]["type"] == "expense"


@pytest.mark.parametrize("prefix", ["a" * 72, "ệ" * 30])
def test_long_password_suffix_is_authenticated(client, prefix):
    password = prefix + "X"
    r = client.post("/api/auth/register", json={"username": "long-user", "email": "long@example.com", "password": password})
    assert r.status_code == 200
    assert client.post("/api/auth/login", data={"username": "long-user", "password": prefix + "Y"}).status_code == 401
    assert client.post("/api/auth/login", data={"username": "long-user", "password": password}).status_code == 200


def test_legacy_bcrypt_login_migrates_hash_and_rejects_truncated_password(client, db_factory):
    legacy_hash = bcrypt.hash("legacy-password")
    assert not verify_password("a" * 72 + "Y", bcrypt.hash("a" * 72 + "X"))
    assert not verify_password("a" * 72, bcrypt.hash("a" * 72 + "X"))
    with db_factory() as db:
        db.add(User(id="legacy", username="legacy", email="legacy@example.com", password_hash=legacy_hash))
        db.commit()
    assert client.post("/api/auth/login", data={"username": "legacy", "password": "legacy-password"}).status_code == 200
    with db_factory() as db:
        new_hash = db.get(User, "legacy").password_hash
    assert pwd_context.identify(new_hash) == "bcrypt_sha256"
    assert verify_password("legacy-password", new_hash)
    assert client.post("/api/auth/register", json={"username": "longest", "email": "longest@example.com", "password": "x" * 1025}).status_code == 422
    assert client.post("/api/auth/login", data={"username": "legacy", "password": "x" * 1025}).status_code == 401


@pytest.mark.parametrize("username", ["ambiguous@example.com", "ambiguous＠example.com"])
def test_new_usernames_cannot_enter_email_namespace(client, username):
    r = client.post("/api/auth/register", json={"username": username, "email": "first@example.com", "password": "password-123"})
    assert r.status_code == 422


def test_historical_email_collision_uses_email_owner_and_blocks_new_collision(client, db_factory):
    with db_factory() as db:
        db.add_all([
            User(id="first", username="ambiguous@example.com", email="first@example.com", password_hash=hash_password("first-password")),
            User(id="second", username="second", email="ambiguous@example.com", password_hash=hash_password("second-password")),
            User(id="third", username="reserved@example.com", email="third@example.com", password_hash=hash_password("third-password")),
        ])
        db.commit()
    for identifier, password, expected_id in [("ambiguous@example.com", "second-password", "second"), ("first@example.com", "first-password", "first")]:
        r = client.post("/api/auth/login", data={"username": identifier, "password": password})
        assert r.status_code == 200
        assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + r.json()["access_token"]}).json()["id"] == expected_id
    r = client.post("/api/auth/register", json={"username": "new-owner", "email": "reserved@example.com", "password": "password-123"})
    assert r.status_code == 400


@pytest.mark.parametrize("first,second", [(date(2025, 1, 7), date(2025, 2, 7)), (date(2025, 2, 7), date(2025, 1, 7)), (date(2024, 12, 7), date(2025, 1, 7))])
def test_seed_keeps_existing_months_unchanged_in_any_order(db_factory, monkeypatch, first, second):
    monkeypatch.setattr(seed_demo, "SessionLocal", db_factory)
    password = "synthetic-demo-password-123"
    assert seed_demo.seed_demo(first, password)["transactions"] == 9
    with db_factory() as db:
        before = {r.id: (r.amount, r.txn_date, r.note, r.type) for r in db.query(Transaction).all()}
    seed_demo.seed_demo(second, password)
    with db_factory() as db:
        after = {r.id: (r.amount, r.txn_date, r.note, r.type) for r in db.query(Transaction).all()}
    assert all(after[key] == value for key, value in before.items())
    old_periods = {value[1].replace(day=1) for value in before.values()}
    assert not any(key not in before and value[1].replace(day=1) in old_periods for key, value in after.items())
    assert seed_demo.seed_demo(first, password)["transactions"] == 0
    assert seed_demo.seed_demo(second, password)["transactions"] == 0


def test_seed_recognizes_legacy_previous_month_ids(db_factory, monkeypatch):
    monkeypatch.setattr(seed_demo, "SessionLocal", db_factory)
    password = "synthetic-demo-password-123"
    seed_demo.seed_demo(date(2025, 1, 7), password)
    with db_factory() as db:
        rows = db.query(Transaction).filter(Transaction.txn_date < date(2025, 1, 1)).all()
        for row in rows:
            key = next(key for key in ["salary", "food", "travel", "home"] if row.id == seed_demo.stable_id(f"transaction/2024-12/{key}"))
            row.id = seed_demo.stable_id(f"transaction/2025-01/previous-{key}")
        db.commit()
    assert seed_demo.seed_demo(date(2024, 12, 7), password)["transactions"] == 4
    with db_factory() as db:
        assert db.query(Transaction).filter(Transaction.txn_date >= date(2024, 12, 1), Transaction.txn_date < date(2025, 1, 1)).count() == 4


def test_seed_email_collision_fails_cleanly_without_changes(client, db_factory, monkeypatch):
    r = client.post("/api/auth/register", json={"username": "email-owner", "email": "demo@example.com", "password": "password-123"})
    assert r.status_code == 200
    monkeypatch.setattr(seed_demo, "SessionLocal", db_factory)
    with pytest.raises(ValueError, match="non-fixture"):
        seed_demo.seed_demo(date(2025, 1, 7), "synthetic-demo-password-123")
    with db_factory() as db:
        assert db.query(User).count() == 1 and db.query(Transaction).count() == 0


def test_vietnam_midnight_and_month_boundary(client, owner, monkeypatch):
    frozen = datetime(2026, 10, 31, 17, 30, tzinfo=timezone.utc)
    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return frozen.astimezone(tz)
    monkeypatch.setattr(clock, "datetime", FixedDatetime)
    assert clock.business_today() == date(2026, 11, 1)
    assert create_transaction(client, owner, txn_date="2026-11-01").status_code == 200
    assert create_transaction(client, owner, txn_date="2026-11-02").status_code == 422
    dashboard = client.get("/api/dashboard/", headers=owner[0]).json()
    report = client.get("/api/reports/", headers=owner[0]).json()
    assert (dashboard["year"], dashboard["month"]) == (2026, 11)
    assert report["current_period"] == {"year": 2026, "month": 11}
