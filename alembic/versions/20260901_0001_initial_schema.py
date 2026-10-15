"""Create the initial production schema.

Revision ID: 20260901_0001
Revises:
Create Date: 2026-09-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260901_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reset_token_hash", sa.String(), nullable=True),
        sa.Column("reset_token_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "categories",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=False),
        sa.Column("icon", sa.String(), server_default="circle-dollar-sign", nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "saving_goals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("completion_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("completion_mode", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "ai_conversations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_conversations_user_id", "ai_conversations", ["user_id"])
    op.create_table(
        "budgets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("category_id", sa.String(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("limit_amount", sa.Numeric(14, 2), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "transactions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("category_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("txn_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "goal_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("goal_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("cost", sa.Numeric(14, 2), nullable=False),
        sa.Column("is_purchased", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["saving_goals.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "goal_transactions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("goal_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("txn_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["goal_id"], ["saving_goals.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "ai_messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("context_month", sa.Integer(), nullable=True),
        sa.Column("context_year", sa.Integer(), nullable=True),
        sa.Column("evidence_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["ai_conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_messages_conversation_id", "ai_messages", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_messages_conversation_id", table_name="ai_messages")
    op.drop_table("ai_messages")
    op.drop_table("goal_transactions")
    op.drop_table("goal_items")
    op.drop_table("transactions")
    op.drop_table("budgets")
    op.drop_index("ix_ai_conversations_user_id", table_name="ai_conversations")
    op.drop_table("ai_conversations")
    op.drop_table("saving_goals")
    op.drop_table("categories")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
