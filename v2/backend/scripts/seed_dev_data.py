"""Safe Development Seed Script for NammaConnect V2.

Generates 500+ synthetic users, 1000+ realistic Karnataka agritourism services,
partner applications, reviews, and bookings with realistic approval states.
"""

import sys
import os
import uuid
import random
import json
from datetime import datetime, date, timedelta

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.service import Service, Review
from app.models.partner_application import PartnerApplication
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.support import SupportTicket
from app.models.setting import PlatformSetting
from app.models.creator import CreatorProfile
from app.models.notification import Notification
from app.services.embedding import EmbeddingService


# ─────────────────────────────────────────────────────────────
# 1. SAFETY ENVIRONMENT GUARD
# ─────────────────────────────────────────────────────────────
def check_safety_guard():
    """Ensure script never runs in production environments."""
    env = os.environ.get("ENVIRONMENT", getattr(settings, "ENV", "development")).lower()
    if "prod" in env:
        print("[FATAL] Seed script execution refused! ENVIRONMENT is set to 'production'.")
        print("This script is strictly for development and testing environments.")
        sys.exit(1)


# ─────────────────────────────────────────────────────────────
# 2. REALISTIC KARNATAKA DATA GENERATION DICTIONARIES
# ─────────────────────────────────────────────────────────────
KARNATAKA_DISTRICTS = [
    {"district": "Kodagu (Coorg)", "locations": ["Madikeri", "Virajpet", "Somwarpet", "Kushalnagar", "Gonikoppal", "Kakkabe", "Suntikoppa"]},
    {"district": "Chikkamagaluru", "locations": ["Chikkamagaluru Town", "Mudigere", "Koppa", "Sringeri", "Kadur", "Kalasa", "Kudremukh"]},
    {"district": "Bengaluru Rural", "locations": ["Devanahalli", "Nelamangala", "Doddaballapura", "Hoskote", "Hesaraghatta", "Rajanukunte"]},
    {"district": "Mysuru", "locations": ["Nanjangud", "Hunsur", "T. Narasipura", "Periyapatna", "K.R. Nagar", "Chamundi Foothills", "Bannur"]},
    {"district": "Ballari & Vijayanagara", "locations": ["Hampi", "Hosapete", "Kamalapura", "Kudligi", "Sandur", "Anegundi"]},
    {"district": "Udupi & Coastal", "locations": ["Malpe", "Kundapura", "Karkala", "Kaup", "Manipal", "Padubidri", "Barkur"]},
    {"district": "Hassan", "locations": ["Sakleshpur", "Belur", "Halebidu", "Arsikere", "Alur", "Channarayapatna", "Yeslur"]},
    {"district": "Shimoga (Shivamogga)", "locations": ["Thirthahalli", "Sagar", "Jog Falls Area", "Agumbe", "Hosanagara", "Bhadravathi"]},
    {"district": "Uttara Kannada", "locations": ["Gokarna", "Dandeli", "Sirsi", "Kumta", "Honnavar", "Yana", "Murudeshwar"]},
    {"district": "Mandya", "locations": ["Srirangapatna", "Maddur", "Pandavapura", "Nagamangala", "Krishnarajpet", "Malavalli"]},
    {"district": "Belagavi", "locations": ["Khanapur", "Bailhongal", "Gokak", "Chikodi", "Hukkeri", "Jamboti Hills"]},
]

FIRST_NAMES = [
    "Basavaraj", "Ramesh", "Manjunath", "Shivakumar", "Girish", "Pradeep", "Venkatesh", "Anand",
    "Suresh", "Praveen", "Deepak", "Raghavendra", "Kiran", "Shankar", "Santosh", "Vijay", "Naveen",
    "Chandrashekar", "Mallikarjun", "Nagaraj", "Lakshmi", "Shweta", "Anitha", "Kavitha", "Poornima",
    "Geetha", "Suma", "Divya", "Pooja", "Rekha", "Radhika", "Soumya", "Vidya", "Nalini", "Vani",
    "Asha", "Roopa", "Bhavya", "Savitha", "Meenakshi", "Priyanka", "Sunitha", "Rashmi", "Lavanya"
]

