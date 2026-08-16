import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

class CloudinaryService:
    @staticmethod
    def upload_image(file) -> dict:
        try:
            res = cloudinary.uploader.upload(file)
            return {
                "secure_url": res.get("secure_url"),
                "public_id": res.get("public_id")
            }
        except Exception as e:
            raise Exception(f"Cloudinary image upload error: {str(e)}")

    @staticmethod
    def upload_video(file) -> dict:
        try:
            res = cloudinary.uploader.upload(file, resource_type="video")
            return {
                "secure_url": res.get("secure_url"),
                "public_id": res.get("public_id")
            }
        except Exception as e:
            raise Exception(f"Cloudinary video upload error: {str(e)}")
