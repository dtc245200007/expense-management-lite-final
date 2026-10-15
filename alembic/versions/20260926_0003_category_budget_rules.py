"""Add normalized category names and budget year constraint.

Revision ID: 20260926_0003
Revises: 20260925_0002
"""

from collections import defaultdict
from collections.abc import Sequence
import unicodedata

from alembic import op
import sqlalchemy as sa


revision: str = "20260926_0003"
down_revision: str | Sequence[str] | None = "20260925_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _normalize(value: str) -> str:
    return unicodedata.normalize("NFKC", value).strip().casefold()


def _category_rows(connection: sa.Connection) -> list[sa.Row]:
    return list(connection.execute(sa.text("SELECT id, user_id, type, name FROM categories")))


def _preflight(connection: sa.Connection, categories: list[sa.Row]) -> None:
    problems: list[str] = []
    groups: dict[tuple[str, str, str], list[str]] = defaultdict(list)
    blank_ids: list[str] = []

    for row in categories:
        normalized = _normalize(row[3])
        if not normalized:
            blank_ids.append(row[0])
        else:
            groups[(row[1], row[2], normalized)].append(row[0])

    collisions = [ids for ids in groups.values() if len(ids) > 1]
    if blank_ids:
        problems.append(f"category blank ids={','.join(blank_ids[:5])}")
    if collisions:
        samples = ";".join(",".join(ids[:5]) for ids in collisions[:5])
        problems.append(f"category collisions={len(collisions)} ids={samples}")

    invalid_budget_ids = [
        row[0]
        for row in connection.execute(
            sa.text("SELECT id FROM budgets WHERE year < 2000 OR year > 2100")
        )
    ]
    if invalid_budget_ids:
        problems.append(
            "budget invalid year ids=" + ",".join(invalid_budget_ids[:5])
        )

    if problems:
        raise RuntimeError(
            "Không thể áp dụng quy tắc danh mục/ngân sách; hãy xử lý dữ liệu xung đột trước: "
            + " | ".join(problems)
        )


def upgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        connection.execute(
            sa.text("LOCK TABLE categories, budgets IN SHARE ROW EXCLUSIVE MODE")
        )

    categories = _category_rows(connection)
    _preflight(connection, categories)

    op.add_column("categories", sa.Column("name_normalized", sa.String(), nullable=True))
    for row in categories:
        connection.execute(
            sa.text(
                "UPDATE categories SET name_normalized = :name_normalized "
                "WHERE id = :category_id"
            ),
            {"name_normalized": _normalize(row[3]), "category_id": row[0]},
        )

    with op.batch_alter_table("categories") as batch_op:
        batch_op.alter_column("name_normalized", existing_type=sa.String(), nullable=False)
        batch_op.create_check_constraint(
            "ck_categories_name_not_blank",
            "length(trim(name)) > 0",
        )
        batch_op.create_check_constraint(
            "ck_categories_name_normalized_not_blank",
            "length(name_normalized) > 0",
        )

    op.create_index(
        "uq_categories_owner_type_name_norm",
        "categories",
        ["user_id", "type", "name_normalized"],
        unique=True,
    )

    with op.batch_alter_table("budgets") as batch_op:
        batch_op.create_check_constraint(
            "ck_budgets_year",
            "year BETWEEN 2000 AND 2100",
        )


def downgrade() -> None:
    with op.batch_alter_table("budgets") as batch_op:
        batch_op.drop_constraint("ck_budgets_year", type_="check")

    op.drop_index("uq_categories_owner_type_name_norm", table_name="categories")
    with op.batch_alter_table("categories") as batch_op:
        batch_op.drop_constraint(
            "ck_categories_name_normalized_not_blank",
            type_="check",
        )
        batch_op.drop_constraint("ck_categories_name_not_blank", type_="check")
        batch_op.drop_column("name_normalized")
