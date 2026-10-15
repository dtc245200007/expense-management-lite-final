from sqlalchemy import Column, String, Numeric, Date, ForeignKey
from app.database import Base
import uuid

class SavingGoal(Base):
    __tablename__ = "saving_goals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(14, 2), nullable=False)
    deadline = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="active")
    completion_amount = Column(Numeric(14, 2), nullable=True)
    completion_mode = Column(String, nullable=True)
    # LƯU Ý: không có cột current_amount — tính từ tổng GoalTransaction
