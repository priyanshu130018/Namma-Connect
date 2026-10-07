"""Cloudinary Media Storage Backend Implementation."""

import os
import hashlib
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.logging import logger
from app.services.media.base import BaseMediaStorage

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg", "image/svg+xml"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_KYC_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024       # 10 MB
MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024       # 50 MB
MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024    # 10 MB


class CloudinaryMediaStorage(BaseMediaStorage):
    """Media storage backend powered by Cloudinary."""

    def __init__(self):
        self.cloud_name = settings.CLOUDINARY_CLOUD_NAME
        self.api_key = settings.CLOUDINARY_API_KEY
        self.api_secret = settings.CLOUDINARY_API_SECRET
        self.is_prod = settings.ENV in ["production", "prod"]

    def is_configured(self) -> bool:
        return bool(self.cloud_name and self.api_key and self.api_secret)

    def validate_file(
        self,
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
                    detail=f"Invalid image type '{content_type}'. Supported formats: JPEG, PNG, WebP, SVG.",
                )
            if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image exceeds maximum permitted size of 10MB.",
                )

    def upload(
        self,
        file_bytes: bytes,
        filename: str,
        folder: str = "nammaconnect/media",
        is_private: bool = False,
        resource_type: str = "image",
        content_type: Optional[str] = None,
        public_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Upload media bytes to Cloudinary or generate secure asset reference."""
        if content_type:
            self.validate_file(file_bytes, content_type, resource_type, is_kyc=is_private)

        if not public_id:
            clean_name = os.path.splitext(filename)[0]
            time_str = str(time.time())
            hash_suffix = hashlib.md5(f"{filename}{time_str}".encode()).hexdigest()[:8]
            target_public_id = f"{folder}/{clean_name}_{hash_suffix}".strip("/")
        else:
            target_public_id = public_id.strip("/")

        if self.is_configured():
            try:
                import cloudinary
                import cloudinary.uploader

                cloudinary.config(
                    cloud_name=self.cloud_name,
                    api_key=self.api_key,
                    api_secret=self.api_secret,
                    secure=True,
                )

                upload_options = {
                    "public_id": target_public_id,
                    "resource_type": resource_type,
                    "overwrite": True,
                }

                if is_private:
                    upload_options["type"] = "authenticated"
                    upload_options["access_mode"] = "authenticated"

                result = cloudinary.uploader.upload(file_bytes, **upload_options)
                return {
                    "url": result.get("secure_url", result.get("url")),
                    "public_id": result.get("public_id", target_public_id),
                    "format": result.get("format", "jpg"),
                    "resource_type": result.get("resource_type", resource_type),
                    "width": result.get("width"),
                    "height": result.get("height"),
                    "bytes": result.get("bytes", len(file_bytes)),
                    "is_private": is_private,
                    "storage_provider": "cloudinary",
                }
            except Exception as e:
                logger.error(f"Cloudinary upload failed: {e}")
                if self.is_prod:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Cloudinary media upload failed: {str(e)}",
                    )
                logger.warning("Cloudinary upload failed in non-production. Falling back to test asset reference.")
        else:
            if self.is_prod:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Cloudinary is unconfigured in production environment. Media upload cannot proceed.",
                )

        # Non-prod fallback asset reference
        cname = self.cloud_name or "test_cloud"
        ext = "svg" if content_type == "image/svg+xml" or filename.endswith(".svg") else "jpg"
        asset_url = f"https://res.cloudinary.com/{cname}/{resource_type}/upload/{target_public_id}.{ext}"
        return {
            "url": asset_url,
            "public_id": target_public_id,
            "format": ext,
            "resource_type": resource_type,
            "width": 1200,
            "height": 800,
            "bytes": len(file_bytes),
            "is_private": is_private,
            "storage_provider": "cloudinary",
        }

    def delete(
        self,
        public_id: str,
        is_private: bool = False,
        resource_type: str = "image",
    ) -> Dict[str, Any]:
        """Delete media asset from Cloudinary."""
        if self.is_configured():
            try:
                import cloudinary
                import cloudinary.uploader
                cloudinary.config(
                    cloud_name=self.cloud_name,
                    api_key=self.api_key,
                    api_secret=self.api_secret,
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

    def get_url(
        self,
        public_id: str,
        resource_type: str = "image",
        format: Optional[str] = None,
        transformation: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Construct delivery URL for Cloudinary asset."""
        cname = self.cloud_name or "test_cloud"
        ext = f".{format}" if format else ""
        return f"https://res.cloudinary.com/{cname}/{resource_type}/upload/{public_id}{ext}"

    def get_metadata(
        self,
        public_id: str,
        resource_type: str = "image",
    ) -> Optional[Dict[str, Any]]:
        """Retrieve asset metadata from Cloudinary Admin API."""
        if not self.is_configured():
            return None
        try:
            import cloudinary.api
            res = cloudinary.api.resource(public_id, resource_type=resource_type)
            return {
                "public_id": res.get("public_id"),
                "format": res.get("format"),
                "width": res.get("width"),
                "height": res.get("height"),
                "bytes": res.get("bytes"),
                "secure_url": res.get("secure_url"),
            }
        except Exception as e:
            logger.debug(f"Cloudinary get_metadata not available for {public_id}: {e}")
            return None
