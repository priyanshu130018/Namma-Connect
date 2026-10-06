"""Common Pydantic serialization schemas."""

from typing import Generic, List, Optional, TypeVar, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "2.0.0"
    environment: str = "development"
    services: dict = Field(default_factory=lambda: {"database": "connected", "redis": "connected"})


class MessageResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Any] = None


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorDetail(BaseModel):
    loc: List[str]
    msg: str
    type: str


class ValidationErrorResponse(BaseModel):
    detail: List[ErrorDetail]
