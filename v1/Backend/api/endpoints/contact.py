from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import ContactUs
from db.schemas import ContactCreate, ContactOut

router = APIRouter()


@router.post("/contact/submit", response_model=ContactOut)
def submit_contact(data: ContactCreate, db: Session = Depends(get_db)):
    c = ContactUs(name=data.name, email=data.email, topic=data.topic, message=data.message)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c
