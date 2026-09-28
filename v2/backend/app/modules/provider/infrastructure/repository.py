"""Provider module infrastructure repository."""

from typing import Optional, List
from sqlalchemy.orm import Session
from app.modules.provider.domain.models import PartnerApplication
from app.modules.marketplace.domain.models import Service
from app.modules.booking.domain.models import Booking


class ProviderRepository:
    """Repository for provider KYC applications, listings, and bookings."""

    def __init__(self, db: Session):
        self.db = db

    def get_application_by_user(self, user_id) -> Optional[PartnerApplication]:
        return (
            self.db.query(PartnerApplication)
            .filter(PartnerApplication.user_id == user_id)
            .order_by(PartnerApplication.created_at.desc())
            .first()
        )

    def get_application_by_id(self, application_id) -> Optional[PartnerApplication]:
        return self.db.query(PartnerApplication).filter(PartnerApplication.id == application_id).first()

    def save_application(self, app: PartnerApplication) -> PartnerApplication:
        self.db.add(app)
        self.db.commit()
        self.db.refresh(app)
        return app

    def get_provider_services(self, provider_id) -> List[Service]:
        return self.db.query(Service).filter(Service.provider_id == provider_id).all()

    def get_provider_bookings(self, provider_id) -> List[Booking]:
        return self.db.query(Booking).filter(Booking.provider_id == provider_id).order_by(Booking.created_at.desc()).all()
