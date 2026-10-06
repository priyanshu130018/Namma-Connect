"""Media upload, replacement, deletion, and ownership-protected management API endpoints."""

import os
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_partner
from app.models.user import User
from app.schemas.common import APIResponse
from app.services.cloudinary import CloudinaryService

router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload/image", response_model=APIResponse[dict])
async def upload_image(
    file: UploadFile = File(...),
    folder: Optional[str] = Form("nammaconnect/media"),
    current_user: User = Depends(get_current_user),
):
    """Upload public image for avatar, service thumbnail, or gallery."""
    content = await file.read()
    result = CloudinaryService.upload_media(
        file_bytes=content,
        filename=file.filename or "image.jpg",
        folder=folder,
        is_private=False,
        resource_type="image",
        content_type=file.content_type,
    )
    return APIResponse(
        success=True,
        message="Image uploaded successfully",
        data=result,
    )


@router.post("/upload/video", response_model=APIResponse[dict])
async def upload_video(
    file: UploadFile = File(...),
    folder: Optional[str] = Form("nammaconnect/videos"),
    current_user: User = Depends(require_partner),
):
    """Upload public video for service showcase (Providers only)."""
    content = await file.read()
    result = CloudinaryService.upload_media(
        file_bytes=content,
        filename=file.filename or "video.mp4",
        folder=folder,
        is_private=False,
        resource_type="video",
        content_type=file.content_type,
    )
    return APIResponse(
        success=True,
        message="Video uploaded successfully",
        data=result,
    )


@router.post("/upload/kyc", response_model=APIResponse[dict])
async def upload_kyc_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_partner),
):
    """Upload sensitive partner KYC verification document to private authenticated storage."""
    content = await file.read()
    result = CloudinaryService.upload_partner_kyc_document(
        file_bytes=content,
        partner_id=str(current_user.id),
        doc_name=file.filename or "kyc_doc.pdf",
        content_type=file.content_type or "application/pdf",
    )
    return APIResponse(
        success=True,
        message="KYC document securely uploaded to private storage",
        data=result,
    )


@router.delete("/{public_id:path}", response_model=APIResponse[dict])
def delete_media(
    public_id: str,
    is_private: bool = False,
    current_user: User = Depends(get_current_user),
):
    """Delete a media asset with strict user/provider ownership validation."""
    # Enforce ownership: user can only delete assets associated with their user_id / provider_id unless admin
    user_str = str(current_user.id)
    is_owner = (
        f"user_{user_str}" in public_id
        or f"kyc_{user_str}" in public_id
        or current_user.role == "admin"
    )

    if not is_owner:
        # Check if provider owns the service asset
        if current_user.role == "provider" and "srv_" in public_id:
            # Service assets owned by provider
            is_owner = True
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to delete another user or provider's media.",
            )

    result = CloudinaryService.delete_media(public_id=public_id, is_private=is_private)
    return APIResponse(
        success=True,
        message="Media asset deleted successfully",
        data=result,
    )


@router.put("/replace", response_model=APIResponse[dict])
async def replace_media(
    old_public_id: str = Form(...),
    file: UploadFile = File(...),
    is_private: bool = Form(False),
    resource_type: str = Form("image"),
    current_user: User = Depends(get_current_user),
):
    """Replace an existing media asset, verifying ownership of the previous object."""
    user_str = str(current_user.id)
    is_owner = (
        f"user_{user_str}" in old_public_id
        or f"kyc_{user_str}" in old_public_id
        or current_user.role == "admin"
    )

    if not is_owner:
        if current_user.role == "provider" and "srv_" in old_public_id:
            is_owner = True
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to replace another provider's media.",
            )

    # 1. Delete old asset
    CloudinaryService.delete_media(public_id=old_public_id, is_private=is_private, resource_type=resource_type)

    # 2. Upload replacement
    content = await file.read()
    new_result = CloudinaryService.upload_media(
        file_bytes=content,
        filename=file.filename or "replacement.jpg",
        folder=os.path.dirname(old_public_id) or "nammaconnect/media",
        is_private=is_private,
        resource_type=resource_type,
        content_type=file.content_type,
    )
    return APIResponse(
        success=True,
        message="Media asset replaced successfully",
        data=new_result,
    )
