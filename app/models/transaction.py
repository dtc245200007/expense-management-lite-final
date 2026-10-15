from sqlalchemy import Column, String, Numeric, Date, ForeignKey
from app.database import Base
import uuid

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)   # KHÔNG dùng Float
    type = Column(String, nullable=False)             # "income" / "expense"
    txn_date = Column(Date, nullable=False)
    note = Column(String, nullable=True)
