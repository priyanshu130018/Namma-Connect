from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, func
from app.core.database import Base

class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(30), nullable=False)  # image, video, document
    reference_type = Column(String(50), nullable=False)  # profile, farm, creator, activity, document
    reference_id = Column(Integer, nullable=False)
    file_url = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
