from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class Course(BaseModel):
    id: Optional[int] = None

    title: str = Field(min_length=5, max_length=100, description="Title of the course")

    instructor: str = Field(min_length=3, max_length=100, description="Instructor name")

    category: str = Field(min_length=2, max_length=100, description="Course category")

    price: float = Field(gt=0, le=1_000_000, description="Course price")

    duration_hours: int = Field(ge=0, le=20000, description="Duration in hours")

    is_published: bool = Field(default=True, description="Published status")

    discount_percent: float = Field(default=0, ge=0, le=100, description="Discount %")

    # -------- Validators -------- #

    @field_validator('title')
    @classmethod
    def clean_title(cls, value: str) -> str:
        return value.title()

    @field_validator('category')
    @classmethod
    def clean_category(cls, value: str) -> str:
        return value.lower()

    @model_validator(mode="after")
    def check_discount(cls, course):
        if not course.is_published and course.discount_percent > 0:
            raise ValueError("Unpublished course cannot have discount")
        return course