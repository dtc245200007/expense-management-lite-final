from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_category_icon_column(engine: Engine) -> None:
    """Add and backfill the category icon column for databases created before it existed."""
    inspector = inspect(engine)
    if "categories" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("categories")}
    if "icon" in columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE categories "
                "ADD COLUMN icon VARCHAR NOT NULL DEFAULT 'circle-dollar-sign'"
            )
        )
        connection.execute(
            text(
                "UPDATE categories "
                "SET icon = CASE WHEN type = 'income' THEN 'banknote' ELSE 'wallet' END"
            )
        )


def ensure_goal_completion_columns(engine: Engine) -> None:
    """Add completed-goal snapshots without requiring a destructive migration."""
    inspector = inspect(engine)
    if "saving_goals" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("saving_goals")}
    with engine.begin() as connection:
        if "completion_amount" not in columns:
            connection.execute(text("ALTER TABLE saving_goals ADD COLUMN completion_amount NUMERIC(14, 2)"))
        if "completion_mode" not in columns:
            connection.execute(text("ALTER TABLE saving_goals ADD COLUMN completion_mode VARCHAR"))

        # Older completed rows did not retain their finishing balance. The target is
        # the safest fallback because it preserves their already-completed state.
        connection.execute(
            text(
                "UPDATE saving_goals SET completion_amount = target_amount "
                "WHERE status = 'completed' AND completion_amount IS NULL"
            )
        )


def ensure_user_profile_columns(engine: Engine) -> None:
    """Add optional profile fields for databases created before profile editing."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "display_name" in columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR"))
