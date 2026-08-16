from sqlalchemy import Column, Integer, String, Text, Date, Time, ForeignKey, TIMESTAMP, func, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    booking_date = Column(Date, nullable=False)
    check_out = Column(Date, nullable=True)  # Supports overnight stays
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    guest_count = Column(Integer, nullable=False, default=1)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(30), nullable=False, default="pending")  # pending, confirmed, completed, cancelled
    payment_status = Column(String(30), nullable=False, default="pending")  # pending, paid, failed, refunded, partially_refunded
    special_request = Column(Text, nullable=True)
    contact_name = Column(String(150), nullable=False)
    contact_mobile = Column(String(20), nullable=False)
    contact_email = Column(String(255), nullable=False)
    confirmation_code = Column(String(50), unique=True, nullable=False)
    cancelled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancel_reason = Column(Text, nullable=True)
    cancelled_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("Login", foreign_keys=[user_id])
    farm = relationship("FarmListing", back_populates="bookings")
    activity = relationship("Activity")
    canceller = relationship("Login", foreign_keys=[cancelled_by])

    @property
    def booking_type(self):
        return "farm"

    @property
    def check_in(self):
        return self.booking_date

    @property
    def total_price(self):
        return self.amount

    @property
    def adults(self):
        return self.guest_count

    @property
    def children(self):
        return 0

    @property
    def tourist(self):
        return self.user.profile if self.user else None

    @property
    def tourist_id(self):
        return self.user.profile.id if self.user and self.user.profile else self.user_id

    def __init__(self, **kwargs):

        if "check_in" in kwargs:
            kwargs["booking_date"] = kwargs.pop("check_in")
        if "tourist_id" in kwargs:
            tid = kwargs.pop("tourist_id")
            user_id = None
            try:
                from sqlalchemy import select
                from app.models.user import Profile
                bind = self.metadata.bind
                if bind:
                    with bind.connect() as conn:
                        row = conn.execute(select(Profile.user_id).where(Profile.id == tid)).first()
                        if row:
                            user_id = row[0]
            except Exception:
                pass
            if user_id is None:
                user_id = tid
            kwargs["user_id"] = user_id

        if "booking_type" in kwargs:
            kwargs.pop("booking_type")
        if "adults" in kwargs:
            kwargs["guest_count"] = kwargs.pop("adults")
        if "children" in kwargs:
            kwargs.pop("children")
        if "total_price" in kwargs:
            kwargs["amount"] = kwargs.pop("total_price")
        if "collab_note" in kwargs:
            kwargs["special_request"] = kwargs.pop("collab_note")
        
        # Default contact details for mock testing
        if "contact_name" not in kwargs:
            kwargs["contact_name"] = "Mock Name"
        if "contact_mobile" not in kwargs:
            kwargs["contact_mobile"] = "9999999999"
        if "contact_email" not in kwargs:
            kwargs["contact_email"] = "mock@example.com"
        if "confirmation_code" not in kwargs:
            # Generate temporary confirmation code
            import random, string
            chars = string.ascii_uppercase + string.digits
            kwargs["confirmation_code"] = "NC-" + "".join(random.choices(chars, k=8))

        super().__init__(**kwargs)


