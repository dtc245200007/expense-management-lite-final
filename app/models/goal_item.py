from sqlalchemy import Column, String, Numeric, Boolean, ForeignKey
from app.database import Base
import uuid

class GoalItem(Base):
    __tablename__ = "goal_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = Column(String, ForeignKey("saving_goals.id"), nullable=False)
    name = Column(String, nullable=False)
    cost = Column(Numeric(14, 2), nullable=False)
    is_purchased = Column(Boolean, nullable=False, default=False)
