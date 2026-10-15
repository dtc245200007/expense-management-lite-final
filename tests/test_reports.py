import unittest
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.routers.reports import get_report


class ReportsApiTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.user = User(id="user-1", username="demo", email="demo@example.com", password_hash="test")
        other_user = User(id="user-2", username="other", email="other@example.com", password_hash="test")
        salary = Category(id="salary", user_id=self.user.id, name="Lương", type="income", color="#2563eb", icon="briefcase-business")
        food = Category(id="food", user_id=self.user.id, name="Ăn uống", type="expense", color="#07845c", icon="utensils")
        transport = Category(id="transport", user_id=self.user.id, name="Di chuyển", type="expense", color="#f29b00", icon="car")
        entertainment = Category(id="entertainment", user_id=self.user.id, name="Giải trí", type="expense", color="#7c3aed", icon="gamepad-2")
        other_category = Category(id="other", user_id=other_user.id, name="Khác", type="expense", color="#000000", icon="receipt")
        self.db.add_all([self.user, other_user, salary, food, transport, entertainment, other_category])
        self.db.add_all(
            [
                Transaction(id="jul-income", user_id=self.user.id, category_id=salary.id, amount=10_000, type="income", txn_date=date(2026, 7, 1)),
                Transaction(id="jul-food-1", user_id=self.user.id, category_id=food.id, amount=2_000, type="expense", txn_date=date(2026, 7, 5)),
                Transaction(id="jul-food-2", user_id=self.user.id, category_id=food.id, amount=1_000, type="expense", txn_date=date(2026, 7, 12)),
                Transaction(id="jul-entertainment", user_id=self.user.id, category_id=entertainment.id, amount=1_000, type="expense", txn_date=date(2026, 7, 20)),
                Transaction(id="aug-income", user_id=self.user.id, category_id=salary.id, amount=15_000, type="income", txn_date=date(2026, 8, 1)),
                Transaction(id="aug-food", user_id=self.user.id, category_id=food.id, amount=6_000, type="expense", txn_date=date(2026, 8, 8)),
                Transaction(id="aug-transport", user_id=self.user.id, category_id=transport.id, amount=2_000, type="expense", txn_date=date(2026, 8, 15)),
                Transaction(id="sep-future", user_id=self.user.id, category_id=food.id, amount=99_000, type="expense", txn_date=date(2026, 9, 1)),
                Transaction(id="other-user", user_id=other_user.id, category_id=other_category.id, amount=5_000_000, type="expense", txn_date=date(2026, 8, 1)),
            ]
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_report_compares_periods_categories_and_scopes_user(self):
        result = get_report(month=8, year=2026, db=self.db, current_user=self.user)

        self.assertEqual(result.current_period.month, 8)
        self.assertEqual(result.previous_period.month, 7)
        self.assertEqual(result.summary.current.income, Decimal("15000.00"))
        self.assertEqual(result.summary.current.expense, Decimal("8000.00"))
        self.assertEqual(result.summary.current.net, Decimal("7000.00"))
        self.assertEqual(result.summary.previous.expense, Decimal("4000.00"))
        self.assertEqual(result.summary.expense_difference, Decimal("4000.00"))
        self.assertEqual(result.summary.expense_change_percentage, 100.0)
        self.assertTrue(result.has_data)

        categories = {item.category_id: item for item in result.categories}
        self.assertEqual(set(categories), {"food", "transport", "entertainment"})
        self.assertEqual(categories["food"].current_share, 75.0)
        self.assertEqual(categories["food"].previous_share, 75.0)
        self.assertEqual(categories["food"].current_transaction_count, 1)
        self.assertEqual(categories["food"].previous_transaction_count, 2)
        self.assertEqual(categories["food"].change_percentage, 100.0)
        self.assertIsNone(categories["transport"].change_percentage)
        self.assertEqual(categories["entertainment"].change_percentage, -100.0)
        self.assertNotIn("other", categories)

    def test_report_returns_empty_state_when_both_periods_have_no_data(self):
        result = get_report(month=5, year=2026, db=self.db, current_user=self.user)

        self.assertFalse(result.has_data)
        self.assertEqual(result.summary.current.expense, Decimal(0))
        self.assertEqual(result.summary.previous.expense, Decimal(0))
        self.assertEqual(result.categories, [])


if __name__ == "__main__":
    unittest.main()
