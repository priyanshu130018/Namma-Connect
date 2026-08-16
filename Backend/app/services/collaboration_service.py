from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from datetime import datetime, date as DateType
from typing import Optional

from app.models.user import Login, FarmerProfile, CreatorProfile, Notification
from app.models.collaboration import Collaboration
from app.models.farm import FarmListing
from app.schemas.collaboration import CollaborationCreate, CollaborationStatusUpdate

class CollaborationService:
    @classmethod
    def create_collaboration(cls, db: Session, data: CollaborationCreate, user_id: int) -> Collaboration:
        # Check self-collaboration
        farmer = db.query(FarmerProfile).filter(FarmerProfile.id == data.farmer_id).first()
        creator = db.query(CreatorProfile).filter(CreatorProfile.id == data.creator_id).first()
        
        if not farmer or not creator:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer or Creator profile not found")

        if farmer.user_id == creator.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Strictly prohibited: You cannot collaborate with yourself."
            )

        # Verify that the authenticated caller is actually the party initiating the collaboration
        if data.initiated_by == "farmer" and farmer.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized: You can only initiate collaborations from your own farmer profile."
            )
        elif data.initiated_by == "creator" and creator.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized: You can only initiate collaborations from your own creator profile."
            )
        elif data.initiated_by not in ("farmer", "creator"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid initiated_by field. Must be 'farmer' or 'creator'."
            )

        # Verify farm exists and belongs to the farmer
        farm = db.query(FarmListing).filter(FarmListing.id == data.farm_id).first()
        if not farm or farm.farmer_id != farmer.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid farm_id: Farm does not belong to the specified farmer."
            )

        collab = Collaboration(
            farmer_id=data.farmer_id,
            creator_id=data.creator_id,
            farm_id=data.farm_id,
            initiated_by=data.initiated_by,
            message=data.message,
            proposal=data.proposal,
            requested_date=data.requested_date,
            start_time=data.start_time,
            end_time=data.end_time,
            amount=data.amount,
            status="requested",
            payment_status="pending"
        )
        db.add(collab)
        db.commit()
        db.refresh(collab)

        # Notify the counterparty
        recipient_user_id = creator.user_id if data.initiated_by == "farmer" else farmer.user_id
        initiator_name = farmer.user.name if data.initiated_by == "farmer" else creator.display_name

        n = Notification(
            user_id=recipient_user_id,
            type="collaboration",
            title="New Collaboration Offer",
            message=f"You have received a new collaboration proposal from {initiator_name}.",
            reference_type="collaboration",
            reference_id=collab.id
        )
        db.add(n)
        db.commit()

        return collab

    @classmethod
    def get_user_collaborations(cls, db: Session, user_id: int) -> dict:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        creator = db.query(CreatorProfile).filter(CreatorProfile.user_id == user_id).first()

        received = []
        made = []

        farmer_id = farmer.id if farmer else -1
        creator_id = creator.id if creator else -1

        query = db.query(Collaboration).filter(
            or_(
                Collaboration.farmer_id == farmer_id,
                Collaboration.creator_id == creator_id
            )
        ).order_by(Collaboration.created_at.desc()).all()

        for c in query:
            # Determine if received or made
            if c.initiated_by == "farmer":
                if c.creator_id == creator_id:
                    received.append(c)
                else:
                    made.append(c)
            else:
                if c.farmer_id == farmer_id:
                    received.append(c)
                else:
                    made.append(c)

        return {"received": received, "made": made}

    @classmethod
    def update_collaboration_status(cls, db: Session, collaboration_id: int, user_id: int, data: CollaborationStatusUpdate) -> Collaboration:
        collab = db.query(Collaboration).filter(Collaboration.id == collaboration_id).first()
        if not collab:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration not found")

        # Check permission (must be one of the participants)
        farmer = collab.farmer_profile
        creator = collab.creator_profile
        
        if farmer.user_id != user_id and creator.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this collaboration")

        collab.status = data.status
        if data.status == "completed":
            collab.completed_at = datetime.utcnow()
        elif data.status == "cancelled":
            collab.cancelled_by = user_id
            collab.cancelled_at = datetime.utcnow()

        db.commit()

        # Send notification to the other party
        other_user_id = creator.user_id if user_id == farmer.user_id else farmer.user_id
        n = Notification(
            user_id=other_user_id,
            type="collaboration",
            title=f"Collaboration {data.status.capitalize()}",
            message=f"The status of your collaboration has been updated to {data.status}.",
            reference_type="collaboration",
            reference_id=collab.id
        )
        db.add(n)
        db.commit()
        db.refresh(collab)
        return collab

    @classmethod
    def request_date_change(cls, db: Session, collab_id: int, user_id: int, new_date: DateType, message: Optional[str] = None):
        collab = db.query(Collaboration).filter(Collaboration.id == collab_id).first()
        if not collab:
            raise HTTPException(status_code=404, detail="Collaboration not found")
            
        # Determine if requester is the creator or the farm owner
        is_creator = collab.creator_profile.user_id == user_id if collab.creator_profile else False
        is_owner = collab.farmer_profile.user_id == user_id if collab.farmer_profile else False
        
        if not (is_creator or is_owner):
            raise HTTPException(status_code=403, detail="Not authorized to request date change")
            
        from app.models.change_request import ChangeRequest
        cr = ChangeRequest(
            type="collaboration",
            reference_id=collab_id,
            requested_by=user_id,
            old_date=collab.requested_date,
            new_date=new_date,
            message=message
        )
        db.add(cr)
        db.commit()
        db.refresh(cr)
        
        # Notify the other party
        recipient_id = collab.farmer_profile.user_id if is_creator else collab.creator_profile.user_id
        if recipient_id:
            from app.models.user import Notification
            n = Notification(
                user_id=recipient_id,
                type="booking",
                title="Collaboration Date Change Requested",
                message=f"A date change to {new_date} was requested for collaboration NC-{collab.id}.",
                reference_type="change_request",
                reference_id=cr.id
            )
            db.add(n)
            db.commit()
            
        return cr