LAST_NAMES = [
    "Gowda", "Patil", "Shetty", "Hegde", "Bhat", "Rao", "Reddy", "Kulkarni", "Deshmukh", "Naik",
    "Acharya", "Kurup", "Pujari", "Hiremath", "Angadi", "Joshi", "Kamath", "Pai", "Nayaka", "Shastry"
]

SERVICE_TEMPLATES = [
    {
        "title": "Organic {crop} Plantation Walk & Tasting",
        "category": "Farm Experiences",
        "category_slug": "experiences",
        "unit": "person",
        "desc": "Join our 3rd-generation farm family for an immersive walk through lush organic {crop} fields in {location}. Learn sustainable zero-budget natural farming techniques, handpick fresh produce, and enjoy authentic freshly brewed herbal infusions.",
        "inclusions": ["Guided plantation walk", "Fresh farm herbal tea", "Traditional light snack", "Take-home organic sample pack"],
        "amenities": ["Organic Farm Shop", "Clean Restrooms", "Parking", "Drinking Water", "Resting Gazebo"],
        "price_range": (500, 1200),
    },
    {
        "title": "Traditional Heritage Homestay Amidst {landscape}",
        "category": "Stays",
        "category_slug": "stay",
        "unit": "night",
        "desc": "Stay in an authentic 80-year-old terracotta roof tile heritage home surrounded by serene {landscape} in {location}, {district}. Features private veranda overlooking nature, farm-to-table home-cooked Malnad/Karavali meals, and starlit campfire evenings.",
        "inclusions": ["Traditional Breakfast & Dinner", "Campfire access", "Plantation trail access", "Morning yoga deck"],
        "amenities": ["Hot Water 24/7", "Free Wi-Fi", "Home Kitchen", "Power Backup", "Private Parking", "Pet Friendly"],
        "price_range": (2500, 6800),
    },
    {
        "title": "Authentic Village {cuisine} Cooking Masterclass",
        "category": "Food & Culinary",
        "category_slug": "food",
        "unit": "person",
        "desc": "Discover secret culinary traditions with local village home-chefs in {location}. Cook authentic {cuisine} using firewood stoves, earthenware pots, and freshly harvested aromatic spices directly from our backyard.",
        "inclusions": ["All cooking ingredients", "Recipe handbook", "Full 4-course traditional meal", "Spices starter kit"],
        "amenities": ["Earthenware Cooking Utensils", "Dining Hall", "Handwash Area", "Filtered Water"],
        "price_range": (650, 1600),
    },
    {
        "title": "Seasonal {season_event} Festival & Harvest Celebration",
        "category": "Events & Harvest",
        "category_slug": "events",
        "unit": "person",
        "desc": "Celebrate rural Karnataka's vibrant culture during the seasonal {season_event} in {district}. Participate in traditional harvest ceremonies, folk music performances, cattle adoration, and communal village feasts.",
        "inclusions": ["Festival entry", "Traditional lunch on banana leaf", "Folk performance access", "Handmade souvenir"],
        "amenities": ["Covered Seating", "First Aid Kit", "Restrooms", "Photography Allowed"],
        "price_range": (850, 2200),
    },
    {
        "title": "Heritage & Hidden Trail Guided Trek in {location}",
        "category": "Guides & Tours",
        "category_slug": "guides-tours",
        "unit": "tour",
        "desc": "Led by certified local naturalist guides born and raised in {district}. Discover offbeat waterfalls, sacred groves, ancient boulder formations, and endemic bird species around {location}.",
        "inclusions": ["Certified local guide", "Safety briefing & sticks", "Energy trail snacks", "Forest entry facilitation"],
        "amenities": ["First Aid Trained Guide", "Binocular Sharing", "Emergency Communication"],
        "price_range": (1200, 3200),
    },
    {
        "title": "Eco Farm Cab & Agro-Corridor Travel Service",
        "category": "Travel & Transit",
        "category_slug": "travel-services",
        "unit": "day",
        "desc": "Dedicated rural transport and chauffeur service connecting Bengaluru / Mysuru with remote farm stays and eco-reserves across {district}. Clean, air-conditioned vehicle driven by courteous local driver.",
        "inclusions": ["Full day vehicle & fuel", "Toll & parking coverage", "Chauffeur allowance", "Local route tips"],
        "amenities": ["AC Vehicle", "Bottled Water", "Mobile Charger", "Luggage Carrier"],
        "price_range": (2800, 5500),
    },
    {
        "title": "Handcrafted {craft} Workshop & Artisan Studio Tour",
        "category": "Farm Experiences",
        "category_slug": "experiences",
        "unit": "session",
        "desc": "Spend an enriching morning with master artisans in {location}. Try your hands on the potter's wheel, loom weaving, or traditional woodwork while supporting heritage artisan livelihoods.",
        "inclusions": ["Raw materials & tools", "1-on-1 artisan coaching", "Self-made craft to take home", "Welcome drink"],
        "amenities": ["Artisan Studio", "Material Kits", "Restrooms", "Gift Shop"],
        "price_range": (700, 1800),
    },
]

