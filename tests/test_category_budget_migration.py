import os
from pathlib import Path
import sqlite3
import subprocess
import sys

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def run_alembic(database: Path, *args: str) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = f"sqlite:///{database.as_posix()}"
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=PROJECT_ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )


def prepare_revision_0002(database: Path) -> None:
    result = run_alembic(database, "upgrade", "20260925_0002")
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(database) as connection:
        connection.execute(
            "INSERT INTO users "
            "(id, username, username_normalized, email, email_normalized, password_hash) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            ("u1", "owner", "owner", "owner@example.com", "owner@example.com", "test-only"),
        )


def category_columns(database: Path) -> set[str]:
    with sqlite3.connect(database) as connection:
        return {row[1] for row in connection.execute("PRAGMA table_info(categories)")}


def test_category_budget_migration_upgrade_and_downgrade(tmp_path: Path):
    database = tmp_path / "category-budget-roundtrip.db"
    prepare_revision_0002(database)
    with sqlite3.connect(database) as connection:
        connection.execute(
            "INSERT INTO categories (id, user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?, ?)",
            ("food", "u1", "  Ｆood  ", "expense", "#000000", "utensils"),
        )
        connection.execute(
            "INSERT INTO budgets (id, user_id, category_id, month, year, limit_amount) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            ("b1", "u1", "food", 9, 2026, 100),
        )

    upgraded = run_alembic(database, "upgrade", "head")
    assert upgraded.returncode == 0, upgraded.stderr
    with sqlite3.connect(database) as connection:
        assert connection.execute(
            "SELECT name_normalized FROM categories WHERE id = 'food'"
        ).fetchone()[0] == "food"
        indexes = {row[1] for row in connection.execute("PRAGMA index_list(categories)")}
        assert "uq_categories_owner_type_name_norm" in indexes
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "INSERT INTO categories "
                "(id, user_id, name, name_normalized, type, color, icon) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("duplicate", "u1", "FOOD", "food", "expense", "#000000", "wallet"),
            )
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "INSERT INTO budgets (id, user_id, category_id, month, year, limit_amount) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                ("invalid-year", "u1", "food", 9, 1999, 100),
            )

    downgraded = run_alembic(database, "downgrade", "20260925_0002")
    assert downgraded.returncode == 0, downgraded.stderr
    assert "name_normalized" not in category_columns(database)


def test_category_budget_migration_stops_before_ddl_on_conflict(tmp_path: Path):
    database = tmp_path / "category-budget-conflict.db"
    prepare_revision_0002(database)
    with sqlite3.connect(database) as connection:
        connection.executemany(
            "INSERT INTO categories (id, user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?, ?)",
            [
                ("c1", "u1", "Food", "expense", "#000000", "utensils"),
                ("c2", "u1", "  ＦＯＯＤ  ", "expense", "#111111", "wallet"),
            ],
        )
        connection.execute(
            "INSERT INTO budgets (id, user_id, category_id, month, year, limit_amount) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            ("b1", "u1", "c1", 9, 1999, 100),
        )

    failed = run_alembic(database, "upgrade", "head")
    assert failed.returncode != 0
    assert "category collisions=1 ids=c1,c2" in failed.stderr
    assert "budget invalid year ids=b1" in failed.stderr
    assert "name_normalized" not in category_columns(database)
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT COUNT(*) FROM categories").fetchone()[0] == 2
        assert connection.execute("SELECT COUNT(*) FROM budgets").fetchone()[0] == 1
