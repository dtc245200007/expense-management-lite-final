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


def user_columns(database: Path) -> set[str]:
    with sqlite3.connect(database) as connection:
        return {row[1] for row in connection.execute("PRAGMA table_info(users)")}


def test_identity_migration_upgrade_and_downgrade(tmp_path: Path):
    database = tmp_path / "migration-roundtrip.db"
    assert run_alembic(database, "upgrade", "20260901_0001").returncode == 0
    with sqlite3.connect(database) as connection:
        connection.execute(
            "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
            ("u1", "  Ｍinh  ", "MINH@EXAMPLE.COM", "test-only"),
        )

    upgraded = run_alembic(database, "upgrade", "head")
    assert upgraded.returncode == 0, upgraded.stderr
    with sqlite3.connect(database) as connection:
        row = connection.execute(
            "SELECT username, email, username_normalized, email_normalized FROM users WHERE id = 'u1'"
        ).fetchone()
        indexes = {item[1] for item in connection.execute("PRAGMA index_list(users)")}
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "INSERT INTO users "
                "(id, username, username_normalized, email, email_normalized, password_hash) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                ("u2", "MINH", "minh", "other@example.com", "other@example.com", "test-only"),
            )
    assert row == ("  Ｍinh  ", "MINH@EXAMPLE.COM", "minh", "minh@example.com")
    assert {"uq_users_username_normalized", "uq_users_email_normalized"} <= indexes
    assert "ix_users_username" not in indexes
    assert "ix_users_email" not in indexes

    downgraded = run_alembic(database, "downgrade", "20260901_0001")
    assert downgraded.returncode == 0, downgraded.stderr
    assert "username_normalized" not in user_columns(database)
    assert "email_normalized" not in user_columns(database)


def test_identity_migration_stops_before_ddl_on_collision(tmp_path: Path):
    database = tmp_path / "migration-collision.db"
    assert run_alembic(database, "upgrade", "20260901_0001").returncode == 0
    with sqlite3.connect(database) as connection:
        connection.executemany(
            "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
            [
                ("u1", "Minh", "one@example.com", "test-only"),
                ("u2", "  ＭINH  ", "two@example.com", "test-only"),
            ],
        )

    failed = run_alembic(database, "upgrade", "head")
    assert failed.returncode != 0
    assert "username collisions=1 ids=u1,u2" in failed.stderr
    assert "username_normalized" not in user_columns(database)
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 2