CROPS = ["Arabica Coffee", "Robusta & Pepper", "Arecanut & Betel", "Cardamom & Vanilla", "Organic Jaggery", "Heirloom Paddy", "Dragonfruit", "Silk Mulberry", "Tender Coconut", "Millets & Pulses"]
LANDSCAPES = ["coffee hills", "misty valleys", "riverside coconut groves", "boulder hills", "sacred forests", "green paddy fields", "Western Ghats foothills"]
CUISINES = ["Kodava Pandi & Akki Roti", "Malnad Kadubu & Bamboo Shoot", "North Karnataka Jolada Rotti", "Udupi Coastal Gassi & Neer Dosa", "Mysuru Thali & Mylari Dosa", "Mandya Country Style Nati Feast"]
SEASON_EVENTS = ["Coffee Blossom Festival", "Paddy Sowing Habba", "Kambala Buffalo Race Experience", "Spices Harvest Fair", "Jaggery Crushing Utsava", "Village Jatre & Cultural Mela"]
CRAFTS = ["Terracotta Pottery", "Channapatna Wooden Toys", "Khadi Handloom Weaving", "Bamboo Basketry", "Mysore Sandal Carving", "Brass Metal Inlay"]

IMAGE_POOL = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80",
]


# ─────────────────────────────────────────────────────────────
# 3. SEEDING LOGIC
# ─────────────────────────────────────────────────────────────
def seed_development_data(db: Session):
    """Seed comprehensive realistic development dataset."""
    check_safety_guard()

    print("\n========================================================")
    print("  NAMMA CONNECT V2 — SAFE DEVELOPMENT DATASET SEEDER")
    print("========================================================")

    # Check existing test data count
    existing_test_users = db.query(User).filter(User.is_test_data == True).count()
    existing_test_services = db.query(Service).filter(Service.is_test_data == True).count()

    if existing_test_users >= 500 and existing_test_services >= 1000:
        print(f"[INFO] Dataset already seeded with {existing_test_users} test users and {existing_test_services} test services.")
        print("[INFO] No duplicates created. Seeder is idempotent.")
        return

    hashed_pw = get_password_hash("DevPassword123!")

    # ── 1. Seed Users (500+ Synthetic Accounts) ──
    print("\n[1/6] Seeding 550 synthetic users (Customers, Partners, Creators, Admins)...")
    
    # Roles distribution: 310 customers, 180 partners, 60 creators (only 1 admin exists: admin@namnaconnect.com)
    roles_plan = (
        [("customer", "Customer")] * 310
        + [("partner", "Farmer")] * 80
        + [("partner", "Homestay Host")] * 40
        + [("partner", "Local Guide")] * 30
        + [("partner", "Food Artisan")] * 20
        + [("partner", "Travel Operator")] * 10
        + [("creator", "Content Creator")] * 60
    )

    created_users = []
    for idx, (role, sub_role) in enumerate(roles_plan, start=1):
        first = FIRST_NAMES[(idx * 7) % len(FIRST_NAMES)]
        last = LAST_NAMES[(idx * 13) % len(LAST_NAMES)]
        full_name = f"{first} {last}"
        email = f"dev.{role}.{idx:04d}@nammaconnect.test"
        
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            created_users.append((existing, sub_role))
            continue

        district_info = KARNATAKA_DISTRICTS[idx % len(KARNATAKA_DISTRICTS)]
        location = f"{district_info['locations'][idx % len(district_info['locations']) ]}, {district_info['district']}"
        
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=hashed_pw,
            full_name=full_name,
            mobile=f"+9198{idx:08d}"[-13:],
            role=role,
            is_active=True,
            is_verified=(role in ["partner", "creator", "admin"] and idx % 5 != 0),
            phone_verified=True,
            auth_provider="local",
            location=location,
            language="English, Kannada" if idx % 2 == 0 else "English",
            theme_preference="system",
            is_test_data=True,
        )
        db.add(user)
        created_users.append((user, sub_role))

    db.commit()
    print(f"      Successfully saved {len(created_users)} synthetic users.")

    # ── 2. Seed Creator Profiles ──
    print("\n[2/6] Seeding Creator profiles for creator users...")
    creator_users = [u for u, r in created_users if u.role == "creator"]
    for c_user in creator_users:
        existing_cp = db.query(CreatorProfile).filter(CreatorProfile.user_id == c_user.id).first()
        if not existing_cp:
            cp = CreatorProfile(
                id=uuid.uuid4(),
                user_id=c_user.id,
                display_name=c_user.full_name,
                handle=f"@{c_user.full_name.lower().replace(' ', '_')}_{str(c_user.id)[:4]}",
                bio="Documenting Karnataka's rich rural heritage, farm-to-table cuisine, and offbeat nature trails.",
                location=c_user.location,
                reach=f"{random.randint(15, 120)}K+ Reach",
                starting_rate=float(random.choice([8000, 12000, 15000, 20000])),
                rating=round(random.uniform(4.7, 5.0), 1),
                reviews_count=random.randint(5, 35),
                is_verified=c_user.is_verified,
                specialties_json=json.dumps(["Drone Cinematography", "Rural Storytelling", "Culinary Reviews"]),
                is_test_data=True,
            )
            db.add(cp)
    db.commit()

    # ── 3. Seed Partner Applications (150+ realistic applications with approval states) ──
    print("\n[3/6] Seeding 160 realistic Partner Applications with approval distribution...")
    partner_states = (
        ["APPROVED"] * 100
        + ["PENDING"] * 45
        + ["REJECTED"] * 15
    )

    seeded_apps = 0
    for idx, (p_user, p_type) in enumerate(created_users[: len(partner_states)]):
        status_val = partner_states[idx % len(partner_states)]
        app_code = f"PA-DEV-{idx:04d}"
        existing_app = db.query(PartnerApplication).filter(PartnerApplication.application_code == app_code).first()
        if existing_app:
            continue

        district_info = KARNATAKA_DISTRICTS[idx % len(KARNATAKA_DISTRICTS)]
        app = PartnerApplication(
            id=uuid.uuid4(),
            application_code=app_code,
            user_id=p_user.id,
            role_type=p_type.lower().replace(" ", "_"),
            full_name=p_user.full_name,
            email=p_user.email,
            mobile=p_user.mobile or f"+9198{idx:08d}"[-13:],
            address=f"Village Farm Plot #{idx*3}, Post Office Road, {district_info['locations'][0]}",
            district=district_info["district"],
            state="Karnataka",
            business_name=f"{p_user.full_name.split()[0]}'s {p_type} Heritage",
            experience_years=random.randint(3, 25),
            bio="Dedicated to sustainable agro-tourism and warm Karnataka hospitality.",
            languages="Kannada, English",
            id_type="Land_RTC" if "Farm" in p_type else "Aadhaar",
            id_number=f"KYC-{random.randint(100000, 999999)}",
            document_url="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500",
            services_json=json.dumps(["Farm Tour", "Homestay", "Food Experience"]),
            activities_json=json.dumps(["Plantation Walk", "Bird Watching", "Traditional Cooking"]),
            status=status_val,
            rejection_reason="Incomplete land registry document scan." if status_val == "REJECTED" else None,
            reviewed_at=datetime.utcnow() if status_val != "PENDING" else None,
            is_test_data=True,
        )
        db.add(app)
        seeded_apps += 1

    db.commit()
    print(f"      Seeded {seeded_apps} partner applications (APPROVED: 100, PENDING: 45, REJECTED: 15).")

    # ── 4. Seed Services (1050+ Realistic Karnataka Agritourism Listings) ──
    print("\n[4/6] Seeding 1,050 realistic Karnataka Agritourism Service Listings...")
    approved_providers = [(u, r) for u, r in created_users if u.role == "partner"]
    if not approved_providers:
        approved_providers = created_users[:50]

    service_states = (
        ["PUBLISHED"] * 850
        + ["PENDING"] * 120
        + ["REJECTED"] * 50
        + ["DRAFT"] * 30
    )

    created_services = []
    for s_idx in range(1, 1051):
        slug = f"dev-service-{s_idx:04d}"
        existing_srv = db.query(Service).filter(Service.slug == slug).first()
        if existing_srv:
            created_services.append(existing_srv)
            continue

        tpl = SERVICE_TEMPLATES[s_idx % len(SERVICE_TEMPLATES)]
        d_info = KARNATAKA_DISTRICTS[s_idx % len(KARNATAKA_DISTRICTS)]
        location_val = d_info["locations"][s_idx % len(d_info["locations"])]
        district_val = d_info["district"]

        crop = CROPS[s_idx % len(CROPS)]
        landscape = LANDSCAPES[s_idx % len(LANDSCAPES)]
        cuisine = CUISINES[s_idx % len(CUISINES)]
        season_event = SEASON_EVENTS[s_idx % len(SEASON_EVENTS)]
        craft = CRAFTS[s_idx % len(CRAFTS)]

        title = tpl["title"].format(crop=crop, landscape=landscape, cuisine=cuisine, season_event=season_event, craft=craft, location=location_val)
        desc = tpl["desc"].format(crop=crop, landscape=landscape, cuisine=cuisine, season_event=season_event, craft=craft, location=location_val, district=district_val)

        provider_user, p_type = approved_providers[s_idx % len(approved_providers)]
        status_val = service_states[s_idx % len(service_states)]

        min_p, max_p = tpl["price_range"]
        price_val = float(random.randint(min_p // 50, max_p // 50) * 50)

        img = IMAGE_POOL[s_idx % len(IMAGE_POOL)]
        gallery = [img, IMAGE_POOL[(s_idx + 1) % len(IMAGE_POOL)], IMAGE_POOL[(s_idx + 2) % len(IMAGE_POOL)]]

        # Generate 768-dim normalized embedding for published services
        embedding_vec = EmbeddingService._generate_deterministic_vector(f"{title} | {desc} | {location_val} | {district_val}") if status_val == "PUBLISHED" else None

        srv = Service(
            id=uuid.uuid4(),
            title=title,
            slug=slug,
            description=desc,
            category=tpl["category"],
            category_slug=tpl["category_slug"],
            location=f"{location_val}, {district_val}",
            district=district_val,
            state="Karnataka",
            price=price_val,
            unit=tpl["unit"],
            duration_hours=float(random.choice([2.5, 4.0, 6.0, 8.0, 24.0])),
            max_capacity=random.choice([6, 8, 12, 15, 20]),
            rating=round(random.uniform(4.4, 5.0), 1) if status_val == "PUBLISHED" else 5.0,
            reviews_count=random.randint(3, 48) if status_val == "PUBLISHED" else 0,
            is_verified=True,
            status=status_val,
            provider_id=provider_user.id,
            provider_name=provider_user.full_name,
            provider_type=p_type,
            provider_avatar=f"https://api.dicebear.com/7.x/avataaars/svg?seed={provider_user.full_name}",
            rejection_reason="Price breakdown clarity needed for high capacity tours." if status_val == "REJECTED" else None,
            reviewed_at=datetime.utcnow() if status_val in ["PUBLISHED", "REJECTED"] else None,
            primary_image=img,
            images_json=json.dumps(gallery),
            inclusions_json=json.dumps(tpl["inclusions"]),
            amenities_json=json.dumps(tpl["amenities"]),
            embedding=embedding_vec,
            is_test_data=True,
        )
        db.add(srv)
        created_services.append(srv)

    db.commit()
    print(f"      Successfully saved {len(created_services)} synthetic service listings.")

    # ── 5. Seed Reviews & Bookings ──
    print("\n[5/6] Seeding 800 synthetic reviews and 400 customer bookings...")
    customer_users = [u for u, r in created_users if u.role == "customer"]
    published_services = [s for s in created_services if s.status == "PUBLISHED"]

    REVIEW_COMMENTS = [
        "Unforgettable farm stay experience! The hosts were exceptionally warm and the home-cooked food was heavenly.",
        "Loved the morning plantation walk. Learning how cardamom and coffee are harvested was truly educational.",
        "Peaceful atmosphere, spotless rooms, and spectacular views of the Western Ghats. Will visit again with family!",
        "Authentic village dining cooked over firewood. The flavors were extraordinary and genuinely traditional.",
        "Great naturalist guide who pointed out rare birds and taught us so much about indigenous flora.",
        "A refreshing escape from Bengaluru traffic. Clean air, starry skies, and delicious filter coffee.",
    ]

    seeded_reviews = 0
    seeded_bookings = 0

    for idx, srv in enumerate(published_services[:400]):
        cust = customer_users[idx % len(customer_users)]
        start_d = (date.today() + timedelta(days=random.randint(1, 45))).strftime("%Y-%m-%d")
        bkg_code = f"BK-DEV-{idx:05d}"
        
        existing_bkg = db.query(Booking).filter(Booking.booking_code == bkg_code).first()
        if not existing_bkg:
            bkg = Booking(
                id=uuid.uuid4(),
                booking_code=bkg_code,
                customer_id=cust.id,
                service_id=srv.id,
                provider_id=srv.provider_id,
                start_date=start_d,
                guest_count=random.randint(1, 4),
                status=random.choice(["CONFIRMED", "COMPLETED", "CONFIRMED", "CONFIRMED"]),
                unit_price=srv.price,
                total_amount=srv.price * random.randint(1, 3),
                special_requests="Vegetarian meals preferred.",
                is_test_data=True,
            )
            db.add(bkg)
            seeded_bookings += 1

            # Seed matching payment
            pay = Payment(
                id=uuid.uuid4(),
                booking_id=bkg.id,
                customer_id=cust.id,
                razorpay_order_id=f"order_dev_{bkg.booking_code}",
                razorpay_payment_id=f"pay_dev_{idx:06d}",
                razorpay_signature=f"sig_{uuid.uuid4().hex[:16]}",
                amount=float(bkg.total_amount),
                currency="INR",
                status="PAID" if bkg.status in ["CONFIRMED", "COMPLETED"] else "PENDING",
                is_test_data=True,
                created_at=bkg.created_at,
                updated_at=bkg.updated_at,
            )
            db.add(pay)

            # Seed matching review
            rev = Review(
                id=uuid.uuid4(),
                service_id=srv.id,
                booking_id=bkg.id,
                user_id=cust.id,
                user_name=cust.full_name,
                rating=round(random.uniform(4.5, 5.0), 1),
                comment=REVIEW_COMMENTS[idx % len(REVIEW_COMMENTS)],
                is_verified=True,
                status="PUBLISHED",
                is_test_data=True,
            )
            db.add(rev)
            seeded_reviews += 1

    db.commit()
    print(f"      Seeded {seeded_bookings} bookings, payments, and {seeded_reviews} verified customer reviews.")

    # ── 6. Seed Support Tickets ──
    print("\n[6/7] Seeding realistic Support Inquiries...")
    ticket_categories = ["Booking", "Payment", "Service", "KYC", "General", "Account"]
    ticket_statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
    ticket_priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]

    seeded_tickets = 0
    if db.query(SupportTicket).count() < 10:
        for idx in range(1, 25):
            code = f"NC-TICK-DEV-{idx:04d}"
            existing_t = db.query(SupportTicket).filter(SupportTicket.ticket_code == code).first()
            if existing_t:
                continue
            u = created_users[idx % len(created_users)][0]
            cat = ticket_categories[idx % len(ticket_categories)]
            stat = ticket_statuses[idx % len(ticket_statuses)]
            prio = ticket_priorities[idx % len(ticket_priorities)]
            created_dt = datetime.utcnow() - timedelta(days=idx, hours=idx * 2)

            t = SupportTicket(
                id=uuid.uuid4(),
                ticket_code=code,
                user_id=u.id,
                user_name=u.full_name,
                user_email=u.email,
                booking_id=f"NC-BKG-{9000 + idx}" if idx % 2 == 0 else None,
                category=cat,
                subject=f"Inquiry regarding {cat.lower()} details and schedule #{idx}",
                description=f"Hello team, I need assistance with my {cat.lower()} request in {u.location}. Please assist at the earliest.",
                status=stat,
                priority=prio,
                responses_json=json.dumps([
                    {
                        "sender_name": "NammaConnect Support Concierge",
                        "sender_role": "admin",
                        "message": f"Thank you for contacting NammaConnect support regarding {cat}. Our team is reviewing your ticket.",
                        "created_at": (created_dt + timedelta(hours=1)).isoformat(),
                    }
                ]) if stat != "OPEN" else json.dumps([]),
                resolved_at=created_dt + timedelta(days=1) if stat in ["RESOLVED", "CLOSED"] else None,
                is_test_data=True,
                created_at=created_dt,
                updated_at=created_dt + timedelta(hours=3),
            )
            db.add(t)
            seeded_tickets += 1
        db.commit()
    print(f"      Seeded {seeded_tickets} platform support tickets.")

    # ── 7. Seed Platform Settings ──
    defaults = [
        ('platform_name', 'NammaConnect', 'Platform Brand Name'),
        ('commission_rate', '0.05', 'Platform Commission Rate'),
        ('currency', 'INR', 'Default Platform Currency'),
        ('environment', 'production', 'Platform Operating Environment'),
        ('is_maintenance_mode', 'false', 'Maintenance Mode Status'),
        ('support_email', 'support@nammaconnect.in', 'System Support Contact')
    ]
    for k, v, d in defaults:
        existing_s = db.query(PlatformSetting).filter(PlatformSetting.key == k).first()
        if not existing_s:
            db.add(PlatformSetting(key=k, value=v, description=d))
    db.commit()

    # ── 8. Summary Report ──
    print("\n========================================================")
    print("  DEVELOPMENT DATA SEEDING COMPLETE")
    print("========================================================")
    print(f"  Total Test Users:          {db.query(User).filter(User.is_test_data == True).count()}")
    print(f"  Total Test Services:       {db.query(Service).filter(Service.is_test_data == True).count()}")
    print(f"  - PUBLISHED Services:      {db.query(Service).filter(Service.is_test_data == True, Service.status == 'PUBLISHED').count()}")
    print(f"  - PENDING Services:        {db.query(Service).filter(Service.is_test_data == True, Service.status == 'PENDING').count()}")
    print(f"  - REJECTED Services:       {db.query(Service).filter(Service.is_test_data == True, Service.status == 'REJECTED').count()}")
    print(f"  - DRAFT Services:          {db.query(Service).filter(Service.is_test_data == True, Service.status == 'DRAFT').count()}")
    print(f"  Partner Applications:      {db.query(PartnerApplication).filter(PartnerApplication.is_test_data == True).count()}")
    print(f"  Creator Profiles:          {db.query(CreatorProfile).filter(CreatorProfile.is_test_data == True).count()}")
    print(f"  Bookings:                  {db.query(Booking).filter(Booking.is_test_data == True).count()}")
    print(f"  Payments:                  {db.query(Payment).count()}")
    print(f"  Support Tickets:           {db.query(SupportTicket).count()}")
    print(f"  Reviews:                   {db.query(Review).filter(Review.is_test_data == True).count()}")
    print("========================================================\n")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_development_data(db)
    finally:
        db.close()
