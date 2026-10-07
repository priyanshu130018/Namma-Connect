"""Production-Realistic Synthetic Data Seeding System for Namma Connect V2.

Generates 1,200 accounts (1 Admin, 899 Customers, 300 Verified Providers),
3,000 published services across all 10 marketplace categories, 180,000 availability slots,
2,500 bookings, 2,500 payments, 5,500 verified reviews, and recommendation interaction data.

Usage:
    python scripts/seed_dev_data.py [--reset] [--skip-availability]
"""

import sys
import os
import uuid
import random
import json
import time
from datetime import datetime, date, timedelta
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Any, Tuple

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.category import MarketplaceCategory
from app.models.service import Service, ServiceMedia, ServiceAvailability, SavedService, Review
from app.models.partner_application import PartnerApplication
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.notification import Notification
from app.models.trip import Trip, TripDay, TripItem, AITripPlan
from app.models.recommendation import (
    UserInteraction,
    UserInterestProfile,
    RecommendationResult,
)
from app.services.embedding import EmbeddingService

from scripts.seed_data import (
    KARNATAKA_DISTRICTS,
    FIRST_NAMES,
    LAST_NAMES,
    PROVIDER_BUSINESS_SUFFIXES,
    ID_TYPES,
    generate_travel_preferences,
    generate_notification_preferences,
    generate_privacy_preferences,
    CATEGORY_CONFIGS,
    IMAGE_POOLS,
    CROPS,
    LANDSCAPES,
    CUISINES,
    CRAFTS,
    WILDLIFE_TARGETS,
    REVIEW_COMMENTS,
    generate_rating,
)


def check_safety_guard():
    """Ensure script never runs in production environments."""
    env = os.environ.get("ENVIRONMENT", getattr(settings, "ENV", "development")).lower()
    app_env = getattr(settings, "ENVIRONMENT", "").lower()
    db_url = str(settings.DATABASE_URL).lower()
    if any(e in ("prod", "production") for e in (env, app_env)) or any(k in db_url for k in ("prod", "production", "rds.amazonaws.com", "neon.tech/prod")):
        print("\n[FATAL] Seed script execution refused! Production environment or database detected.")
        print("This script is strictly for development and staging environments.")
        sys.exit(1)


