"""Earnings Domain Service for Provider Revenue Aggregations and Financial Analytics."""

from datetime import datetime, date, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.booking import Booking
from app.repositories.booking import BookingRepository
from app.schemas.earnings import EarningsDataPoint, ProviderEarningsResponse


class EarningsService:
    """Domain service managing provider revenue reconciliation and time-series aggregations."""

    @classmethod
    def normalize_period(cls, period: str) -> str:
        """Map user input to standard 7d, 30d, or 1y identifier."""
        p = (period or "30d").strip().lower()
        if p in ["7d", "7days", "7_days", "7 days"]:
            return "7d"
        if p in ["1y", "1year", "1_year", "1 year", "12m", "year"]:
            return "1y"
        return "30d"

    @classmethod
    def get_provider_earnings(
        cls,
        db: Session,
        provider_user: User,
        period: str = "30d",
    ) -> ProviderEarningsResponse:
        """Calculate authoritative net earnings and time-series buckets for the authenticated provider."""
        norm_period = cls.normalize_period(period)
        all_bookings = BookingRepository.list_by_provider(db, str(provider_user.id))

        # 1. Filter strictly eligible bookings
        # Criteria: CONFIRMED or COMPLETED status with paid transaction
        eligible_bookings: List[Booking] = []
        for b in all_bookings:
            if b.status in ["CONFIRMED", "COMPLETED"]:
                # Check payment relationship if present
                if hasattr(b, "payments") and b.payments:
                    if any(p.status == "PAID" for p in b.payments):
                        eligible_bookings.append(b)
                    elif not any(p.status in ["FAILED", "CANCELLED"] for p in b.payments):
                        eligible_bookings.append(b)
                else:
                    eligible_bookings.append(b)

        today = date.today()

        # 2. Build Time-Series Buckets
        data_points: List[EarningsDataPoint] = []
        filtered_period_bookings: List[Booking] = []

        if norm_period == "7d":
            days = [today - timedelta(days=i) for i in reversed(range(7))]
            for d in days:
                d_str = d.strftime("%Y-%m-%d")
                day_bookings = [
                    b for b in eligible_bookings
                    if (b.start_date == d_str or (b.created_at and b.created_at.date() == d))
                ]
                filtered_period_bookings.extend(day_bookings)
                day_net = sum(round(b.total_amount * 0.95, 2) for b in day_bookings)
                data_points.append(
                    EarningsDataPoint(
                        date=d.strftime("%b %d"),
                        amount=round(day_net, 2),
                        bookings_count=len(day_bookings),
                    )
                )

        elif norm_period == "30d":
            days = [today - timedelta(days=i) for i in reversed(range(30))]
            for d in days:
                d_str = d.strftime("%Y-%m-%d")
                day_bookings = [
                    b for b in eligible_bookings
                    if (b.start_date == d_str or (b.created_at and b.created_at.date() == d))
                ]
                filtered_period_bookings.extend(day_bookings)
                day_net = sum(round(b.total_amount * 0.95, 2) for b in day_bookings)
                data_points.append(
                    EarningsDataPoint(
                        date=d.strftime("%b %d"),
                        amount=round(day_net, 2),
                        bookings_count=len(day_bookings),
                    )
                )

        else:  # 1y
            # 12 monthly buckets
            data_dict: Dict[str, Dict] = {}
            for i in reversed(range(12)):
                # Calculate approx month
                month_date = today.replace(day=1) - timedelta(days=i * 30)
                m_key = month_date.strftime("%Y-%m")
                m_label = month_date.strftime("%b %Y")
                data_dict[m_key] = {"label": m_label, "amount": 0.0, "count": 0}

            for b in eligible_bookings:
                b_date_str = b.start_date or (b.created_at.strftime("%Y-%m-%d") if b.created_at else None)
                if b_date_str:
                    m_key = b_date_str[:7]
                    if m_key in data_dict:
                        filtered_period_bookings.append(b)
                        net = round(b.total_amount * 0.95, 2)
                        data_dict[m_key]["amount"] += net
                        data_dict[m_key]["count"] += 1

            for m_key, val in data_dict.items():
                data_points.append(
                    EarningsDataPoint(
                        date=val["label"],
                        amount=round(val["amount"], 2),
                        bookings_count=val["count"],
                    )
                )

        # Deduplicate period bookings for totals
        unique_period_bookings = list({b.id: b for b in filtered_period_bookings}.values())
        gross_revenue = sum(float(b.total_amount) for b in unique_period_bookings)
        platform_fee = round(gross_revenue * 0.05, 2)
        total_earnings = round(gross_revenue * 0.95, 2)

        return ProviderEarningsResponse(
            period=norm_period,
            total_earnings=total_earnings,
            gross_revenue=gross_revenue,
            platform_fee=platform_fee,
            currency="INR",
            booking_count=len(unique_period_bookings),
            data=data_points,
        )
