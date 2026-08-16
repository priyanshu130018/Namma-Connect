from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, TIMESTAMP, func
from app.core.database import Base

class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), nullable=False)  # booking, collaboration
    reference_id = Column(Integer, nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_date = Column(Date, nullable=False)
    new_date = Column(Date, nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="pending")  # pending, approved, rejected, cancelled
    responded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    response_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
