from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.services.application_service import ApplicationService
from app.schemas.user import ApplicationCreate, ApplicationOut
from app.dependencies.auth import get_current_user
from app.models.user import Login

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.post("", response_model=ApplicationOut)
def submit_application(data: ApplicationCreate, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return ApplicationService.submit_application(db, user.id, data)

@router.get("/me", response_model=List[ApplicationOut])
def get_my_applications(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return ApplicationService.get_user_applications(db, user.id)

@router.get("/{id}", response_model=ApplicationOut)
def get_application_details(id: int, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    app = ApplicationService.get_application(db, id)
    # Only allow owner or admin to view
    if app.user_id != user.id and not user.farmer_profile:  # simple check, or checks admin
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return app
