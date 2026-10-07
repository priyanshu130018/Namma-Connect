"""High-level Media Service Abstraction for Namma Connect."""

import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.services.media.base import BaseMediaStorage
from app.services.media.cloudinary_storage import CloudinaryMediaStorage


def get_media_storage() -> BaseMediaStorage:
    """Factory function returning active media storage backend according to MEDIA_STORAGE setting."""
    storage_type = (getattr(settings, "MEDIA_STORAGE", None) or "cloudinary").lower()
    if storage_type == "cloudinary":
        return CloudinaryMediaStorage()
    # Default fallback to Cloudinary
    return CloudinaryMediaStorage()


class MediaService:
    """Domain service managing application media assets via the storage abstraction."""

    def __init__(self, storage: Optional[BaseMediaStorage] = None):
        self.storage = storage or get_media_storage()

    def upload_service_media(
        self,
        db: Session,
        service_id: uuid.UUID,
        file_bytes: bytes,
        filename: str = "service_image.jpg",
        role: str = "gallery",
        sort_order: int = 0,
        content_type: Optional[str] = "image/jpeg",
        is_synthetic: bool = False,
        custom_public_id: Optional[str] = None,
    ) -> Any:
        """Upload a service media image and create an authoritative ServiceMedia record."""
        # Avoid circular import
        from app.modules.marketplace.domain.models import ServiceMedia

        folder = f"namma-connect/services/{'synthetic/' if is_synthetic else ''}{service_id}"
        upload_res = self.storage.upload(
            file_bytes=file_bytes,
            filename=filename,
            folder=folder,
            resource_type="image",
            content_type=content_type,
            public_id=custom_public_id,
        )

        media_item = ServiceMedia(
            id=uuid.uuid4(),
            service_id=service_id,
            storage_provider="cloudinary",
            storage_key=upload_res["public_id"],
            secure_url=upload_res["url"],
            media_type="image",
            role=role,
            sort_order=sort_order,
            width=upload_res.get("width"),
            height=upload_res.get("height"),
            format=upload_res.get("format"),
            is_synthetic=is_synthetic,
        )
        db.add(media_item)
        db.flush()
        return media_item

    def upload_provider_avatar(
        self,
        file_bytes: bytes,
        provider_id_or_name: str,
        filename: str = "avatar.jpg",
        content_type: Optional[str] = "image/jpeg",
        is_synthetic: bool = False,
        custom_public_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Upload provider profile avatar and return asset metadata."""
        folder = f"namma-connect/profiles/{'synthetic' if is_synthetic else 'users'}"
        return self.storage.upload(
            file_bytes=file_bytes,
            filename=filename,
            folder=folder,
            resource_type="image",
            content_type=content_type,
            public_id=custom_public_id,
        )

    def upload_kyc_document(
        self,
        file_bytes: bytes,
        partner_id: str,
        filename: str = "kyc.pdf",
        content_type: Optional[str] = "application/pdf",
    ) -> Dict[str, Any]:
        """Upload sensitive partner KYC verification document with strict access control."""
        folder = "namma-connect/kyc_private"
        return self.storage.upload(
            file_bytes=file_bytes,
            filename=filename,
            folder=folder,
            is_private=True,
            resource_type="raw",
            content_type=content_type,
        )

    def delete_service_media(self, db: Session, media_id: uuid.UUID) -> bool:
        """Delete media asset from storage and database."""
        from app.modules.marketplace.domain.models import ServiceMedia
        media = db.query(ServiceMedia).filter(ServiceMedia.id == media_id).first()
        if not media:
            return False
        try:
            self.storage.delete(media.storage_key, resource_type=media.media_type)
        except Exception as e:
            logger.warning(f"Storage deletion failed for {media.storage_key}: {e}")
        db.delete(media)
        db.flush()
        return True
