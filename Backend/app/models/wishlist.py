from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, func, UniqueConstraint
from app.core.database import Base

class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String(30), nullable=False)  # farm, activity, creator
    target_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_wishlist_user_target"),
    )
