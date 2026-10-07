"""Cloudinary Media Storage Service for NammaConnect V2."""

import os
import hashlib
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.logging import logger

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_KYC_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024       # 10 MB
MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024       # 50 MB
MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024    # 10 MB


class CloudinaryService:
    """Service managing Cloudinary media uploads, assets, and secure private document storage."""

    @classmethod
    def is_configured(cls) -> bool:
        return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)

    @classmethod
    def validate_file(
        cls,
        file_bytes: bytes,
        content_type: str,
        resource_type: str = "image",
        is_kyc: bool = False,
    ):
        """Validate file size and MIME type according to media category."""
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file upload is not permitted.",
            )

        if is_kyc:
            if content_type not in ALLOWED_KYC_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid KYC document type '{content_type}'. Supported formats: PDF, JPEG, PNG.",
                )
            if len(file_bytes) > MAX_DOCUMENT_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="KYC document exceeds maximum permitted size of 10MB.",
                )
        elif resource_type == "video":
            if content_type not in ALLOWED_VIDEO_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid video type '{content_type}'. Supported formats: MP4, WebM, MOV.",
                )
            if len(file_bytes) > MAX_VIDEO_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Video exceeds maximum permitted size of 50MB.",
                )
        else:
            if content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid image type '{content_type}'. Supported formats: JPEG, PNG, WebP.",
                )
            if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image exceeds maximum permitted size of 10MB.",
                )

    @classmethod
    def upload_media(
        cls,
        file_bytes: bytes,
        filename: str,
        folder: str = "namma-connect/media",
        is_private: bool = False,
        resource_type: str = "image",
        content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Upload media bytes to Cloudinary or generate secure asset reference."""
        # Validate if content_type is provided
        if content_type:
            cls.validate_file(file_bytes, content_type, resource_type, is_kyc=is_private)

        clean_name = os.path.splitext(filename)[0]
        time_str = str(time.time())
        hash_suffix = hashlib.md5(f"{filename}{time_str}".encode()).hexdigest()[:8]
        public_id = f"{folder}/{clean_name}_{hash_suffix}"

        # In Production: Must fail clearly if unconfigured or if upload fails
        is_prod = settings.ENV in ["production", "prod"]

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
                logger.error(f"Cloudinary upload failed: {e}")
                if is_prod:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Cloudinary media upload failed: {str(e)}",
                    )
                logger.warning("Cloudinary upload failed in non-production. Falling back to test asset reference.")
        else:
            if is_prod:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Cloudinary is unconfigured in production environment. Media upload cannot proceed.",
                )

        # Asset URL for dev & testing (never silently selected in production)
        cloud_name = settings.CLOUDINARY_CLOUD_NAME or ("test_cloud" if settings.ENV in ["test", "testing"] else "")
        asset_url = f"https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{public_id}.jpg"
        return {
            "url": asset_url,
            "public_id": public_id,
            "format": "jpg",
            "resource_type": resource_type,
            "is_private": is_private,
        }

    @classmethod
    def upload_profile_image(cls, file_bytes: bytes, user_id: str, filename: str = "profile.jpg", content_type: str = "image/jpeg") -> str:
        """Upload user profile avatar and return secure CDN URL."""
        res = cls.upload_media(
            file_bytes,
            f"user_{user_id}_{filename}",
            folder="namma-connect/profiles",
            content_type=content_type,
        )
        return res["url"]

    @classmethod
    def upload_service_image(cls, file_bytes: bytes, service_id: str, filename: str = "service.jpg", content_type: str = "image/jpeg") -> str:
        """Upload service gallery/primary image and return secure CDN URL."""
        res = cls.upload_media(
            file_bytes,
            f"srv_{service_id}_{filename}",
            folder="namma-connect/services",
            content_type=content_type,
        )
        return res["url"]

    @classmethod
    def upload_partner_kyc_document(cls, file_bytes: bytes, partner_id: str, doc_name: str, content_type: str = "application/pdf") -> Dict[str, Any]:
        """Upload sensitive partner KYC verification document with strict access control."""
        return cls.upload_media(
            file_bytes,
            f"kyc_{partner_id}_{doc_name}",
            folder="namma-connect/kyc_private",
            is_private=True,
            resource_type="raw",
            content_type=content_type,
        )

    @classmethod
    def delete_media(cls, public_id: str, is_private: bool = False, resource_type: str = "image") -> Dict[str, Any]:
        """Delete media asset from Cloudinary."""
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
                options = {"resource_type": resource_type}
                if is_private:
                    options["type"] = "authenticated"
                res = cloudinary.uploader.destroy(public_id, **options)
                return {"status": "deleted", "result": res.get("result", "ok"), "public_id": public_id}
            except Exception as e:
                logger.warning(f"Cloudinary destroy failed: {e}")
        return {"status": "deleted", "result": "mock_deleted", "public_id": public_id}
