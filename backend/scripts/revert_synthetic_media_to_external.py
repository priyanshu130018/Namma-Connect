"""Script to safely revert synthetic media from Cloudinary to external Unsplash and DiceBear URLs.

1. Inspects Cloudinary and safely removes only synthetic assets if any exist.
2. Removes all synthetic ServiceMedia records from PostgreSQL (retaining real user/provider media).
3. Re-aligns all 3,000 synthetic services with canonical Unsplash IMAGE_POOLS.
4. Re-aligns all synthetic provider avatars with DiceBear SVG URLs.
5. Verifies database integrity and reports exact counts.
"""

import os
import sys
import json
import time
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import SessionLocal
import app.models
from app.models.user import User
from app.modules.marketplace.domain.models import Service, ServiceMedia
from scripts.seed_data.service_templates import IMAGE_POOLS, CATEGORY_CONFIGS
from app.services.cloudinary import CloudinaryService

def run_revert(db: Session) -> Dict[str, Any]:
    print("=" * 70)
    print("NAMMA CONNECT — REVERT SYNTHETIC MEDIA TO EXTERNAL URLS")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. Cloudinary Asset Audit & Cleanup (Synthetic Only)
    # -------------------------------------------------------------
    cloudinary_deleted_count = 0
    if CloudinaryService.is_configured():
        try:
            import cloudinary
            import cloudinary.api
            print("Checking Cloudinary for synthetic assets...")
            
            # Check services synthetic folder
            try:
                res_services = cloudinary.api.resources(
                    type="upload",
                    prefix="namma-connect/services/synthetic",
                    max_results=500
                )
                service_resources = res_services.get("resources", [])
                if service_resources:
                    pub_ids = [r["public_id"] for r in service_resources]
                    del_res = cloudinary.api.delete_resources(pub_ids)
                    cloudinary_deleted_count += len(pub_ids)
                    print(f"  Deleted {len(pub_ids)} synthetic service assets from Cloudinary.")
                else:
                    print("  No synthetic service assets found in Cloudinary folder.")
            except Exception as e:
                print(f"  Cloudinary check for services/synthetic: {e}")

            # Check profiles synthetic folder
            try:
                res_profiles = cloudinary.api.resources(
                    type="upload",
                    prefix="namma-connect/profiles/synthetic",
                    max_results=500
                )
                profile_resources = res_profiles.get("resources", [])
                if profile_resources:
                    pub_ids = [r["public_id"] for r in profile_resources]
                    del_res = cloudinary.api.delete_resources(pub_ids)
                    cloudinary_deleted_count += len(pub_ids)
                    print(f"  Deleted {len(pub_ids)} synthetic profile avatar assets from Cloudinary.")
                else:
                    print("  No synthetic profile assets found in Cloudinary folder.")
            except Exception as e:
                print(f"  Cloudinary check for profiles/synthetic: {e}")

        except Exception as e:
            print(f"Cloudinary audit skipped or encountered notice: {e}")
    else:
        print("Cloudinary not configured with active credentials; no remote assets to delete.")

    # -------------------------------------------------------------
    # 2. Reconcile ServiceMedia table
    # -------------------------------------------------------------
    print("\nReconciling ServiceMedia table in PostgreSQL...")
    total_media_before = db.query(ServiceMedia).count()
    synthetic_media = db.query(ServiceMedia).filter(ServiceMedia.is_synthetic == True).all()
    real_media = db.query(ServiceMedia).filter(ServiceMedia.is_synthetic == False).all()
    print(f"  Total ServiceMedia before: {total_media_before}")
    print(f"  Synthetic ServiceMedia:    {len(synthetic_media)}")
    print(f"  Real User/Provider Media:  {len(real_media)}")

    deleted_media_count = 0
    if synthetic_media:
        # Delete only synthetic ServiceMedia
        db.query(ServiceMedia).filter(ServiceMedia.is_synthetic == True).delete(synchronize_session=False)
        db.commit()
        deleted_media_count = len(synthetic_media)
        print(f"  Successfully deleted {deleted_media_count} synthetic ServiceMedia rows.")

    total_media_after = db.query(ServiceMedia).count()
    print(f"  Total ServiceMedia after:  {total_media_after} (Real media preserved: {total_media_after == len(real_media)})")

    # -------------------------------------------------------------
    # 3. Restore Synthetic Services to Unsplash IMAGE_POOLS
    # -------------------------------------------------------------
    print("\nRestoring synthetic services to canonical Unsplash IMAGE_POOLS...")
    services = db.query(Service).filter(Service.is_synthetic == True).order_by(Service.created_at.asc()).all()
    print(f"  Found {len(services)} synthetic services to update.")

    updated_services_count = 0
    for idx, srv in enumerate(services):
        cat_slug = srv.category_slug or "farm"
        img_pool = IMAGE_POOLS.get(cat_slug, IMAGE_POOLS["farm"])
        primary_img = img_pool[idx % len(img_pool)]
        gallery_imgs = [
            primary_img,
            img_pool[(idx + 1) % len(img_pool)],
            img_pool[(idx + 2) % len(img_pool)],
        ]
        provider_name = srv.provider_name or "Host"
        provider_avatar = f"https://api.dicebear.com/7.x/initials/svg?seed={provider_name}"

        srv.primary_image = primary_img
        srv.images_json = json.dumps(gallery_imgs)
        srv.provider_avatar = provider_avatar
        updated_services_count += 1

    db.commit()
    print(f"  Successfully updated {updated_services_count} synthetic services.")

    # -------------------------------------------------------------
    # 4. Restore Synthetic Provider User Avatars
    # -------------------------------------------------------------
    print("\nRestoring synthetic provider user avatars to DiceBear...")
    providers = db.query(User).filter(User.role == "provider", User.is_synthetic == True).all()
    updated_providers_count = 0
    for p in providers:
        p.avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={p.full_name}"
        updated_providers_count += 1
    db.commit()
    print(f"  Successfully updated {updated_providers_count} synthetic provider user avatars.")

    # -------------------------------------------------------------
    # 5. Database Verification & Audit
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("DATABASE AUDIT & VERIFICATION")
    print("=" * 70)
    
    total_synthetic_services = db.query(Service).filter(Service.is_synthetic == True).count()
    unsplash_primary_count = db.query(Service).filter(
        Service.is_synthetic == True,
        Service.primary_image.like("https://images.unsplash.com/%")
    ).count()
    cloudinary_primary_count = db.query(Service).filter(
        Service.is_synthetic == True,
        Service.primary_image.like("%cloudinary%")
    ).count()

    dicebear_provider_count = db.query(Service).filter(
        Service.is_synthetic == True,
        Service.provider_avatar.like("https://api.dicebear.com/%")
    ).count()

    print(f"Total Synthetic Services:               {total_synthetic_services}")
    print(f"Synthetic Services with Unsplash Primary: {unsplash_primary_count} / {total_synthetic_services}")
    print(f"Synthetic Services with Cloudinary:     {cloudinary_primary_count}")
    print(f"Synthetic Services with DiceBear Avatar: {dicebear_provider_count} / {total_synthetic_services}")
    print(f"Synthetic ServiceMedia Rows Remaining:   {db.query(ServiceMedia).filter(ServiceMedia.is_synthetic == True).count()}")
    print(f"Real ServiceMedia Rows Preserved:        {db.query(ServiceMedia).filter(ServiceMedia.is_synthetic == False).count()}")

    # Sample service inspection
    sample_srv = db.query(Service).filter(Service.is_synthetic == True).first()
    if sample_srv:
        print("\n--- Concrete Sample Service ---")
        print(f"ID:             {sample_srv.id}")
        print(f"Title:          {sample_srv.title}")
        print(f"Category:       {sample_srv.category} ({sample_srv.category_slug})")
        print(f"Primary Image:  {sample_srv.primary_image}")
        print(f"Gallery Images: {sample_srv.images_json}")
        print(f"Provider Avatar:{sample_srv.provider_avatar}")

    return {
        "synthetic_services": total_synthetic_services,
        "unsplash_primary": unsplash_primary_count,
        "cloudinary_primary": cloudinary_primary_count,
        "dicebear_providers": dicebear_provider_count,
        "deleted_media_rows": deleted_media_count,
        "cloudinary_deleted_count": cloudinary_deleted_count,
    }

if __name__ == "__main__":
    db = SessionLocal()
    try:
        run_revert(db)
    finally:
        db.close()
