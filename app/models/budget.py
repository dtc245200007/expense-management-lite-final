from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, Numeric, String
from app.database import Base
import uuid

class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        CheckConstraint("year BETWEEN 2000 AND 2100", name="ck_budgets_year"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    limit_amount = Column(Numeric(14, 2), nullable=False)
