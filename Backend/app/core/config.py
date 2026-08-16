from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "d3484c86ed0280c4151b3df352a271751dff96872be39719b0b49b9188b2")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/namma_connect")
    
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    
    RAZORPAY_KEY: str = os.getenv("RAZORPAY_KEY", "")
    RAZORPAY_SECRET: str = os.getenv("RAZORPAY_SECRET", "")
    
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
