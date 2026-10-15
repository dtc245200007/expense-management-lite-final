from sqlalchemy import CheckConstraint, Column, ForeignKey, Index, String
from sqlalchemy.orm import validates

from app.core.normalization import canonicalize_identity, normalize_identity
from app.database import Base
import uuid

class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index(
            "uq_categories_owner_type_name_norm",
            "user_id",
            "type",
            "name_normalized",
            unique=True,
        ),
        CheckConstraint("length(trim(name)) > 0", name="ck_categories_name_not_blank"),
        CheckConstraint(
            "length(name_normalized) > 0",
            name="ck_categories_name_normalized_not_blank",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    name_normalized = Column(String, nullable=False)
    type = Column(String, nullable=False)   # "income" hoặc "expense"
    color = Column(String, nullable=False, default="#D9A441")
    icon = Column(String, nullable=False, default="circle-dollar-sign", server_default="circle-dollar-sign")

    @validates("name")
    def normalize_name(self, _key: str, value: str) -> str:
        canonical = canonicalize_identity(value)
        self.name_normalized = normalize_identity(canonical)
        return canonical
