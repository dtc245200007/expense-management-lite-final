import unittest

from pydantic import ValidationError
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.core.schema_migrations import ensure_category_icon_column
from app.database import Base
from app.models.user import User
from app.routers.categories import create_category, update_category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryIconTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(
            id="category-icon-user",
            username="icon-user",
            email="icon@example.com",
            password_hash="test",
        )
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_create_and_update_category_icon(self):
        category = create_category(
            CategoryCreate(name="Ăn uống", type="expense", color="#07845c", icon="utensils"),
            db=self.db,
            current_user=self.user,
        )
        self.assertEqual(category.icon, "utensils")

        updated = update_category(
            category.id,
            CategoryUpdate(icon="shopping-bag"),
            db=self.db,
            current_user=self.user,
        )
        self.assertEqual(updated.icon, "shopping-bag")

    def test_schema_rejects_unknown_icon(self):
        with self.assertRaises(ValidationError):
            CategoryCreate(name="Không hợp lệ", type="expense", icon="made-up-icon")


class CategoryIconMigrationTest(unittest.TestCase):
    def test_legacy_categories_are_backfilled_by_type(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE TABLE categories ("
                    "id VARCHAR PRIMARY KEY, user_id VARCHAR NOT NULL, name VARCHAR NOT NULL, "
                    "type VARCHAR NOT NULL, color VARCHAR NOT NULL)"
                )
            )
            connection.execute(
                text(
                    "INSERT INTO categories (id, user_id, name, type, color) VALUES "
                    "('expense', 'user', 'Ăn uống', 'expense', '#07845c'), "
                    "('income', 'user', 'Lương', 'income', '#2563eb')"
                )
            )

        ensure_category_icon_column(engine)

        self.assertIn("icon", {column["name"] for column in inspect(engine).get_columns("categories")})
        with engine.connect() as connection:
            icons = dict(connection.execute(text("SELECT id, icon FROM categories")).all())
        self.assertEqual(icons, {"expense": "wallet", "income": "banknote"})

        ensure_category_icon_column(engine)
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
