from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime

from app.models.user import Login, Application, VerificationDocument, FarmerProfile, CreatorProfile, Notification
from app.schemas.user import ApplicationCreate

class ApplicationService:
    @staticmethod
    def submit_application(db: Session, user_id: int, req: ApplicationCreate) -> Application:
        # Validate that no pending application of the same type exists for this user
        existing_pending = db.query(Application).filter(
            Application.user_id == user_id,
            Application.type == req.type,
            Application.status == "pending"
        ).first()
        if existing_pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have a pending application to become a {req.type}."
            )

        app = Application(
            user_id=user_id,
            type=req.type,
            status="pending"
        )
        db.add(app)
        db.flush()  # Gets the application ID

        # Save documents
        for doc in req.documents:
            v_doc = VerificationDocument(
                application_id=app.id,
                document_type=doc.document_type,
                document_number=doc.document_number,
                file_id=doc.file_id,
                verification_status="pending"
            )
            db.add(v_doc)

        # Create transient profiles in pending state (so details are saved)
        if req.type == "farmer":
            f_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
            crops = req.farmer_details.primary_crops if req.farmer_details else None
            exp = req.farmer_details.farm_experience_years if req.farmer_details else None
            cat = req.farmer_details.farmer_category if req.farmer_details else None
            fid = req.farmer_details.farmer_id if req.farmer_details else None
            
            if not f_profile:
                f_profile = FarmerProfile(
                    user_id=user_id,
                    farmer_id=fid,
                    farm_experience_years=exp,
                    farmer_category=cat,
                    primary_crops=crops,
                    verification_status="pending"
                )
                db.add(f_profile)
            else:
                f_profile.farmer_id = fid
                f_profile.farm_experience_years = exp
                f_profile.farmer_category = cat
                f_profile.primary_crops = crops
                f_profile.verification_status = "pending"
                
        elif req.type == "creator":
            c_profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user_id).first()
            display_name = req.creator_details.display_name if req.creator_details else "Creator Profile"
            bio = req.creator_details.bio if req.creator_details else None
            cat = req.creator_details.category if req.creator_details else None
            exp = req.creator_details.experience_years if req.creator_details else None
            langs = req.creator_details.languages if req.creator_details else None
            insta = req.creator_details.instagram_url if req.creator_details else None
            fb = req.creator_details.facebook_url if req.creator_details else None
            yt = req.creator_details.youtube_url if req.creator_details else None
            port = req.creator_details.portfolio_url if req.creator_details else None
            
            if not c_profile:
                c_profile = CreatorProfile(
                    user_id=user_id,
                    display_name=display_name,
                    bio=bio,
                    category=cat,
                    experience_years=exp,
                    languages=langs,
                    instagram_url=insta,
                    facebook_url=fb,
                    youtube_url=yt,
                    portfolio_url=port,
                    verification_status="pending"
                )
                db.add(c_profile)
            else:
                c_profile.display_name = display_name
                c_profile.bio = bio
                c_profile.category = cat
                c_profile.experience_years = exp
                c_profile.languages = langs
                c_profile.instagram_url = insta
                c_profile.facebook_url = fb
                c_profile.youtube_url = yt
                c_profile.portfolio_url = port
                c_profile.verification_status = "pending"

        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def get_user_applications(db: Session, user_id: int) -> list:
        return db.query(Application).filter(Application.user_id == user_id).all()

    @staticmethod
    def get_application(db: Session, application_id: int) -> Application:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        return app

    @staticmethod
    def review_application(db: Session, reviewer_id: int, application_id: int, review_status: str, rejection_reason: str = None) -> Application:
        app = ApplicationService.get_application(db, application_id)
        if app.status != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This application has already been processed.")

        if review_status not in ["approved", "rejected"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be approved or rejected.")

        app.status = review_status
        app.reviewed_at = datetime.utcnow()
        app.reviewed_by = reviewer_id
        app.rejection_reason = rejection_reason

        # Handle profile updates on status change
        if app.type == "farmer":
            f_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == app.user_id).first()
            if f_profile:
                f_profile.verification_status = review_status
        elif app.type == "creator":
            c_profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == app.user_id).first()
            if c_profile:
                c_profile.verification_status = review_status

        # Create notifications
        title = f"{app.type.capitalize()} Application Approved!" if review_status == "approved" else f"{app.type.capitalize()} Application Rejected"
        msg = f"Congratulations! Your application to join Namma Connect as a {app.type} has been approved." if review_status == "approved" else f"Sorry, your application to become a {app.type} was rejected. Reason: {rejection_reason or 'No reason provided'}"
        
        notification = Notification(
            user_id=app.user_id,
            type="system",
            title=title,
            message=msg,
            reference_type="application",
            reference_id=app.id
        )
        db.add(notification)

        db.commit()
        db.refresh(app)
        return app
