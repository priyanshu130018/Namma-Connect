from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.services.collaboration_service import CollaborationService
from app.schemas.collaboration import CollaborationCreate, CollaborationOut, CollaborationStatusUpdate
from app.dependencies.auth import get_current_user
from app.models.user import Login

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# CANONICAL COLLABORATION ENDPOINTS (PREFIXED WITH /api)
# ─────────────────────────────────────────────────────────────

@router.get("/collaborations")
def get_collaborations_new(
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return CollaborationService.get_user_collaborations(db, current_user.id)

@router.post("/collaborations", response_model=CollaborationOut)
def create_collaboration_new(
    data: CollaborationCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return CollaborationService.create_collaboration(db, data, current_user.id)

@router.patch("/collaborations/{id}", response_model=CollaborationOut)
def update_collaboration_status_new(
    id: int,
    data: CollaborationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return CollaborationService.update_collaboration_status(db, id, current_user.id, data)

from app.schemas.booking import DateChangeCreate

@router.post("/collaborations/{id}/date-change")
def request_collaboration_date_change(
    id: int,
    data: DateChangeCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return CollaborationService.request_date_change(db, id, current_user.id, data.new_date, data.message)