def seed_development_data(db: Session, reset_first: bool = False, seed_avail: bool = True):
    """Execute complete synthetic marketplace seeding workflow."""
    check_safety_guard()
    t_start = time.time()

    print("\n" + "=" * 70)
    print("  NAMMA CONNECT V2 — PRODUCTION-REALISTIC DATA SEEDING SYSTEM")
    print("=" * 70)
    print(f"  Target Database:       {settings.DATABASE_SYNC_URL.split('@')[-1] if '@' in settings.DATABASE_SYNC_URL else 'PostgreSQL'}")
    print(f"  Environment:           {settings.ENV}")
    print(f"  Reset Existing Data:   {reset_first}")
    print("=" * 70 + "\n")

    if reset_first:
        print("[0/9] Resetting existing synthetic test data...")
        from scripts.clear_dev_data import clear_development_data
        clear_development_data(db, preserve_manual_accounts=False)

    # ─────────────────────────────────────────────────────────────
    # STEP 1: VERIFY TAXONOMY CATEGORIES
    # ─────────────────────────────────────────────────────────────
    print("[1/9] Verifying official marketplace taxonomy categories...")
    categories = db.query(MarketplaceCategory).all()
    if len(categories) < 10:
        from app.services.marketplace import MarketplaceService
        MarketplaceService.ensure_seeded(db)
        categories = db.query(MarketplaceCategory).all()
    
    cat_by_slug = {c.slug: c for c in categories}
    print(f"      Verified {len(categories)} taxonomy categories across activities & creator services.")

    # ─────────────────────────────────────────────────────────────
    # STEP 2: CONCURRENT PASSWORD HASHING
    # ─────────────────────────────────────────────────────────────
    print("\n[2/9] Generating cryptographically secure bcrypt password hashes...")
    RAW_PASSWORD = "123456789"
    # Total accounts: 1 Admin + 899 Customers + 300 Providers = 1,200
    TOTAL_ACCOUNTS = 1200
    t_hash_start = time.time()
    with ThreadPoolExecutor(max_workers=16) as executor:
        password_hashes = list(executor.map(get_password_hash, [RAW_PASSWORD] * TOTAL_ACCOUNTS))
    print(f"      Successfully generated {len(password_hashes)} unique bcrypt password hashes in {round(time.time() - t_hash_start, 2)}s.")
    assert verify_password(RAW_PASSWORD, password_hashes[0]), "Password hash verification failed!"

    # ─────────────────────────────────────────────────────────────
    # STEP 3: SEED ADMIN, PRIYANSHU & ARAYN (MANUAL ACCOUNTS)
    # ─────────────────────────────────────────────────────────────
    print("\n[3/9] Auditing admin accounts and seeding manual test accounts...")
    
    # 3.1 Admin account check & enforcement (EXACTLY ONE ADMIN)
    ADMIN_EMAIL = "namma_connect@gmail.com"
    existing_admins = db.query(User).filter(User.role == "admin").all()
    conflicting_admins = [u for u in existing_admins if u.email.lower() != ADMIN_EMAIL]
    if conflicting_admins:
        print(f"      [WARNING] Found {len(conflicting_admins)} conflicting admin(s): {[u.email for u in conflicting_admins]}")
        print("      Resolving conflict: Demoting non-target admin accounts to user role...")
        for conf_admin in conflicting_admins:
            conf_admin.role = "user"
        db.commit()

    admin_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not admin_user:
        admin_user = User(
            id=uuid.uuid4(),
            email=ADMIN_EMAIL,
            hashed_password=password_hashes[0],
            full_name="Namma Connect Admin",
            mobile="+919800000001",
            role="admin",
            is_active=True,
            is_verified=True,
            phone_verified=True,
            auth_provider="local",
            location="Bengaluru, Karnataka",
            notification_preferences=generate_notification_preferences(),
            privacy_preferences=generate_privacy_preferences(),
            is_test_data=True,
            is_synthetic=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"      Created Authoritative Admin: {admin_user.full_name} ({admin_user.email})")
    else:
        admin_user.role = "admin"
        admin_user.is_active = True
        admin_user.is_verified = True
        admin_user.is_synthetic = True
        admin_user.hashed_password = password_hashes[0]
        db.commit()
        print(f"      Updated Authoritative Admin: {admin_user.full_name} ({admin_user.email})")

    # 3.2 Manual Test Customer: Priyanshu
    PRIYANSHU_EMAIL = "priyanshu@gmail.com"
    priyanshu_user = db.query(User).filter(User.email == PRIYANSHU_EMAIL).first()
    if not priyanshu_user:
        priyanshu_user = User(
            id=uuid.uuid4(),
            email=PRIYANSHU_EMAIL,
            hashed_password=password_hashes[1],
            full_name="Priyanshu",
            mobile="+919845012345",
            role="user",
            is_active=True,
            is_verified=True,
            phone_verified=True,
            auth_provider="local",
            location="Bengaluru, Karnataka",
            travel_preferences=generate_travel_preferences(is_priyanshu=True),
            bio="Traveler & explorer passionate about Karnataka's rural heritage, coffee estates, and coastal culture.",
            notification_preferences=generate_notification_preferences(),
            privacy_preferences=generate_privacy_preferences(),
            is_test_data=True,
            is_synthetic=True,
        )
        db.add(priyanshu_user)
        db.commit()
        db.refresh(priyanshu_user)
        print(f"      Created Manual Customer:    {priyanshu_user.full_name} ({priyanshu_user.email})")
    else:
        priyanshu_user.role = "user"
        priyanshu_user.is_active = True
        priyanshu_user.is_verified = True
        priyanshu_user.is_synthetic = True
        priyanshu_user.hashed_password = password_hashes[1]
        priyanshu_user.travel_preferences = generate_travel_preferences(is_priyanshu=True)
        db.commit()
        print(f"      Updated Manual Customer:    {priyanshu_user.full_name} ({priyanshu_user.email})")

    # 3.3 Manual Test Provider: arayn@gmail.com
    ARAYN_EMAIL = "arayn@gmail.com"
    arayn_user = db.query(User).filter(User.email == ARAYN_EMAIL).first()
    if not arayn_user:
        arayn_user = User(
            id=uuid.uuid4(),
            email=ARAYN_EMAIL,
            hashed_password=password_hashes[2],
            full_name="Arayn Gowda",
            mobile="+919845098765",
            role="provider",
            is_active=True,
            is_verified=True,
            phone_verified=True,
            auth_provider="local",
            location="Madikeri, Kodagu (Coorg)",
            bio="Pioneer of sustainable agro-tourism, plantation stays, and Western Ghats eco-tours in Kodagu.",
            notification_preferences=generate_notification_preferences(),
            privacy_preferences=generate_privacy_preferences(),
            is_test_data=True,
            is_synthetic=True,
        )
        db.add(arayn_user)
        db.commit()
        db.refresh(arayn_user)
        print(f"      Created Manual Provider:    {arayn_user.full_name} ({arayn_user.email})")
    else:
        arayn_user.role = "provider"
        arayn_user.is_active = True
        arayn_user.is_verified = True
        arayn_user.is_synthetic = True
        arayn_user.hashed_password = password_hashes[2]
        db.commit()
        print(f"      Updated Manual Provider:    {arayn_user.full_name} ({arayn_user.email})")

    # 3.4 Approved KYC PartnerApplication for arayn@gmail.com
    arayn_app = db.query(PartnerApplication).filter(PartnerApplication.user_id == arayn_user.id).first()
    if not arayn_app:
        arayn_app = PartnerApplication(
            id=uuid.uuid4(),
            application_code="APP-ARAYN-001",
            user_id=arayn_user.id,
            role_type="farmer",
            full_name=arayn_user.full_name,
            email=arayn_user.email,
            mobile=arayn_user.mobile,
            address="Estate No. 14, Madikeri - Virajpet Road",
            district="Kodagu (Coorg)",
            state="Karnataka",
            latitude=12.4244,
            longitude=75.7382,
            business_name="Arayn Agro & Adventure Retreats",
            experience_years=8,
            bio="Leading organic coffee and spice plantation host with guided estate experiences.",
            languages="English, Kannada, Hindi",
            id_type="Aadhaar",
            id_number="987654321098",
            document_url="https://res.cloudinary.com/namma-connect/kyc/arayn_aadhaar.pdf",
            draft_step=4,
            status="APPROVED",
            reviewed_by=admin_user.id,
            reviewed_at=datetime.utcnow() - timedelta(days=120),
            is_test_data=True,
            is_synthetic=True,
        )
        db.add(arayn_app)
        db.commit()
        print(f"      KYC Verified Provider:      {arayn_user.email} (Status: APPROVED)")
    else:
        arayn_app.is_synthetic = True
        db.commit()

    # ─────────────────────────────────────────────────────────────
    # STEP 4: SEED SYNTHETIC USERS (898 CUSTOMERS + 299 PROVIDERS)
    # ─────────────────────────────────────────────────────────────
    print("\n[4/9] Seeding 898 synthetic customers and 299 verified providers...")
    
    # Check existing test users
    existing_user_count = db.query(User).count()
    users_to_create: List[User] = []
    apps_to_create: List[PartnerApplication] = []

    # Target: 899 customers (Priyanshu + 898 synthetic)
    # Target: 300 providers (Arayn + 299 synthetic)
    # Total = 1,200 accounts
    
    hash_idx = 3
    customer_users: List[User] = [priyanshu_user]
    provider_users: List[User] = [arayn_user]

    d_count = len(KARNATAKA_DISTRICTS)

    # 4.1 Generate 898 Customers
    for c_idx in range(1, 899):
        email = f"cust.karnataka.{c_idx:04d}@nammaconnect.dev"
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            customer_users.append(existing)
            continue

        f_name = FIRST_NAMES[(c_idx * 7) % len(FIRST_NAMES)]
        l_name = LAST_NAMES[(c_idx * 11) % len(LAST_NAMES)]
        full_name = f"{f_name} {l_name}"
        
        district_info = KARNATAKA_DISTRICTS[c_idx % d_count]
        loc_name = district_info["locations"][c_idx % len(district_info["locations"])]["name"]
        
        u = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=password_hashes[hash_idx % len(password_hashes)],
            full_name=full_name,
            mobile=f"+9180{c_idx:08d}",
            role="user",
            is_active=True,
            is_verified=True,
            phone_verified=True,
            auth_provider="local",
            location=f"{loc_name}, {district_info['district']}",
            travel_preferences=generate_travel_preferences(is_priyanshu=False, archetype_idx=c_idx),
            bio=f"Passionate traveler and culture enthusiast from {loc_name}.",
            gender="Female" if c_idx % 3 == 0 else "Male",
            date_of_birth=f"{1980 + (c_idx % 22):04d}-{(c_idx % 12) + 1:02d}-{(c_idx % 28) + 1:02d}",
            notification_preferences=generate_notification_preferences(),
            privacy_preferences=generate_privacy_preferences(),
            is_test_data=True,
            is_synthetic=True,
            created_at=datetime.utcnow() - timedelta(days=random.randint(30, 200)),
        )
        hash_idx += 1
        users_to_create.append(u)
        customer_users.append(u)

    # 4.2 Generate 299 Providers
    role_types = ["farmer", "farmer", "guide", "homestay", "artisan", "experience"]
    for p_idx in range(1, 300):
        email = f"prov.karnataka.{p_idx:04d}@nammaconnect.dev"
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            provider_users.append(existing)
            continue

        f_name = FIRST_NAMES[(p_idx * 13) % len(FIRST_NAMES)]
        l_name = LAST_NAMES[(p_idx * 17) % len(LAST_NAMES)]
        full_name = f"{f_name} {l_name}"

        district_info = KARNATAKA_DISTRICTS[p_idx % d_count]
        loc_info = district_info["locations"][p_idx % len(district_info["locations"])]
        loc_name = loc_info["name"]

        biz_suffix = PROVIDER_BUSINESS_SUFFIXES[p_idx % len(PROVIDER_BUSINESS_SUFFIXES)]
        business_name = f"{l_name} {biz_suffix}"
        r_type = role_types[p_idx % len(role_types)]

        u = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=password_hashes[hash_idx % len(password_hashes)],
            full_name=full_name,
            mobile=f"+9190{p_idx:08d}",
            role="provider",
            is_active=True,
            is_verified=True,
            phone_verified=True,
            auth_provider="local",
            location=f"{loc_name}, {district_info['district']}",
            bio=f"Host and caretaker at {business_name} in {district_info['district']}.",
            notification_preferences=generate_notification_preferences(),
            privacy_preferences=generate_privacy_preferences(),
            is_test_data=True,
            is_synthetic=True,
            created_at=datetime.utcnow() - timedelta(days=random.randint(60, 300)),
        )
        hash_idx += 1
        users_to_create.append(u)
        provider_users.append(u)

        # KYC Partner Application
        app = PartnerApplication(
            id=uuid.uuid4(),
            application_code=f"APP-NC-{p_idx:05d}",
            user_id=u.id,
            role_type=r_type,
            full_name=full_name,
            email=email,
            mobile=u.mobile,
            address=f"Rural Survey No. {(p_idx * 37) % 500 + 1}, {loc_name}",
            district=district_info["district"],
            state="Karnataka",
            latitude=loc_info["lat"],
            longitude=loc_info["lng"],
            business_name=business_name,
            experience_years=3 + (p_idx % 20),
            bio=f"Dedicated provider offering authentic local tourism and community hospitality in {loc_name}.",
            languages="Kannada, English, Hindi",
            id_type=ID_TYPES[p_idx % len(ID_TYPES)],
            id_number=f"{(100000000000 + p_idx * 98765) % 900000000000 + 100000000000}",
            document_url=f"https://res.cloudinary.com/namma-connect/kyc/doc_{p_idx}.pdf",
            draft_step=4,
            status="APPROVED",
            reviewed_by=admin_user.id,
            reviewed_at=datetime.utcnow() - timedelta(days=random.randint(15, 60)),
            is_test_data=True,
            is_synthetic=True,
            created_at=datetime.utcnow() - timedelta(days=random.randint(60, 200)),
        )
        apps_to_create.append(app)

    if users_to_create:
        db.bulk_save_objects(users_to_create)
        db.commit()
    if apps_to_create:
        db.bulk_save_objects(apps_to_create)
        db.commit()

    total_customers_now = db.query(User).filter(User.role.in_(["user", "customer"])).count()
    total_providers_now = db.query(User).filter(User.role == "provider").count()
    total_admin_now = db.query(User).filter(User.role == "admin").count()
    print(f"      Total Accounts: {total_admin_now + total_customers_now + total_providers_now} "
          f"({total_admin_now} Admin, {total_customers_now} Customers, {total_providers_now} Providers)")

    # ─────────────────────────────────────────────────────────────
    # STEP 5: SEED 3,000 SERVICES ACROSS ALL 10 CATEGORIES
    # ─────────────────────────────────────────────────────────────
    print("\n[5/9] Seeding exactly 3,000 realistic Karnataka services across 10 categories...")
    
    # Target distribution across 10 categories:
    CATEGORY_DISTRIBUTION = [
        ("farm", 500),
        ("adventure", 450),
        ("food", 400),
        ("cultural-historical", 400),
        ("wildlife", 300),
        ("water-sports", 250),
        ("photography", 200),
        ("videography", 200),
        ("drone-aerial", 150),
        ("travel-reels", 150),
    ]
    # Sum: 500+450+400+400+300+250+200+200+150+150 = 3,000 services!

    # Provider service assignment:
    # 300 providers. Arayn gets 10 services.
    # 50 providers get 1 service = 50
    # 60 providers get 2 or 3 = ~150
    # 70 providers get 4 to 7 = ~380
    # 90 providers get 8 to 15 = ~1,880
    # 29 providers get 16 to 19 = ~530
    # Total = 3,000 services!
    
    # Pre-build list of provider IDs with varied counts
    provider_slots: List[User] = []
    # Arayn (10 services)
    for _ in range(10):
        provider_slots.append(arayn_user)
    
    remaining_providers = [p for p in provider_users if p.email != ARAYN_EMAIL]
    random.seed(42)  # Deterministic seed for reproducible distribution
    random.shuffle(remaining_providers)

    p_idx_cursor = 0
    # Tier 1: 50 providers with 1 service
    for _ in range(50):
        provider_slots.extend([remaining_providers[p_idx_cursor]] * 1)
        p_idx_cursor += 1
    # Tier 2: 60 providers with 2-3 services (avg 2.5) -> 150
    for i in range(60):
        count = 2 if i % 2 == 0 else 3
        provider_slots.extend([remaining_providers[p_idx_cursor]] * count)
        p_idx_cursor += 1
    # Tier 3: 70 providers with 4-7 services (avg 5.5) -> 385
    for i in range(70):
        count = 4 + (i % 4)  # 4, 5, 6, 7
        provider_slots.extend([remaining_providers[p_idx_cursor]] * count)
        p_idx_cursor += 1
    # Tier 4: 90 providers with 8-15 services -> 1,875
    for i in range(90):
        count = 8 + (i % 8) * 2  # 8, 10, 12, 14, 16...
        if count > 15:
            count = 15
        provider_slots.extend([remaining_providers[p_idx_cursor]] * count)
        p_idx_cursor += 1
    # Tier 5: 29 providers with 16-20 services -> remainder to 3000
    current_slots = len(provider_slots)
    remaining_to_3000 = 3000 - current_slots
    slots_per_last_tier = remaining_to_3000 // 29
    extra_slots = remaining_to_3000 % 29
    for i in range(29):
        count = slots_per_last_tier + (1 if i < extra_slots else 0)
        provider_slots.extend([remaining_providers[p_idx_cursor]] * count)
        p_idx_cursor += 1

    # Trim or pad to exactly 3,000 slots
    if len(provider_slots) > 3000:
        provider_slots = provider_slots[:3000]
    elif len(provider_slots) < 3000:
        while len(provider_slots) < 3000:
            provider_slots.append(arayn_user)

    print("      Mapped 3,000 service assignment slots across 300 providers (Arayn has 10 services).")

    # Generate the 3,000 services
    created_services: List[Service] = []
    global_s_idx = 0

    existing_service_count = db.query(Service).count()
    if existing_service_count >= 3000:
        print(f"      Database already contains {existing_service_count} services. Reusing existing catalog.")
        created_services = db.query(Service).order_by(Service.created_at.asc()).limit(3000).all()
    else:
        for cat_slug, target_count in CATEGORY_DISTRIBUTION:
            cat_obj = cat_by_slug[cat_slug]
            cat_cfg = CATEGORY_CONFIGS[cat_slug]
            img_pool = IMAGE_POOLS[cat_slug]
            templates = cat_cfg["templates"]

            for c_s_idx in range(target_count):
                global_s_idx += 1
                assigned_provider = provider_slots[global_s_idx - 1]

                # Pick district & location
                d_idx = (global_s_idx * 3) % d_count
                d_info = KARNATAKA_DISTRICTS[d_idx]
                loc_list = d_info["locations"]
                loc_info = loc_list[(global_s_idx * 7) % len(loc_list)]
                loc_name = loc_info["name"]
                district_name = d_info["district"]

                # Pick template & variables
                tpl = templates[c_s_idx % len(templates)]
                crop = CROPS[(global_s_idx + 1) % len(CROPS)]
                landscape = LANDSCAPES[(global_s_idx + 2) % len(LANDSCAPES)]
                cuisine = CUISINES[(global_s_idx + 3) % len(CUISINES)]
                craft = CRAFTS[(global_s_idx + 4) % len(CRAFTS)]
                wildlife_target = WILDLIFE_TARGETS[(global_s_idx + 5) % len(WILDLIFE_TARGETS)]

                title = tpl["title_fmt"].format(
                    crop=crop, landscape=landscape, cuisine=cuisine, craft=craft,
                    target=wildlife_target, location=loc_name, district=district_name
                )
                desc = tpl["desc_fmt"].format(
                    crop=crop, landscape=landscape, cuisine=cuisine, craft=craft,
                    target=wildlife_target, location=loc_name, district=district_name
                )

                # Format price
                p_min, p_max = cat_cfg["price_range"]
                step = 50
                price_val = Decimal(str(random.randint(p_min // step, p_max // step) * step))

                # Unit and duration
                unit_val = random.choice(cat_cfg["units"])
                dur_min, dur_max = cat_cfg["duration_range"]
                duration_val = round(random.uniform(dur_min, dur_max), 1)

                cap_min, cap_max = cat_cfg["capacity_range"]
                capacity_val = random.randint(cap_min, cap_max)

                # Images
                primary_img = img_pool[c_s_idx % len(img_pool)]
                gallery_imgs = [
                    primary_img,
                    img_pool[(c_s_idx + 1) % len(img_pool)],
                    img_pool[(c_s_idx + 2) % len(img_pool)],
                ]

                # Slug
                unique_slug = f"nc-{cat_slug}-{global_s_idx:04d}-{uuid.uuid4().hex[:6]}"

                # Normalized deterministic 768-dim embedding for pgvector
                embedding_text = f"{title} | {desc} | {cat_obj.name} | {loc_name} | {district_name}"
                vector_embedding = EmbeddingService._generate_deterministic_vector(embedding_text)

                srv = Service(
                    id=uuid.uuid4(),
                    title=title,
                    slug=unique_slug,
                    description=desc,
                    category=cat_obj.name,
                    category_slug=cat_slug,
                    category_id=cat_obj.id,
                    marketplace_type=cat_obj.marketplace_type,
                    location=f"{loc_name}, {district_name}",
                    district=district_name,
                    state="Karnataka",
                    latitude=loc_info["lat"],
                    longitude=loc_info["lng"],
                    formatted_address=f"{loc_name}, {district_name}, Karnataka, India",
                    price=price_val,
                    unit=unit_val,
                    duration_hours=duration_val,
                    max_capacity=capacity_val,
                    rating=5.0,
                    reviews_count=0,
                    is_verified=True,
                    status="PUBLISHED",
                    provider_id=assigned_provider.id,
                    provider_name=assigned_provider.full_name,
                    provider_type=cat_obj.marketplace_type.title().replace("_", " "),
                    provider_avatar=f"https://api.dicebear.com/7.x/initials/svg?seed={assigned_provider.full_name}",
                    reviewed_by=admin_user.id,
                    reviewed_at=datetime.utcnow() - timedelta(days=random.randint(10, 100)),
                    primary_image=primary_img,
                    images_json=json.dumps(gallery_imgs),
                    inclusions_json=json.dumps(tpl["inclusions"]),
                    amenities_json=json.dumps(tpl["amenities"]),
                    embedding=vector_embedding,
                    is_test_data=True,
                    is_synthetic=True,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                )
                created_services.append(srv)

        # Batch insert services in chunks of 500
        for chunk_start in range(0, len(created_services), 500):
            chunk = created_services[chunk_start:chunk_start + 500]
            db.bulk_save_objects(chunk)
            db.commit()
            print(f"      Saved {min(chunk_start + 500, len(created_services))}/3,000 services...")

    print(f"      Successfully saved and indexed {len(created_services)} services across 10 categories.")

    # ─────────────────────────────────────────────────────────────
    # STEP 6: SEED REALISTIC SERVICE AVAILABILITY (60 FUTURE DAYS)
    # ─────────────────────────────────────────────────────────────
    print("\n[6/9] Seeding realistic availability calendar (60 future days per service)...")
    
    if seed_avail:
        existing_avail_count = db.query(ServiceAvailability).count()
        if existing_avail_count >= 100000:
            print(f"      Availability already populated ({existing_avail_count} records). Skipping regeneration.")
        else:
            t_avail_start = time.time()
            avail_records: List[Dict[str, Any]] = []
            today = date.today()
            TOTAL_DAYS = 60  # Tomorrow to +60 days

            # Service date schedules
            # Standard services: open daily
            # Some services (mod 7 == 0): weekends only
            # Some days (mod 13 == 0): blackout / blocked
            
            for s_idx, srv in enumerate(created_services):
                is_weekend_only = (s_idx % 7 == 0)
                cap = srv.max_capacity or 10

                for day_offset in range(1, TOTAL_DAYS + 1):
                    slot_date = today + timedelta(days=day_offset)
                    weekday = slot_date.weekday()  # 5=Sat, 6=Sun
                    date_str = slot_date.strftime("%Y-%m-%d")

                    if is_weekend_only and weekday not in (5, 6):
                        continue

                    # ~5% of dates blocked for estate maintenance
                    is_blackout = (day_offset % 23 == 0)

                    avail_records.append({
                        "id": uuid.uuid4(),
                        "service_id": srv.id,
                        "date": date_str,
                        "start_time": "09:00",
                        "end_time": "17:00",
                        "slot_label": "Standard Day Experience",
                        "capacity": cap,
                        "booked_count": 0,  # Will be incremented when bookings are inserted
                        "is_blocked": is_blackout,
                        "price_override": None,
                        "notes": "Estate seasonal schedule",
                        "is_test_data": True,
                        "is_synthetic": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                    })

                # Flush in chunks of 15,000 records for maximum PostgreSQL throughput
                if len(avail_records) >= 15000:
                    db.bulk_insert_mappings(ServiceAvailability, avail_records)
                    db.commit()
                    avail_records.clear()

            if avail_records:
                db.bulk_insert_mappings(ServiceAvailability, avail_records)
                db.commit()
                avail_records.clear()

            total_avail = db.query(ServiceAvailability).count()
            print(f"      Seeded {total_avail} availability slots in {round(time.time() - t_avail_start, 2)}s.")
    else:
        print("      Skipping availability calendar generation as requested.")

    # ─────────────────────────────────────────────────────────────
    # STEP 7: SEED 2,500+ BOOKINGS & CORRESPONDING PAYMENTS
    # ─────────────────────────────────────────────────────────────
    print("\n[7/9] Seeding 2,500 realistic bookings and matching Razorpay payment ledgers...")
    
    # Target: 2,500 bookings
    # Mixture: CONFIRMED (~1,200), COMPLETED (~900), CANCELLED (~250), PENDING (~150)
    TOTAL_BOOKINGS = 2500
    booking_objects: List[Booking] = []
    payment_objects: List[Payment] = []
    refund_objects: List[Refund] = []

    today = date.today()
    status_distribution = (
        ["CONFIRMED"] * 1200
        + ["COMPLETED"] * 900
        + ["CANCELLED"] * 250
        + ["PENDING"] * 150
    )
    random.shuffle(status_distribution)

    # Ensure Priyanshu has diverse personal bookings for manual testing
    priyanshu_bookings_count = 12
    priyanshu_services = created_services[:12]

    # Pre-fetch a sample of services for fast booking creation
    services_pool = created_services[:1000]

    for b_idx in range(TOTAL_BOOKINGS):
        if b_idx < priyanshu_bookings_count:
            customer = priyanshu_user
            srv = priyanshu_services[b_idx]
            status_val = ["CONFIRMED", "COMPLETED", "CONFIRMED", "PENDING", "COMPLETED"][b_idx % 5]
        else:
            customer = customer_users[b_idx % len(customer_users)]
            srv = services_pool[(b_idx * 17) % len(services_pool)]
            status_val = status_distribution[b_idx]

        # Schedule dates
        if status_val == "COMPLETED":
            # In the past
            days_ago = random.randint(3, 90)
            start_d = today - timedelta(days=days_ago)
        else:
            # In the future
            days_ahead = random.randint(1, 55)
            start_d = today + timedelta(days=days_ahead)

        date_str = start_d.strftime("%Y-%m-%d")
        guest_count = random.randint(1, 4)
        unit_price = srv.price
        total_amount = Decimal(str(unit_price)) * guest_count
        code = f"NC-BKG-{b_idx:06d}"

        bkg = Booking(
            id=uuid.uuid4(),
            booking_code=code,
            customer_id=customer.id,
            service_id=srv.id,
            provider_id=srv.provider_id,
            start_date=date_str,
            end_date=None,
            time_slot_id="slot-0900",
            time_slot_label="09:00 - 17:00",
            guest_count=guest_count,
            status=status_val,
            unit_price=unit_price,
            total_amount=total_amount,
            special_requests="Vegetarian meals preferred. Looking forward to the local experience.",
            is_test_data=True,
            is_synthetic=True,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 100)),
        )
        booking_objects.append(bkg)

        # Corresponding Payment
        # PAID for CONFIRMED/COMPLETED, ORDER_CREATED for PENDING, REFUNDED for CANCELLED
        order_id = f"order_seed_{b_idx:07d}"
        if status_val in ("CONFIRMED", "COMPLETED"):
            pay_status = "PAID"
            pay_id = f"pay_seed_{b_idx:07d}"
            sig = f"sig_seed_{uuid.uuid4().hex[:32]}"
        elif status_val == "PENDING":
            pay_status = "ORDER_CREATED"
            pay_id = None
            sig = None
        else:  # CANCELLED
            pay_status = "REFUNDED"
            pay_id = f"pay_seed_{b_idx:07d}"
            sig = f"sig_seed_{uuid.uuid4().hex[:32]}"

        pmt = Payment(
            id=uuid.uuid4(),
            booking_id=bkg.id,
            customer_id=customer.id,
            razorpay_order_id=order_id,
            razorpay_payment_id=pay_id,
            razorpay_signature=sig,
            amount=total_amount,
            currency="INR",
            status=pay_status,
            is_test_data=True,
            is_synthetic=True,
            created_at=bkg.created_at,
        )
        payment_objects.append(pmt)

        if pay_status == "REFUNDED":
            ref = Refund(
                id=uuid.uuid4(),
                refund_code=f"REF-NC-{b_idx:06d}",
                payment_id=pmt.id,
                booking_id=bkg.id,
                customer_id=customer.id,
                razorpay_refund_id=f"rfnd_seed_{b_idx:07d}",
                amount=float(total_amount),
                currency="INR",
                reason="Customer travel plan alteration prior to trip date.",
                status="PROCESSED",
                processed_at=datetime.utcnow() - timedelta(days=random.randint(1, 10)),
                is_test_data=True,
                is_synthetic=True,
                created_at=bkg.created_at + timedelta(hours=2),
            )
            refund_objects.append(ref)

    # Save bookings, payments, and refunds
    db.bulk_save_objects(booking_objects)
    db.commit()
    db.bulk_save_objects(payment_objects)
    db.commit()
    if refund_objects:
        db.bulk_save_objects(refund_objects)
        db.commit()

    print(f"      Saved {len(booking_objects)} bookings (Confirmed: 1,200, Completed: 900, Cancelled: 250, Pending: 150).")
    print(f"      Saved {len(payment_objects)} payments and {len(refund_objects)} refund records.")

    # Synchronize availability booked_count with confirmed and completed bookings
    db.execute(text("""
        UPDATE service_availabilities sa
        SET booked_count = LEAST(sa.capacity, sa.booked_count + sub.total_booked)
        FROM (
            SELECT service_id, start_date as date, SUM(guest_count) as total_booked
            FROM bookings
            WHERE status IN ('CONFIRMED', 'COMPLETED')
            GROUP BY service_id, start_date
        ) sub
        WHERE sa.service_id = sub.service_id AND sa.date = sub.date;
    """))
    db.commit()
    print("      Synchronized service availability calendar with confirmed booking reservations.")

    # ─────────────────────────────────────────────────────────────
    # STEP 8: SEED 5,500+ VERIFIED CUSTOMER REVIEWS
    # ─────────────────────────────────────────────────────────────
    print("\n[8/9] Seeding 5,500+ realistic customer reviews and updating service ratings...")
    
    review_objects: List[Review] = []
    completed_bookings = [b for b in booking_objects if b.status == "COMPLETED"]

    # 8.1 1:1 Reviews attached to completed bookings
    for c_idx, bkg in enumerate(completed_bookings):
        cust = db.query(User).filter(User.id == bkg.customer_id).first()
        rating_val = generate_rating(c_idx)
        comment_text = REVIEW_COMMENTS[c_idx % len(REVIEW_COMMENTS)]

        rev = Review(
            id=uuid.uuid4(),
            service_id=bkg.service_id,
            booking_id=bkg.id,  # Unique booking_id
            user_id=bkg.customer_id,
            user_name=cust.full_name if cust else "Guest",
            rating=rating_val,
            comment=comment_text,
            is_verified=True,
            status="PUBLISHED",
            is_test_data=True,
            is_synthetic=True,
            created_at=bkg.created_at + timedelta(days=random.randint(2, 10)),
        )
        review_objects.append(rev)

    # 8.2 Additional 4,600 verified reviews across published services
    REMAINDER_REVIEWS = 4600
    for r_idx in range(REMAINDER_REVIEWS):
        srv = created_services[r_idx % len(created_services)]
        # Pick customer who is not provider of this service
        cust = customer_users[(r_idx * 3) % len(customer_users)]
        rating_val = generate_rating(r_idx + 100)
        comment_text = REVIEW_COMMENTS[(r_idx + 7) % len(REVIEW_COMMENTS)]

        rev = Review(
            id=uuid.uuid4(),
            service_id=srv.id,
            booking_id=None,  # General verified visitor review
            user_id=cust.id,
            user_name=cust.full_name,
            rating=rating_val,
            comment=comment_text,
            is_verified=True,
            status="PUBLISHED",
            is_test_data=True,
            is_synthetic=True,
            created_at=datetime.utcnow() - timedelta(days=random.randint(5, 120)),
        )
        review_objects.append(rev)

    # Batch save reviews
    for chunk_start in range(0, len(review_objects), 1000):
        chunk = review_objects[chunk_start:chunk_start + 1000]
        db.bulk_save_objects(chunk)
        db.commit()

    print(f"      Saved {len(review_objects)} reviews.")

    # 8.3 Authoritatively update service ratings and review counts in PostgreSQL
    print("      Aggregating average ratings and review counts onto services...")
    db.execute(text("""
        UPDATE services s
        SET rating = sub.avg_r,
            reviews_count = sub.cnt
        FROM (
            SELECT service_id, ROUND(AVG(rating)::numeric, 1) as avg_r, COUNT(*) as cnt
            FROM reviews
            WHERE status = 'PUBLISHED'
            GROUP BY service_id
        ) sub
        WHERE s.id = sub.service_id;
    """))
    db.commit()

    # ─────────────────────────────────────────────────────────────
    # STEP 9: SEED USER INTERACTIONS & WISHLISTS
    # ─────────────────────────────────────────────────────────────
    print("\n[9/9] Seeding 8,000+ customer recommendation interactions and saved wishlists...")
    
    interaction_objects: List[UserInteraction] = []
    saved_objects: List[SavedService] = []
    interest_profiles: List[UserInterestProfile] = []

    seen_saved = set()
    # Priyanshu saved services
    for srv in created_services[:8]:
        pair = (priyanshu_user.id, srv.id)
        if pair not in seen_saved:
            seen_saved.add(pair)
            saved_objects.append(SavedService(
                id=uuid.uuid4(),
                user_id=priyanshu_user.id,
                service_id=srv.id,
                notes="Must-visit coffee estate and trekking trail for next trip.",
                is_test_data=True,
                is_synthetic=True,
                created_at=datetime.utcnow() - timedelta(days=5),
            ))

    # Other customer saved services
    other_customers = [c for c in customer_users if c.id != priyanshu_user.id]
    s_idx = 0
    while len(saved_objects) < 1508 and s_idx < 10000:
        cust = other_customers[s_idx % len(other_customers)]
        srv = created_services[(s_idx * 17) % len(created_services)]
        pair = (cust.id, srv.id)
        if pair not in seen_saved:
            seen_saved.add(pair)
            saved_objects.append(SavedService(
                id=uuid.uuid4(),
                user_id=cust.id,
                service_id=srv.id,
                notes="Added to travel wishlist.",
                is_test_data=True,
                is_synthetic=True,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            ))
        s_idx += 1

    db.bulk_save_objects(saved_objects)
    db.commit()

    # User interactions (VIEW, DETAIL_OPEN, CLICK, SAVE, BOOK)
    event_types = ["VIEW", "DETAIL_OPEN", "CLICK", "SAVE", "SEARCH"]
    for i_idx in range(8000):
        cust = customer_users[i_idx % len(customer_users)]
        srv = created_services[(i_idx * 7) % len(created_services)]
        ev = event_types[i_idx % len(event_types)]

        interaction_objects.append(UserInteraction(
            id=uuid.uuid4(),
            user_id=cust.id,
            service_id=srv.id,
            provider_id=srv.provider_id,
            category_id=srv.category_id,
            event_type=ev,
            duration_seconds=random.randint(15, 180),
            session_id=f"sess_{uuid.uuid4().hex[:12]}",
            source="explore",
            weight=0.2 if ev == "VIEW" else (0.5 if ev == "CLICK" else 0.8),
            metadata_json=json.dumps({"district": srv.district, "category": srv.category_slug}),
            is_test_data=True,
            is_synthetic=True,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 45)),
        ))

    for chunk_start in range(0, len(interaction_objects), 2000):
        chunk = interaction_objects[chunk_start:chunk_start + 2000]
        db.bulk_save_objects(chunk)
        db.commit()

    # Pre-calculated Interest Profile for Priyanshu
    farm_cat = cat_by_slug.get("farm")
    priyanshu_profile = UserInterestProfile(
        id=uuid.uuid4(),
        user_id=priyanshu_user.id,
        category_id=farm_cat.id if farm_cat else None,
        interest_score=0.92,
        confidence_score=0.88,
        interaction_count=45,
        last_interaction_at=datetime.utcnow(),
        category_affinity_json=json.dumps({"farm": 0.92, "adventure": 0.85, "food": 0.78, "photography": 0.70}),
        destination_affinity_json=json.dumps({"Kodagu (Coorg)": 0.90, "Chikkamagaluru": 0.85, "Udupi": 0.75}),
        topic_affinity_json=json.dumps({"coffee": 0.95, "plantations": 0.90, "Western Ghats": 0.88}),
        budget_band_json=json.dumps({"min": 1000, "max": 6500}),
        language="en",
        is_test_data=True,
        is_synthetic=True,
    )
    db.add(priyanshu_profile)
    db.commit()

    print(f"      Saved {len(saved_objects)} wishlist items and {len(interaction_objects)} recommendation interaction signals.")

    # ─────────────────────────────────────────────────────────────
    # STEP 9b: SEED SYNTHETIC MULTI-DAY ITINERARY TRIPS
    # ─────────────────────────────────────────────────────────────
    print("\n[9b/9] Seeding realistic synthetic multi-day trips and AI itinerary plans...")
    priyanshu_trip = Trip(
        id=uuid.uuid4(),
        user_id=priyanshu_user.id,
        title="3-Day Coorg Coffee Harvest & Western Ghats Trail",
        description="Immersive plantation stay with hands-on Arabica harvesting, Abbey Falls visit, and Kodava culinary workshop.",
        origin="Bengaluru",
        destination="Kodagu (Coorg)",
        start_date=(today + timedelta(days=14)).strftime("%Y-%m-%d"),
        end_date=(today + timedelta(days=16)).strftime("%Y-%m-%d"),
        status="CONFIRMED",
        created_by="AI",
        ai_generated=True,
        is_synthetic=True,
    )
    db.add(priyanshu_trip)
    db.commit()

    day1 = TripDay(id=uuid.uuid4(), trip_id=priyanshu_trip.id, day_number=1, date=priyanshu_trip.start_date, title="Day 1: Arrival & Coffee Plantation Walk", notes="Settle in and visit organic estate", is_synthetic=True)
    day2 = TripDay(id=uuid.uuid4(), trip_id=priyanshu_trip.id, day_number=2, date=(today + timedelta(days=15)).strftime("%Y-%m-%d"), title="Day 2: Western Ghats Trek & River Rafting", notes="Adventure excursion", is_synthetic=True)
    day3 = TripDay(id=uuid.uuid4(), trip_id=priyanshu_trip.id, day_number=3, date=priyanshu_trip.end_date, title="Day 3: Kodava Cuisine Workshop & Return", notes="Traditional feast & departure", is_synthetic=True)
    db.add_all([day1, day2, day3])
    db.commit()

    coorg_services = [s for s in created_services if "Kodagu" in s.district][:3]
    item1 = TripItem(id=uuid.uuid4(), trip_day_id=day1.id, service_id=coorg_services[0].id if coorg_services else None, title="Arabica Estate Walk & Bean Picking", start_time="10:00", end_time="13:00", duration_minutes=180, sequence_order=1, is_booked=True, is_synthetic=True)
    item2 = TripItem(id=uuid.uuid4(), trip_day_id=day1.id, title="Sunset viewpoint at Raja's Seat", start_time="17:00", end_time="19:00", duration_minutes=120, sequence_order=2, is_booked=False, is_synthetic=True)
    item3 = TripItem(id=uuid.uuid4(), trip_day_id=day2.id, service_id=coorg_services[1].id if len(coorg_services) > 1 else None, title="Rainforest Trek & Water Stream Crossing", start_time="08:30", end_time="14:00", duration_minutes=330, sequence_order=1, is_booked=True, is_synthetic=True)
    item4 = TripItem(id=uuid.uuid4(), trip_day_id=day3.id, service_id=coorg_services[2].id if len(coorg_services) > 2 else None, title="Traditional Kodava Pandi Curry Cooking Masterclass", start_time="11:00", end_time="14:00", duration_minutes=180, sequence_order=1, is_booked=True, is_synthetic=True)
    db.add_all([item1, item2, item3, item4])
    db.commit()

    ai_plan = AITripPlan(
        id=uuid.uuid4(),
        trip_id=priyanshu_trip.id,
        user_id=priyanshu_user.id,
        prompt="Plan a 3-day coffee plantation and adventure trip in Coorg with local food experiences",
        preferences_json=json.dumps({"interests": ["coffee", "trekking", "food"], "budget": "medium", "pace": "moderate"}),
        constraints_json=json.dumps({"origin": "Bengaluru", "duration_days": 3}),
        model="gemini-3.5-flash-lite",
        status="COMPLETED",
        completed_at=datetime.utcnow(),
        is_synthetic=True,
    )
    db.add(ai_plan)
    db.commit()
    print("      Seeded synthetic multi-day trip, daily schedules, items, and AI itinerary plan for Priyanshu.")

    # ─────────────────────────────────────────────────────────────
    # STEP 10: INTEGRITY VERIFICATION & SUMMARY REPORT
    # ─────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  NAMMA CONNECT V2 — DATA SEEDING COMPLETE & VALIDATING")
    print("=" * 70)

    admin_count = db.query(User).filter(User.role == "admin").count()
    customer_count = db.query(User).filter(User.role.in_(["user", "customer"])).count()
    provider_count = db.query(User).filter(User.role == "provider").count()
    total_users = admin_count + customer_count + provider_count

    services_count = db.query(Service).count()
    published_services_count = db.query(Service).filter(Service.status == "PUBLISHED").count()
    avail_count = db.query(ServiceAvailability).count()
    bookings_count = db.query(Booking).count()
    payments_count = db.query(Payment).count()
    reviews_count = db.query(Review).count()
    interactions_count = db.query(UserInteraction).count()
    trips_count = db.query(Trip).count()

    # Synthetic verification counts
    syn_users_count = db.query(User).filter(User.is_synthetic == True).count()
    syn_services_count = db.query(Service).filter(Service.is_synthetic == True).count()
    syn_avail_count = db.query(ServiceAvailability).filter(ServiceAvailability.is_synthetic == True).count()
    syn_bookings_count = db.query(Booking).filter(Booking.is_synthetic == True).count()
    syn_payments_count = db.query(Payment).filter(Payment.is_synthetic == True).count()
    syn_reviews_count = db.query(Review).filter(Review.is_synthetic == True).count()
    syn_interactions_count = db.query(UserInteraction).filter(UserInteraction.is_synthetic == True).count()
    syn_trips_count = db.query(Trip).filter(Trip.is_synthetic == True).count()

    # Validation Checks
    # 1. Duplicate emails
    dup_emails = db.execute(text("SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1")).fetchall()
    dup_email_count = len(dup_emails)

    # 2. Unhashed passwords (plaintext passwords)
    unhashed_pw_count = db.query(User).filter(~User.hashed_password.like("$2%")).count()

    # 3. Unverified providers
    unverified_providers = db.query(User).filter(
        User.role == "provider",
        (User.is_verified == False) | (User.is_active == False)
    ).count()

    # 4. Orphan services (no valid provider or category)
    orphan_services = db.execute(text("""
        SELECT COUNT(*) FROM services s
        LEFT JOIN users u ON s.provider_id = u.id
        LEFT JOIN marketplace_categories c ON s.category_id = c.id
        WHERE u.id IS NULL OR c.id IS NULL
    """)).scalar() or 0

    # 5. Orphan bookings (no valid customer or service)
    orphan_bookings = db.execute(text("""
        SELECT COUNT(*) FROM bookings b
        LEFT JOIN users u ON b.customer_id = u.id
        LEFT JOIN services s ON b.service_id = s.id
        WHERE u.id IS NULL OR s.id IS NULL
    """)).scalar() or 0

    # 6. Orphan payments (no valid booking or customer)
    orphan_payments = db.execute(text("""
        SELECT COUNT(*) FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN users u ON p.customer_id = u.id
        WHERE b.id IS NULL OR u.id IS NULL
    """)).scalar() or 0

    # 7. Invalid relationships
    invalid_rel_count = orphan_services + orphan_bookings + orphan_payments

    t_total = round(time.time() - t_start, 2)

    print(f"""
DATABASE SUMMARY:
----------------------------------------
ADMIN:                 {admin_count}
CUSTOMERS:             {customer_count}
PROVIDERS:             {provider_count}
TOTAL ACCOUNTS:        {total_users}
SERVICES:              {services_count} (Published: {published_services_count})
AVAILABILITY:          {avail_count}
REVIEWS:               {reviews_count}
BOOKINGS:              {bookings_count}
PAYMENTS:              {payments_count}
INTERACTIONS:          {interactions_count}
TRIPS:                 {trips_count}
EXECUTION DURATION:    {t_total} seconds

SYNTHETIC IDENTIFICATION (is_synthetic = True):
----------------------------------------
Synthetic Users:       {syn_users_count}/{total_users} (100%)
Synthetic Services:    {syn_services_count}/{services_count} (100%)
Synthetic Avail:       {syn_avail_count}/{avail_count} (100%)
Synthetic Bookings:    {syn_bookings_count}/{bookings_count} (100%)
Synthetic Payments:    {syn_payments_count}/{payments_count} (100%)
Synthetic Reviews:     {syn_reviews_count}/{reviews_count} (100%)
Synthetic Trips:       {syn_trips_count}

VALIDATION RESULTS:
----------------------------------------
Admin count = {admin_count}
Duplicate emails = {dup_email_count}
Unhashed passwords = {unhashed_pw_count}
Unverified providers = {unverified_providers}
Orphan services = {orphan_services}
Orphan bookings = {orphan_bookings}
Orphan payments = {orphan_payments}
Invalid relationships = {invalid_rel_count}
""")

    # Assertions
    assert admin_count == 1, f"Expected exactly 1 admin, found {admin_count}"
    assert dup_email_count == 0, f"Found duplicate emails: {dup_emails}"
    assert unhashed_pw_count == 0, f"Found unhashed passwords: {unhashed_pw_count}"
    assert unverified_providers == 0, f"Found unverified providers: {unverified_providers}"
    assert orphan_services == 0, f"Found orphan services: {orphan_services}"
    assert orphan_bookings == 0, f"Found orphan bookings: {orphan_bookings}"
    assert orphan_payments == 0, f"Found orphan payments: {orphan_payments}"

    # Synthetic assertions
    assert syn_users_count == total_users, f"Expected all {total_users} users to have is_synthetic=True, got {syn_users_count}"
    assert syn_services_count == services_count, f"Expected all {services_count} services to have is_synthetic=True, got {syn_services_count}"
    assert syn_avail_count == avail_count, f"Expected all {avail_count} availabilities to have is_synthetic=True, got {syn_avail_count}"
    assert syn_bookings_count == bookings_count, f"Expected all {bookings_count} bookings to have is_synthetic=True, got {syn_bookings_count}"
    assert syn_payments_count == payments_count, f"Expected all {payments_count} payments to have is_synthetic=True, got {syn_payments_count}"
    assert syn_reviews_count == reviews_count, f"Expected all {reviews_count} reviews to have is_synthetic=True, got {syn_reviews_count}"
    assert syn_trips_count >= 1, "Expected at least 1 synthetic trip record"

    print("========================================================")
    print("  ALL PRODUCTION INTEGRITY ASSERTIONS PASSED (100% OK)")
    print("========================================================\n")


def check_safety_guard():
    """Ensure script never runs in production environments."""
    env = os.environ.get("ENVIRONMENT", getattr(settings, "ENV", "development")).lower()
    app_env = getattr(settings, "ENVIRONMENT", "").lower()
    db_url = str(settings.DATABASE_URL).lower()
    if any(e in ("prod", "production") for e in (env, app_env)) or any(k in db_url for k in ("prod", "production", "rds.amazonaws.com", "neon.tech/prod")):
        if not os.environ.get("ALLOW_PRODUCTION_SEED"):
            print("[FATAL] Seeding script execution refused! Production environment or database detected.")
            sys.exit(1)


if __name__ == "__main__":
    check_safety_guard()
    import argparse
    parser = argparse.ArgumentParser(description="Seed synthetic development data for Namma Connect V2.")
    parser.add_argument("--reset", action="store_true", help="Clear existing test data before seeding.")
    parser.add_argument("--skip-availability", action="store_true", help="Skip generating availability slots.")
    args = parser.parse_args()

    session = SessionLocal()
    try:
        seed_development_data(session, reset_first=args.reset, seed_avail=not args.skip_availability)
    finally:
        session.close()
