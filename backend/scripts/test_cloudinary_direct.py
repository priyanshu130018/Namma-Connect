import sys
sys.path.insert(0, "backend")
from app.core.config import settings
import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

test_svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#10b981"/></svg>'
test_pid = "namma-connect/services/synthetic/test-srv-001/cover"

res = cloudinary.uploader.upload(
    test_svg,
    public_id=test_pid,
    overwrite=True,
    resource_type="image"
)
print("Upload result public_id:", res.get("public_id"))
print("Upload result secure_url:", res.get("secure_url"))

try:
    meta = cloudinary.api.resource(test_pid)
    print("Resource check OK, format:", meta.get("format"))
except Exception as e:
    print("Resource check error:", e)

del_res = cloudinary.uploader.destroy(test_pid)
print("Delete result:", del_res.get("result"))
