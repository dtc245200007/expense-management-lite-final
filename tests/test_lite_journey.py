from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.models.transaction import Transaction
from app.models.user import User
from scripts import seed_demo
from conftest import register_and_login


def category(client, headers, name="Ăn uống", kind="expense"):
    response = client.post("/api/categories/", headers=headers, json={"name": name, "type": kind, "color": "#07845c", "icon": "utensils"})
    assert response.status_code == 200, response.text
    return response.json()


def transaction(client, headers, category_id, amount, note="Bữa trưa mẫu"):
    response = client.post("/api/transactions/", headers=headers, json={"category_id": category_id, "amount": amount, "txn_date": "2025-01-05", "note": note})
    assert response.status_code == 200, response.text
    return response.json()


def test_register_login_crud_filter_dashboard_report_and_delete(client):
    headers = register_and_login(client)
    food = category(client, headers)
    salary = category(client, headers, "Lương", "income")
    expense = transaction(client, headers, food["id"], "120000")
    transaction(client, headers, salary["id"], "1000000", "Lương mẫu")
    assert client.get("/api/auth/me", headers=headers).json()["username"] == "owner"
    updated = client.put(f"/api/transactions/{expense['id']}", headers=headers, json={"amount": "150000", "note": "Ăn trưa đã sửa"})
    assert updated.status_code == 200
    rows = client.get("/api/transactions/?type=expense&keyword=đã+sửa&from_date=2025-01-01&to_date=2025-01-31", headers=headers).json()
    assert [row["id"] for row in rows] == [expense["id"]]
    dashboard = client.get("/api/dashboard/?month=1&year=2025", headers=headers)
    assert dashboard.status_code == 200
    assert Decimal(dashboard.json()["summary"]["net"]) == Decimal("850000")
    assert "budgets" not in dashboard.json() and "goals" not in dashboard.json()
    report = client.get("/api/reports/?month=1&year=2025", headers=headers).json()
    assert Decimal(report["summary"]["current"]["expense"]) == Decimal("150000")
    assert report["categories"][0]["current_share"] == 100
    assert client.delete(f"/api/transactions/{expense['id']}", headers=headers).status_code == 200
    assert client.delete(f"/api/categories/{food['id']}", headers=headers).status_code == 200
    report = client.get("/api/reports/?month=1&year=2025", headers=headers).json()
    assert Decimal(report["summary"]["current"]["expense"]) == 0


def test_owner_isolation_on_reads_writes_and_aggregates(client):
    owner = register_and_login(client)
    outsider = register_and_login(client, "outsider")
    food = category(client, owner)
    expense = transaction(client, owner, food["id"], "120000")
    assert client.get("/api/categories/", headers=outsider).json() == []
    assert client.get("/api/transactions/", headers=outsider).json() == []
    assert client.put(f"/api/categories/{food['id']}", headers=outsider, json={"name": "Hacked"}).status_code == 404
    assert client.delete(f"/api/categories/{food['id']}", headers=outsider).status_code == 404
    assert client.put(f"/api/transactions/{expense['id']}", headers=outsider, json={"amount": 1}).status_code == 404
    assert client.delete(f"/api/transactions/{expense['id']}", headers=outsider).status_code == 404
    assert client.post("/api/transactions/", headers=outsider, json={"category_id": food["id"], "amount": 1, "txn_date": "2025-01-05"}).status_code == 404
    for endpoint in ["dashboard", "reports"]:
        result = client.get(f"/api/{endpoint}/?month=1&year=2025", headers=outsider).json()
        totals = result["summary"] if endpoint == "dashboard" else result["summary"]["current"]
        assert Decimal(totals["expense"]) == 0
    assert len(client.get("/api/transactions/", headers=owner).json()) == 1


def test_authentication_and_input_validation(client):
    assert client.get("/api/transactions/").status_code == 401
    assert client.get("/api/categories/", headers={"Authorization": "Bearer invalid"}).status_code == 401
    headers = register_and_login(client)
    assert client.post("/api/auth/login", data={"username": "owner", "password": "incorrect"}).status_code == 401
    food = category(client, headers)
    duplicate = client.post("/api/categories/", headers=headers, json={"name": "  ĂN UỐNG  ", "type": "expense"})
    assert duplicate.status_code == 400
    payload = {"category_id": food["id"], "amount": 0, "txn_date": "2025-01-05"}
    assert client.post("/api/transactions/", headers=headers, json=payload).status_code == 422
    payload.update(amount=100, txn_date=(date.today() + timedelta(days=1)).isoformat())
    assert client.post("/api/transactions/", headers=headers, json=payload).status_code == 422


@pytest.mark.parametrize("path", ["/api/budgets/", "/api/goals/", "/api/assistant/context", "/uploads/avatars/test.png"])
def test_removed_routes_do_not_fall_back_to_spa(client, path):
    assert client.get(path).status_code == 404


@pytest.mark.parametrize("method,path", [("post", "/api/auth/forgot-password"), ("post", "/api/auth/reset-password"), ("post", "/api/auth/me/avatar"), ("put", "/api/auth/me"), ("delete", "/api/auth/me")])
def test_removed_account_mutations_are_unavailable(client, method, path):
    assert client.request(method, path, json={}).status_code in {404, 405}


def test_seed_is_idempotent_and_totals_match_demo(client, db_factory, monkeypatch):
    monkeypatch.setattr(seed_demo, "SessionLocal", db_factory)
    password = "synthetic-demo-password-123"
    assert seed_demo.seed_demo(date(2025, 1, 7), password) == {"users": 1, "categories": 4, "transactions": 9}
    assert seed_demo.seed_demo(date(2025, 1, 7), password) == {"users": 0, "categories": 0, "transactions": 0}
    login = client.post("/api/auth/login", data={"username": "demo", "password": password})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    result = client.get("/api/dashboard/?month=1&year=2025", headers=headers).json()
    assert Decimal(result["summary"]["income"]) == 15000000
    assert Decimal(result["summary"]["expense"]) == 3595000
    assert Decimal(result["summary"]["available_balance"]) == 21605000
    report = client.get("/api/reports/?month=1&year=2025", headers=headers).json()
    assert report["previous_period"] == {"month": 12, "year": 2024}
    assert Decimal(report["summary"]["previous"]["expense"]) == 3800000
    with db_factory() as db:
        assert db.query(Transaction).count() == 9


def test_seed_refuses_non_fixture_account_without_changes(client, db_factory, monkeypatch):
    register_and_login(client, "demo")
    monkeypatch.setattr(seed_demo, "SessionLocal", db_factory)
    with pytest.raises(ValueError, match="non-fixture"):
        seed_demo.seed_demo(date(2025, 1, 7), "synthetic-demo-password-123")
    with db_factory() as db:
        assert db.query(User).count() == 1
        assert db.query(Transaction).count() == 0


def test_fixture_dates_never_exceed_reference_day():
    assert all(row[3] <= date(2025, 1, 1) for row in seed_demo.sample_rows(date(2025, 1, 1)))
