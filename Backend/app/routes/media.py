from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.services.cloudinary_service import CloudinaryService

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/mpeg", "video/quicktime", "video/webm"
}

@router.post("/media/upload")
async def upload_media(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")
    
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid file format. Only images and videos are allowed."
        )

    # Validate file size (max 10MB)
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)

    if size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="File size exceeds the 10MB limit."
        )

    try:
        if content_type.startswith("video/"):
            res = CloudinaryService.upload_video(file.file)
        else:
            res = CloudinaryService.upload_image(file.file)
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
