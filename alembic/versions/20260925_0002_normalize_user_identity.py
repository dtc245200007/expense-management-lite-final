"""Add normalized username and email identity keys.

Revision ID: 20260925_0002
Revises: 20260901_0001
"""

from collections import defaultdict
from collections.abc import Sequence
import unicodedata

from alembic import op
import sqlalchemy as sa


revision: str = "20260925_0002"
down_revision: str | Sequence[str] | None = "20260901_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _normalize(value: str) -> str:
    return unicodedata.normalize("NFKC", value).strip().casefold()


def _identity_rows(connection: sa.Connection) -> list[sa.Row]:
    return list(connection.execute(sa.text("SELECT id, username, email FROM users")))


def _preflight(rows: list[sa.Row]) -> None:
    problems: list[str] = []
    for column, index in (("username", 1), ("email", 2)):
        groups: dict[str, list[str]] = defaultdict(list)
        blank_ids: list[str] = []
        for row in rows:
            normalized = _normalize(row[index])
            if not normalized:
                blank_ids.append(row[0])
            else:
                groups[normalized].append(row[0])

        collisions = [ids for ids in groups.values() if len(ids) > 1]
        if blank_ids:
            problems.append(f"{column} blank ids={','.join(blank_ids[:5])}")
        if collisions:
            samples = ";".join(",".join(ids[:5]) for ids in collisions[:5])
            problems.append(f"{column} collisions={len(collisions)} ids={samples}")

    if problems:
        raise RuntimeError(
            "Không thể chuẩn hóa định danh người dùng; hãy xử lý dữ liệu xung đột trước: "
            + " | ".join(problems)
        )


def upgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        connection.execute(sa.text("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE"))
    rows = _identity_rows(connection)
    _preflight(rows)

    op.add_column("users", sa.Column("username_normalized", sa.String(), nullable=True))
    op.add_column("users", sa.Column("email_normalized", sa.String(), nullable=True))

    for row in rows:
        connection.execute(
            sa.text(
                "UPDATE users "
                "SET username_normalized = :username_normalized, "
                "email_normalized = :email_normalized WHERE id = :user_id"
            ),
            {
                "username_normalized": _normalize(row[1]),
                "email_normalized": _normalize(row[2]),
                "user_id": row[0],
            },
        )

    _preflight(_identity_rows(connection))
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("username_normalized", existing_type=sa.String(), nullable=False)
        batch_op.alter_column("email_normalized", existing_type=sa.String(), nullable=False)

    op.create_index(
        "uq_users_username_normalized",
        "users",
        ["username_normalized"],
        unique=True,
    )
    op.create_index(
        "uq_users_email_normalized",
        "users",
        ["email_normalized"],
        unique=True,
    )
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")


def downgrade() -> None:
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.drop_index("uq_users_email_normalized", table_name="users")
    op.drop_index("uq_users_username_normalized", table_name="users")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("email_normalized")
        batch_op.drop_column("username_normalized")
