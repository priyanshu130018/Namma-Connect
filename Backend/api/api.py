from fastapi import APIRouter
from .endpoints import auth, tourist, creator, farmer, contact, admin, ai

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(tourist.router)
api_router.include_router(creator.router)
api_router.include_router(farmer.router)
api_router.include_router(contact.router)
api_router.include_router(admin.router)
api_router.include_router(ai.router)
