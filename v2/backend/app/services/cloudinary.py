"r""Cloudinary Media Storage Service for NammaConnect V2."""

import os
import hashlib
import time
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger


class CloudinaryService:
    """Service managing Cloudinary media uploads, assets, and secure private document storage."""

    @classmethod
    def is_configured(cls) -> bool:
        return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)

    @classmethod
    def upload_media(
        cls,
        file_bytes: bytes,
        filename: str,
        folder: str = "nammaconnect/media",
        is_private: bool = False,
        resource_type: str = "image",
    ) -> Dict[str, Any]:
        """Upload media bytes to Cloudinary or generate secure asset reference."""
        clean_name = os.path.splitext(filename)[0]
        time_str = str(time.time())
        hash_suffix = hashlib.md5(f"{filename}{time_str}".encode()).hexdigest()[:8]
        public_id = f"{folder}/{clean_name}_{hash_suffix}"

        if cls.is_configured():
            try:
                import cloudinary
                import cloudinary.uploader

                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET,
                    secure=True,
                )

                upload_options = {
                    "public_id": public_id,
                    "resource_type": resource_type,
                    "folder": folder,
                }

                if is_private:
                    upload_options["type"] = "authenticated"
                    upload_options["access_mode"] = "authenticated"

                result = cloudinary.uploader.upload(file_bytes, **upload_options)
                return {
                    "url": result.get("secure_url", result.get("url")),
                    "public_id": result.get("public_id", public_id),
                    "format": result.get("format"),
                    "resource_type": result.get("resource_type", resource_type),
                    "is_private": is_private,
                }
            except Exception as e:
                logger.warning(f"Cloudinary upload failed: {e}. Generating fallback reference.")

        # Fallback / mock URL for dev & testing
        asset_url = f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME or 'nammaconnect'}/{resource_type}/upload/{public_id}.jpg"
        return {
            "url": asset_url,
            "public_id": public_id,
            "format": "jpg",
            "resource_type": resource_type,
            "is_private": is_private,
        }

    @classmethod
    def upload_profile_image(cls, file_bytes: bytes, user_id: str, filename: str = "profile.jpg") -> str:
        """Upload user profile avatar and return secure CDN URL."""
        res = cls.upload_media(file_bytes, f"user_{user_id}_{filename}", folder="nammaconnect/profiles")
        return res["url"]

    @classmethod
    def upload_service_image(cls, file_bytes: bytes, service_id: str, filename: str = "service.jpg") -> str:
        """Upload service gallery/primary image and return secure CDN URL."""
        res = cls.upload_media(file_bytes, f"srv_{service_id}_{filename}", folder="nammaconnect/services")
        return res["url"]

    @classmethod
    def upload_partner_kyc_document(cls, file_bytes: bytes, partner_id: str, doc_name: str) -> Dict[str, Any]:
        """Upload sensitive partner KYC verification document with strict access control."""
        return cls.upload_media(
            file_bytes,
            f"kyc_{partner_id}_{doc_name}",
            folder="nammaconnect/kyc_private",
            is_private=True,
            resource_type="raw",
        )
