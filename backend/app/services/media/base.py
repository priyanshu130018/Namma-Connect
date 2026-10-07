"""Abstract Base Class for Media Storage Backends."""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class BaseMediaStorage(ABC):
    """Abstract interface for media storage backends (Cloudinary, future S3, etc.)."""

    @abstractmethod
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
        """Upload media bytes and return metadata dict with 'url', 'public_id', 'format', etc."""
        pass

    @abstractmethod
    def delete(
        self,
        public_id: str,
        is_private: bool = False,
        resource_type: str = "image",
    ) -> Dict[str, Any]:
        """Delete media asset by public ID / storage key."""
        pass

    @abstractmethod
    def get_url(
        self,
        public_id: str,
        resource_type: str = "image",
        format: Optional[str] = None,
        transformation: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Construct secure delivery URL for the asset."""
        pass

    @abstractmethod
    def get_metadata(
        self,
        public_id: str,
        resource_type: str = "image",
    ) -> Optional[Dict[str, Any]]:
        """Retrieve media metadata (width, height, format, size) if available."""
        pass
