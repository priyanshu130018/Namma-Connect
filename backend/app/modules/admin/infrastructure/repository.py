"""Admin repository handling platform settings and aggregation metrics."""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.modules.admin.domain.models import PlatformSetting
from app.modules.user.domain.models import User
from app.modules.marketplace.domain.models import Service
from app.modules.booking.domain.models import Booking


class AdminRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_platform_setting(self, key: str) -> Optional[PlatformSetting]:
        return self.db.query(PlatformSetting).filter(PlatformSetting.key == key).first()

    def list_platform_settings(self) -> List[PlatformSetting]:
        return self.db.query(PlatformSetting).all()

    def save_platform_setting(self, setting: PlatformSetting) -> PlatformSetting:
        self.db.add(setting)
        self.db.commit()
        self.db.refresh(setting)
        return setting

    def get_platform_overview_stats(self) -> Dict[str, Any]:
        total_users = self.db.query(func.count(User.id)).scalar() or 0
        total_partners = self.db.query(func.count(User.id)).filter(User.role.in_(["PARTNER", "PROVIDER"])).scalar() or 0
        total_services = self.db.query(func.count(Service.id)).scalar() or 0
        total_bookings = self.db.query(func.count(Booking.id)).scalar() or 0
        total_gmv = self.db.query(func.coalesce(func.sum(Booking.final_amount), 0.0)).scalar() or 0.0

        return {
            "total_users": total_users,
            "total_partners": total_partners,
            "total_services": total_services,
            "total_bookings": total_bookings,
            "total_gmv": float(total_gmv),
        }
