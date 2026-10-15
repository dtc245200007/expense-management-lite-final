from sqlalchemy import Column, DateTime, Index, String
from sqlalchemy.orm import validates
from sqlalchemy.sql import func
from app.core.normalization import canonicalize_identity, normalize_identity
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("uq_users_username_normalized", "username_normalized", unique=True),
        Index("uq_users_email_normalized", "email_normalized", unique=True),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, nullable=False)
    username_normalized = Column(String, nullable=False)
    email = Column(String, nullable=False)
    email_normalized = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Dùng cho chức năng quên mật khẩu (UC002a)
    reset_token_hash = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime(timezone=True), nullable=True)

    @validates("username")
    def normalize_username(self, _key: str, value: str) -> str:
        canonical = canonicalize_identity(value)
        self.username_normalized = normalize_identity(canonical)
        return canonical

    @validates("email")
    def normalize_email(self, _key: str, value: str) -> str:
        canonical = canonicalize_identity(value)
        self.email_normalized = normalize_identity(canonical)
        return canonical
