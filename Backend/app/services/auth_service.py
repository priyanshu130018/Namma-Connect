from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.security import hash_password, verify_password, create_token
from app.core.config import settings
from app.models.user import Login, Profile, FarmerProfile, CreatorProfile
from app.models.farm import FarmListing
from app.models.booking import Booking
from app.models.collaboration import Collaboration
from app.schemas.user import RegisterRequest, LoginRequest, ChangePasswordRequest, TokenResponse

class AuthService:
    @staticmethod
    def register(db: Session, req: RegisterRequest, background_tasks = None) -> TokenResponse:
        existing = (
            db.query(Login)
            .filter((Login.email == req.email) | (Login.mobile == req.mobile))
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or mobile already registered. Please log in instead.",
            )

        login = Login(
            email=req.email,
            password_hash=hash_password(req.password),
            name=req.full_name,
            mobile=req.mobile,
            is_active=True
        )
        db.add(login)
        db.flush()

        profile = Profile(
            user_id=login.id,
            country="India"
        )
        db.add(profile)
        db.commit()
        db.refresh(login)

        try:
            from app.services.email_service import EmailService
            subject = "Welcome to Namma Connect!"
            body = f"Hi {req.full_name}, thank you for registering with Namma Connect. Explore farms and start booking stays!"
            if background_tasks and hasattr(background_tasks, "add_task"):
                background_tasks.add_task(EmailService.send_email, req.email, subject, body)
            else:
                EmailService.send_email(req.email, subject, body)
        except Exception:
            pass

        # Sub represents user ID in final spec
        token = create_token({"sub": str(login.id)})
        return TokenResponse(
            access_token=token,
            user_id=login.id,
            name=login.name,
            email=login.email,
            mobile=login.mobile,
            role="tourist",
            has_farmer_profile=False,
            has_creator_profile=False
        )

    @staticmethod
    def login(db: Session, req: LoginRequest) -> TokenResponse:
        identifier = req.identifier.strip()
        login_obj = db.query(Login).filter(
            (func.lower(Login.email) == identifier.lower()) |
            (Login.mobile == identifier)
        ).first()

        if not login_obj:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found"
            )

        if not verify_password(req.password, login_obj.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password is incorrect"
            )

        has_farmer = login_obj.farmer_profile is not None and login_obj.farmer_profile.verification_status == "approved"
        has_creator = login_obj.creator_profile is not None and login_obj.creator_profile.verification_status == "approved"
        
        default_role = "tourist"
        if has_farmer:
            default_role = "farmer"
        elif has_creator:
            default_role = "creator"

        token = create_token({"sub": str(login_obj.id)})

        return TokenResponse(
            access_token=token,
            user_id=login_obj.id,
            role=default_role,
            name=login_obj.name,
            email=login_obj.email,
            mobile=login_obj.mobile,
            has_farmer_profile=has_farmer,
            has_creator_profile=has_creator,
            farmer_verification_status=login_obj.farmer_profile.verification_status if login_obj.farmer_profile else None,
            creator_verification_status=login_obj.creator_profile.verification_status if login_obj.creator_profile else None,
        )

    @staticmethod
    def google_login(db: Session, credential: str) -> TokenResponse:
        try:
            idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
            email = idinfo["email"]
            name = idinfo.get("name", "")
            picture = idinfo.get("picture", "")
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google authentication")

        login_obj = db.query(Login).filter(Login.email == email).first()
        if not login_obj:
            login_obj = Login(
                email=email, 
                password_hash=hash_password("google-auth-placeholder"), 
                name=name,
                mobile=None,
                profile_photo=picture,
                is_active=True
            )
            db.add(login_obj)
            db.flush()
            
            profile = Profile(user_id=login_obj.id, country="India")
            db.add(profile)
            db.commit()
            db.refresh(login_obj)
        
        has_farmer = login_obj.farmer_profile is not None and login_obj.farmer_profile.verification_status == "approved"
        has_creator = login_obj.creator_profile is not None and login_obj.creator_profile.verification_status == "approved"
        
        default_role = "tourist"
        if has_farmer:
            default_role = "farmer"
        elif has_creator:
            default_role = "creator"

        token = create_token({"sub": str(login_obj.id)})
        return TokenResponse(
            access_token=token,
            user_id=login_obj.id,
            role=default_role,
            name=login_obj.name,
            email=login_obj.email,
            mobile=login_obj.mobile,
            has_farmer_profile=has_farmer,
            has_creator_profile=has_creator,
            farmer_verification_status=login_obj.farmer_profile.verification_status if login_obj.farmer_profile else None,
            creator_verification_status=login_obj.creator_profile.verification_status if login_obj.creator_profile else None,
        )

    @staticmethod
    def change_password(db: Session, req: ChangePasswordRequest):
        identifier = req.identifier.strip()
        login_obj = db.query(Login).filter(
            (func.lower(Login.email) == identifier.lower()) |
            (Login.mobile == identifier)
        ).first()

        if not login_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found with provided email/mobile")
        
        login_obj.password_hash = hash_password(req.new_password)
        db.commit()
        return {"message": "Password updated successfully"}

    @staticmethod
    def change_password_authenticated(db: Session, user_id: int, req: ChangePasswordRequest):
        login_obj = db.query(Login).filter(Login.id == user_id).first()
        if not login_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if not verify_password(req.identifier, login_obj.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

        login_obj.password_hash = hash_password(req.new_password)
        db.commit()
        return {"message": "Password updated successfully"}

    @staticmethod
    def delete_account(db: Session, user_id: int):
        login_obj = db.query(Login).filter(Login.id == user_id).first()
        if not login_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        # Deletions cascade naturally from SQLAlchemy / foreign key constraints,
        # but we do explicit cleanup to be absolutely safe.
        db.query(Booking).filter(Booking.user_id == user_id).delete()
        
        farmer_profile = login_obj.farmer_profile
        if farmer_profile:
            farms = db.query(FarmListing).filter(FarmListing.farmer_id == farmer_profile.id).all()
            for farm in farms:
                db.query(Booking).filter(Booking.farm_id == farm.id).delete()
                db.query(Collaboration).filter(Collaboration.farm_id == farm.id).delete()
                db.delete(farm)
            db.query(Collaboration).filter(Collaboration.farmer_id == farmer_profile.id).delete()

        creator_profile = login_obj.creator_profile
        if creator_profile:
            db.query(Collaboration).filter(Collaboration.creator_id == creator_profile.id).delete()

        db.delete(login_obj)
        db.commit()
        return {"message": "Account deleted successfully"}
