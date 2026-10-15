from pydantic import BaseModel, field_validator
from typing import Literal, Optional

from app.core.normalization import canonicalize_identity


CategoryIconKey = Literal[
    "circle-dollar-sign",
    "wallet",
    "utensils",
    "shopping-bag",
    "house",
    "car",
    "bus",
    "fuel",
    "smartphone",
    "receipt",
    "heart-pulse",
    "graduation-cap",
    "gamepad-2",
    "dog",
    "baby",
    "dumbbell",
    "plane",
    "gift",
    "piggy-bank",
    "banknote",
    "briefcase-business",
    "trending-up",
    "hand-coins",
    "badge-dollar-sign",
]
CategoryType = Literal["income", "expense"]

class CategoryCreate(BaseModel):
    name: str
    type: CategoryType
    color: str = "#D9A441"
    icon: CategoryIconKey = "circle-dollar-sign"

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        canonical = canonicalize_identity(value)
        if not canonical:
            raise ValueError("Tên danh mục không được để trống.")
        return canonical

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[CategoryType] = None
    color: Optional[str] = None
    icon: Optional[CategoryIconKey] = None

    @field_validator("name", "type", "color", "icon", mode="before")
    @classmethod
    def required_when_present(cls, value):
        if value is None:
            raise ValueError("Thông tin danh mục không được để trống.")
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        canonical = canonicalize_identity(value)
        if not canonical:
            raise ValueError("Tên danh mục không được để trống.")
        return canonical

class CategoryOut(BaseModel):
    id: str
    name: str
    type: CategoryType
    color: str
    icon: CategoryIconKey

    class Config:
        from_attributes = True
