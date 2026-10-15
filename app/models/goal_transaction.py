from sqlalchemy import Column, String, Numeric, Date, ForeignKey
from app.database import Base
import uuid

class GoalTransaction(Base):
    __tablename__ = "goal_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = Column(String, ForeignKey("saving_goals.id"), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    type = Column(String, nullable=False)   # "deposit" / "withdraw"
    txn_date = Column(Date, nullable=False)
    note = Column(String, nullable=True)
