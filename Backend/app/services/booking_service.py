from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from fastapi import HTTPException, status
from typing import Optional, List
from datetime import date as DateType, timedelta
import random
import string

from app.models.user import Login, FarmerProfile, Notification
from app.models.farm import FarmListing
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingStatusUpdate

class BookingService:
    @staticmethod
    def _generate_confirmation_code() -> str:
        chars = string.ascii_uppercase + string.digits
        return "NC-" + "".join(random.choices(chars, k=8))

    @classmethod
    def create_booking(cls, db: Session, data: BookingCreate, user_id: int) -> Booking:
        user = db.query(Login).filter(Login.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Prohibit self-booking
        farm = db.query(FarmListing).filter(FarmListing.id == data.farm_id).first()
        if not farm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm listing not found")
        
        # Resolve owner's user id
        farm_owner_user_id = farm.farmer_profile.user_id if farm.farmer_profile else None
        if farm_owner_user_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Strictly prohibited: You cannot book your own farm listing."
            )

        # Check availability
        # Overlapping stays are bookings for the same farm which are not cancelled, and where dates overlap
        end_date = data.check_out if data.check_out else data.booking_date
        overlap_filter = [
            Booking.farm_id == data.farm_id,
            Booking.status != "cancelled",
            Booking.booking_date <= end_date,
            func.coalesce(Booking.check_out, Booking.booking_date) >= data.booking_date
        ]
        
        overlap = db.query(Booking).filter(and_(*overlap_filter)).first()
        if overlap:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The farm listing is not available for the selected dates."
            )

        contact_name = data.contact_name or user.name
        contact_mobile = data.contact_mobile or user.mobile or "9999999999"
        contact_email = data.contact_email or user.email

        booking = Booking(
            user_id=user_id,
            farm_id=data.farm_id,
            activity_id=data.activity_id,
            booking_date=data.booking_date,
            check_out=data.check_out,
            start_time=data.start_time,
            end_time=data.end_time,
            guest_count=data.guest_count,
            amount=data.amount,
            currency=data.currency,
            status="pending",
            payment_status="pending",
            special_request=data.special_request,
            contact_name=contact_name,
            contact_mobile=contact_mobile,
            contact_email=contact_email,
            confirmation_code=cls._generate_confirmation_code()
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)

        # Create notification for farm owner
        if farm_owner_user_id:
            n = Notification(
                user_id=farm_owner_user_id,
                type="booking",
                title="New Booking Request received",
                message=f"You have received a new booking request for {farm.name} from {contact_name}.",
                reference_type="booking",
                reference_id=booking.id
            )
            db.add(n)
            db.commit()

        # Send confirmation email
        try:
            from app.services.email_service import EmailService
            subject = "Booking Received"
            body = f"Hi {contact_name}, your booking request for {farm.name} has been received and is pending approval."
            EmailService.send_email(contact_email, subject, body)
        except Exception:
            pass

        return booking

    @classmethod
    def get_user_bookings(cls, db: Session, user_id: int, status: Optional[str] = None) -> List[Booking]:
        query = db.query(Booking).filter(Booking.user_id == user_id)
        if status:
            query = query.filter(Booking.status == status)
        return query.order_by(Booking.created_at.desc()).all()

    @classmethod
    def get_farmer_bookings(cls, db: Session, user_id: int) -> dict:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        if not farmer:
            return {"received": [], "made": []}

        farm_ids = [f.id for f in farmer.farms]
        received = []
        if farm_ids:
            received = (
                db.query(Booking)
                .filter(Booking.farm_id.in_(farm_ids))
                .order_by(Booking.created_at.desc())
                .all()
            )

        made = db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.created_at.desc()).all()
        return {"received": received, "made": made}

    @classmethod
    def cancel_booking(cls, db: Session, booking_id: int, user_id: int):
        booking = db.query(Booking).filter(
            Booking.id == booking_id,
            Booking.user_id == user_id
        ).first()

        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        if booking.status == "cancelled":
            return {"success": True, "message": "Booking already cancelled"}

        booking.status = "cancelled"
        booking.cancelled_by = user_id
        booking.cancelled_at = func.now()
        booking.cancel_reason = "Cancelled by guest"
        db.commit()

        # Create notification for farm owner
        farm_owner_user_id = booking.farm.farmer_profile.user_id if booking.farm and booking.farm.farmer_profile else None
        if farm_owner_user_id:
            n = Notification(
                user_id=farm_owner_user_id,
                type="booking",
                title="Booking Cancelled",
                message=f"Booking request NC-{booking.id} has been cancelled by the guest.",
                reference_type="booking",
                reference_id=booking.id
            )
            db.add(n)
            db.commit()

        # Send alert
        cls._send_status_email(booking)
        return {"success": True}

    @classmethod
    def update_booking_status(cls, db: Session, booking_id: int, user_id: int, data: BookingStatusUpdate):
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        # Verify ownership (caller is the farm owner)
        farm = booking.farm
        if not farm or not farm.farmer_profile or farm.farmer_profile.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this booking")

        booking.status = data.status
        db.commit()

        # Create notification for guest
        n = Notification(
            user_id=booking.user_id,
            type="booking",
            title=f"Booking {data.status.capitalize()}",
            message=f"Your booking request NC-{booking.id} has been updated to {data.status}.",
            reference_type="booking",
            reference_id=booking.id
        )
        db.add(n)
        db.commit()

        cls._send_status_email(booking)
        return {"success": True, "status": data.status}

    @staticmethod
    def _send_status_email(booking: Booking):
        try:
            from app.services.email_service import EmailService
            subject = f"Booking Status Updated: {booking.status.capitalize()}"
            body = f"Hi {booking.contact_name}, your booking NC-{booking.id} status has been updated to {booking.status}."
            EmailService.send_email(booking.contact_email, subject, body)
        except Exception:
            pass

    @classmethod
    def request_date_change(cls, db: Session, booking_id: int, user_id: int, new_date: DateType, message: Optional[str] = None):
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Determine if requester is guest or owner
        is_guest = booking.user_id == user_id
        is_owner = booking.farm.farmer_profile.user_id == user_id if booking.farm and booking.farm.farmer_profile else False
        
        if not (is_guest or is_owner):
            raise HTTPException(status_code=403, detail="Not authorized to request date change")
            
        from app.models.change_request import ChangeRequest
        cr = ChangeRequest(
            type="booking",
            reference_id=booking_id,
            requested_by=user_id,
            old_date=booking.booking_date,
            new_date=new_date,
            message=message
        )
        db.add(cr)
        db.commit()
        db.refresh(cr)
        
        # Notify the other party
        recipient_id = booking.farm.farmer_profile.user_id if is_guest else booking.user_id
        if recipient_id:
            n = Notification(
                user_id=recipient_id,
                type="booking",
                title="Date Change Requested",
                message=f"A date change to {new_date} was requested for booking NC-{booking.id}.",
                reference_type="change_request",
                reference_id=cr.id
            )
            db.add(n)
            db.commit()
            
        return cr

