# Cloudinary Media Upload

Namma Connect integrates with Cloudinary to handle user portfolio media uploads and farm listing images securely.

---

## 📸 Media Upload Flow

Rather than storing media files on the local filesystem (which limits scalability and consumes local server disk space), the backend acts as a pass-through layer sending files directly to Cloudinary:

```
[ Frontend File ] ──> POST /media/upload ──> [ File Validation ] ──> Upload to Cloudinary ──> Return URL
```

1. **Upload Request**: The frontend sends a multipart form containing the image or video to `POST /media/upload`.
2. **File Validation**:
   - **Format Check**: The MIME type of the file is verified against an allowed list (allowing only standard images: jpeg, png, gif, webp; and videos: mp4, mpeg, mov, webm).
   - **Size Check**: File sizes are read in memory, rejecting any uploads exceeding **10MB**.
3. **Cloudinary Upload**: If valid, the file stream is uploaded.
   - Videos are explicitly uploaded with `resource_type="video"` to activate Cloudinary's streaming transcoding.
   - Images are uploaded using default transcodings.
4. **Response**: The API returns the `secure_url` and `public_id` pointing to the Cloudinary storage location.
5. **Database Storage**: The frontend or the backend saves the resulting HTTPS Cloudinary string URL in the database model tables (such as `FarmListing.image_url` or `Creator.portfolio_url`).
