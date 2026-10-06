"""Initial Namma Connect V2 Baseline Database Migration.

Revision ID: 0001_initial_namma_connect_v2
Revises: None
Create Date: 2026-09-15
"""

import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from pgvector.sqlalchemy import Vector
from app.models.base import GUID

# Revision identifiers
revision = "0001_initial_namma_connect_v2"
down_revision = None
branch_labels = None
depends_on = None

# Permanent 10 Reference Categories Seed Data
SEEDED_CATEGORIES = [
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000001"),
        "slug": "farm",
        "name": "Farm Tours & Experiences",
        "marketplace_type": "ACTIVITY",
        "icon": "sprout",
        "description": "Hands-on agro-tours, harvest experiences, plantation walks, and rural life workshops.",
        "sort_order": 1,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000002"),
        "slug": "adventure",
        "name": "Adventure & Trekking",
        "marketplace_type": "ACTIVITY",
        "icon": "mountain",
        "description": "Western Ghats peak trekking, coffee estate night camping, forest trails, and off-road expeditions.",
        "sort_order": 2,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000003"),
        "slug": "culture",
        "name": "Heritage & Culture",
        "marketplace_type": "ACTIVITY",
        "icon": "landmark",
        "description": "Historical temple tours, folk art workshops (Yakshagana, Dollu Kunitha), and artisan heritage.",
        "sort_order": 3,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000004"),
        "slug": "culinary",
        "name": "Culinary & Food Trails",
        "marketplace_type": "FOOD",
        "icon": "utensils",
        "description": "Authentic regional Karnataka cuisine, organic farm-to-table dining, and traditional cooking masterclasses.",
        "sort_order": 4,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000005"),
        "slug": "nature",
        "name": "Nature & Wildlife",
        "marketplace_type": "ACTIVITY",
        "icon": "trees",
        "description": "Birdwatching sanctuaries, river rafting, wildlife safaris, and botanical garden walks.",
        "sort_order": 5,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000006"),
        "slug": "wellness",
        "name": "Wellness & Ayurveda",
        "marketplace_type": "ACTIVITY",
        "icon": "heart-pulse",
        "description": "Herbal retreat centers, traditional yoga shalas, holistic detox, and Ayurvedic wellness stays.",
        "sort_order": 6,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000007"),
        "slug": "hotel-stay",
        "name": "Eco Resorts & Homestays",
        "marketplace_type": "HOTEL_STAY",
        "icon": "home",
        "description": "Traditional Malnad tharavadu homestays, eco-lodges, treehouses, and heritage plantation estates.",
        "sort_order": 7,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000008"),
        "slug": "food-dining",
        "name": "Rural Dining & Cafes",
        "marketplace_type": "FOOD",
        "icon": "coffee",
        "description": "Authentic highway dhabas, organic farm cafes, village hearths, and tribal culinary experiences.",
        "sort_order": 8,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000009"),
        "slug": "transport",
        "name": "Local Transport & Cabs",
        "marketplace_type": "TRANSPORT",
        "icon": "car",
        "description": "Verified rural taxi drivers, jeep safari rentals, temple circuit transit, and airport pickups.",
        "sort_order": 9,
    },
    {
        "id": uuid.UUID("c0000001-0000-0000-0000-000000000010"),
        "slug": "creator",
        "name": "Content Creators & Media",
        "marketplace_type": "ACTIVITY",
        "icon": "camera",
        "description": "Professional travel photographers, drone videographers, and regional agro-storytellers.",
        "sort_order": 10,
    },
]


def upgrade() -> None:
    # ── 0. Enable pgvector Extension ──
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # ── 1. Users Table ──
    op.create_table(
        "users",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("mobile", sa.String(32), nullable=True),
        sa.Column("role", sa.String(32), nullable=False, server_default="CUSTOMER"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("auth_provider", sa.String(32), nullable=False, server_default="local"),
        sa.Column("google_id", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("location", sa.String(255), nullable=True, server_default="Bengaluru, Karnataka"),
        sa.Column("language", sa.String(64), nullable=False, server_default="English, Kannada"),
        sa.Column("theme_preference", sa.String(32), nullable=False, server_default="system"),
        sa.Column("notification_preferences", sa.String(1024), nullable=True),
        sa.Column("privacy_preferences", sa.String(512), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("gender", sa.String(32), nullable=True),
        sa.Column("date_of_birth", sa.String(32), nullable=True),
        sa.Column("tags_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("password_otp_hash", sa.String(255), nullable=True),
        sa.Column("password_otp_expires_at", sa.DateTime(), nullable=True),
        sa.Column("email_otp_hash", sa.String(255), nullable=True),
        sa.Column("email_otp_expires_at", sa.DateTime(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_mobile", "users", ["mobile"], unique=True)
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_is_test_data", "users", ["is_test_data"])

    # ── 2. Marketplace Categories (Permanent Taxonomy) ──
    op.create_table(
        "marketplace_categories",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("marketplace_type", sa.String(50), nullable=False, server_default="ACTIVITY"),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("icon", sa.String(100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_marketplace_categories_slug", "marketplace_categories", ["slug"], unique=True)
    op.create_index("ix_marketplace_categories_marketplace_type", "marketplace_categories", ["marketplace_type"])
    op.create_index("ix_marketplace_categories_is_active", "marketplace_categories", ["is_active"])

    # Seed permanent reference categories
    categories_table = sa.table(
        "marketplace_categories",
        sa.column("id", GUID()),
        sa.column("slug", sa.String),
        sa.column("name", sa.String),
        sa.column("marketplace_type", sa.String),
        sa.column("icon", sa.String),
        sa.column("description", sa.Text),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        categories_table,
        [
            {
                "id": cat["id"],
                "slug": cat["slug"],
                "name": cat["name"],
                "marketplace_type": cat["marketplace_type"],
                "icon": cat["icon"],
                "description": cat["description"],
                "sort_order": cat["sort_order"],
                "is_active": True,
            }
            for cat in SEEDED_CATEGORIES
        ],
    )

    # ── 3. Partner Applications (KYC & Provider Onboarding) ──
    op.create_table(
        "partner_applications",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("application_code", sa.String(32), nullable=False),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_type", sa.String(50), nullable=False, server_default="farmer"),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("mobile", sa.String(32), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("district", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False, server_default="Karnataka"),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("experience_years", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("languages", sa.String(255), nullable=True),
        sa.Column("id_type", sa.String(50), nullable=False),
        sa.Column("id_number", sa.String(100), nullable=False),
        sa.Column("document_url", sa.String(500), nullable=True),
        sa.Column("provider_details_json", sa.Text(), nullable=True, server_default="{}"),
        sa.Column("documents_json", sa.Text(), nullable=True, server_default="[]"),
        sa.Column("images_json", sa.Text(), nullable=True, server_default="[]"),
        sa.Column("services_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("activities_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("draft_step", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by", GUID(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_partner_applications_code", "partner_applications", ["application_code"], unique=True)
    op.create_index("ix_partner_applications_user_id", "partner_applications", ["user_id"])
    op.create_index("ix_partner_applications_status", "partner_applications", ["status"])
    op.create_index("ix_partner_applications_district", "partner_applications", ["district"])

    # ── 4. Services Table ──
    op.create_table(
        "services",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("category_slug", sa.String(100), nullable=False),
        sa.Column("category_id", GUID(), sa.ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("marketplace_type", sa.String(50), nullable=False, server_default="ACTIVITY"),
        sa.Column("location", sa.String(255), nullable=False),
        sa.Column("district", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False, server_default="Karnataka"),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("formatted_address", sa.String(500), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False, server_default="night"),
        sa.Column("duration_hours", sa.Float(), nullable=True),
        sa.Column("max_capacity", sa.Integer(), nullable=True, server_default="10"),
        sa.Column("rating", sa.Float(), nullable=False, server_default="5.0"),
        sa.Column("reviews_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider_name", sa.String(255), nullable=False),
        sa.Column("provider_type", sa.String(100), nullable=False, server_default="Farmer"),
        sa.Column("provider_avatar", sa.String(500), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by", GUID(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("primary_image", sa.String(500), nullable=False),
        sa.Column("images_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("inclusions_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("amenities_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_services_slug", "services", ["slug"], unique=True)
    op.create_index("ix_services_title", "services", ["title"])
    op.create_index("ix_services_category_slug", "services", ["category_slug"])
    op.create_index("ix_services_category_id", "services", ["category_id"])
    op.create_index("ix_services_status", "services", ["status"])
    op.create_index("ix_services_provider_id", "services", ["provider_id"])
    op.create_index("ix_services_district", "services", ["district"])
    op.create_index("ix_services_is_test_data", "services", ["is_test_data"])
    op.create_index("idx_service_search", "services", ["category_slug", "status", "price"])
    op.create_index("idx_service_location", "services", ["district", "state"])

    # ── 5. Service Availabilities ──
    op.create_table(
        "service_availabilities",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.String(32), nullable=False),
        sa.Column("start_time", sa.String(32), nullable=True),
        sa.Column("end_time", sa.String(32), nullable=True),
        sa.Column("slot_label", sa.String(128), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("booked_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("price_override", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_service_availabilities_service_id", "service_availabilities", ["service_id"])
    op.create_index("ix_service_availabilities_date", "service_availabilities", ["date"])
    op.create_index("idx_service_avail_date", "service_availabilities", ["service_id", "date"])

    # ── 6. Saved Services (Wishlist) ──
    op.create_table(
        "saved_services",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", "service_id", name="uq_user_saved_service"),
    )
    op.create_index("ix_saved_services_user_id", "saved_services", ["user_id"])
    op.create_index("ix_saved_services_service_id", "saved_services", ["service_id"])

    # ── 7. Content Translations ──
    op.create_table(
        "content_translations",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("resource_type", sa.String(50), nullable=False),
        sa.Column("resource_id", sa.String(100), nullable=False),
        sa.Column("language", sa.String(10), nullable=False),
        sa.Column("field_name", sa.String(50), nullable=False),
        sa.Column("translated_text", sa.Text(), nullable=False),
        sa.Column("source_language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("is_stale", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index(
        "idx_translation_lookup",
        "content_translations",
        ["resource_type", "resource_id", "language", "field_name"],
    )

    # ── 8. Bookings Table ──
    op.create_table(
        "bookings",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("booking_code", sa.String(32), nullable=False),
        sa.Column("customer_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("start_date", sa.String(32), nullable=False),
        sa.Column("end_date", sa.String(32), nullable=True),
        sa.Column("time_slot_id", sa.String(64), nullable=True),
        sa.Column("time_slot_label", sa.String(128), nullable=True),
        sa.Column("guest_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("special_requests", sa.Text(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_bookings_booking_code", "bookings", ["booking_code"], unique=True)
    op.create_index("ix_bookings_customer_id", "bookings", ["customer_id"])
    op.create_index("ix_bookings_service_id", "bookings", ["service_id"])
    op.create_index("ix_bookings_provider_id", "bookings", ["provider_id"])
    op.create_index("ix_bookings_status", "bookings", ["status"])
    op.create_index("idx_customer_bookings", "bookings", ["customer_id", "status", "created_at"])
    op.create_index("idx_provider_bookings", "bookings", ["provider_id", "status"])

    # ── 9. Payments Table ──
    op.create_table(
        "payments",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("booking_id", GUID(), sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("razorpay_order_id", sa.String(128), nullable=False),
        sa.Column("razorpay_payment_id", sa.String(128), nullable=True),
        sa.Column("razorpay_signature", sa.String(256), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_payments_customer_id", "payments", ["customer_id"])
    op.create_index("ix_payments_razorpay_order_id", "payments", ["razorpay_order_id"])
    op.create_index("ix_payments_razorpay_payment_id", "payments", ["razorpay_payment_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("idx_booking_payments", "payments", ["booking_id", "status"])
    op.create_index("idx_customer_payments", "payments", ["customer_id", "status"])

    # ── 10. Refunds Table ──
    op.create_table(
        "refunds",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("payment_id", GUID(), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("booking_id", GUID(), sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("razorpay_refund_id", sa.String(128), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="INR"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_refunds_payment_id", "refunds", ["payment_id"])
    op.create_index("ix_refunds_booking_id", "refunds", ["booking_id"])
    op.create_index("ix_refunds_customer_id", "refunds", ["customer_id"])
    op.create_index("ix_refunds_status", "refunds", ["status"])

    # ── 11. Payouts Table ──
    op.create_table(
        "payouts",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payout_code", sa.String(50), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="INR"),
        sa.Column("bank_account_number", sa.String(50), nullable=True),
        sa.Column("bank_ifsc", sa.String(20), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_payouts_provider_id", "payouts", ["provider_id"])
    op.create_index("ix_payouts_payout_code", "payouts", ["payout_code"], unique=True)
    op.create_index("ix_payouts_status", "payouts", ["status"])

    # ── 12. Reviews Table ──
    op.create_table(
        "reviews",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("booking_id", GUID(), sa.ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("rating", sa.Float(), nullable=False, server_default="5.0"),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", sa.String(50), nullable=False, server_default="PUBLISHED"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("booking_id", name="uq_review_booking"),
    )
    op.create_index("ix_reviews_service_id", "reviews", ["service_id"])
    op.create_index("ix_reviews_booking_id", "reviews", ["booking_id"])
    op.create_index("ix_reviews_user_id", "reviews", ["user_id"])
    op.create_index("idx_service_reviews", "reviews", ["service_id", "status", "rating"])

    # ── 13. Notifications Table ──
    op.create_table(
        "notifications",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(50), nullable=False, server_default="BOOKING"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("idx_user_notifications_read", "notifications", ["user_id", "is_read", "created_at"])

    # ── 14. Email Logs Table ──
    op.create_table(
        "email_logs",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("template", sa.String(100), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="SENT"),
        sa.Column("provider_message_id", sa.String(255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_email_logs_recipient", "email_logs", ["recipient"])
    op.create_index("ix_email_logs_template", "email_logs", ["template"])

    # ── 15. Conversations Table ──
    op.create_table(
        "conversations",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("participant1_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("participant1_name", sa.String(255), nullable=False),
        sa.Column("participant2_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("participant2_name", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(255), nullable=True),
        sa.Column("last_message_text", sa.Text(), nullable=True),
        sa.Column("last_message_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("unread_count_p1", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unread_count_p2", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_conversations_participant1_id", "conversations", ["participant1_id"])
    op.create_index("ix_conversations_participant2_id", "conversations", ["participant2_id"])
    op.create_index("idx_conversation_participants", "conversations", ["participant1_id", "participant2_id"])
    op.create_index("idx_conversation_last_msg", "conversations", ["last_message_at"])

    # ── 16. Messages Table ──
    op.create_table(
        "messages",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("conversation_id", GUID(), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_name", sa.String(255), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])
    op.create_index("idx_message_conv_created", "messages", ["conversation_id", "created_at"])

    # ── 17. Trips Table (Itinerary / Planning) ──
    op.create_table(
        "trips",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.String(32), nullable=True),
        sa.Column("end_date", sa.String(32), nullable=True),
        sa.Column("origin", sa.String(255), nullable=True),
        sa.Column("destination", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="DRAFT"),
        sa.Column("created_by", sa.String(32), nullable=False, server_default="USER"),
        sa.Column("ai_generated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_trips_user_id", "trips", ["user_id"])
    op.create_index("ix_trips_status", "trips", ["status"])
    op.create_index("idx_trips_user_start", "trips", ["user_id", "start_date"])

    # ── 18. Trip Days Table ──
    op.create_table(
        "trip_days",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("trip_id", GUID(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_number", sa.Integer(), nullable=False),
        sa.Column("date", sa.String(32), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_trip_days_trip_id", "trip_days", ["trip_id"])
    op.create_index("idx_trip_days_trip_day", "trip_days", ["trip_id", "day_number"])

    # ── 19. Trip Items Table ──
    op.create_table(
        "trip_items",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("trip_day_id", GUID(), sa.ForeignKey("trip_days.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("booking_id", GUID(), sa.ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("item_type", sa.String(50), nullable=False, server_default="SERVICE"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_time", sa.String(32), nullable=True),
        sa.Column("end_time", sa.String(32), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("sequence_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_booked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_trip_items_trip_day_id", "trip_items", ["trip_day_id"])
    op.create_index("ix_trip_items_service_id", "trip_items", ["service_id"])
    op.create_index("idx_trip_items_day_seq", "trip_items", ["trip_day_id", "sequence_order"])

    # ── 20. AI Conversations Table ──
    op.create_table(
        "ai_conversations",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False, server_default="New Conversation"),
        sa.Column("context_type", sa.String(50), nullable=False, server_default="TRAVEL"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_ai_conversations_user_id", "ai_conversations", ["user_id"])
    op.create_index("idx_ai_conv_user_updated", "ai_conversations", ["user_id", "updated_at"])

    # ── 21. AI Messages Table ──
    op.create_table(
        "ai_messages",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("conversation_id", GUID(), sa.ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(32), nullable=False, server_default="USER"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("intent", sa.String(64), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_ai_messages_conversation_id", "ai_messages", ["conversation_id"])
    op.create_index("idx_ai_msg_conv_created", "ai_messages", ["conversation_id", "created_at"])

    # ── 22. AI Trip Plans Table ──
    op.create_table(
        "ai_trip_plans",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("trip_id", GUID(), sa.ForeignKey("trips.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("preferences_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("constraints_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("model", sa.String(128), nullable=False, server_default="gemini-3.5-flash-lite"),
        sa.Column("model_version", sa.String(64), nullable=False, server_default="v2.0.0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="COMPLETED"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_ai_trip_plans_trip_id", "ai_trip_plans", ["trip_id"])
    op.create_index("ix_ai_trip_plans_user_id", "ai_trip_plans", ["user_id"])
    op.create_index("idx_ai_trip_plans_user_created", "ai_trip_plans", ["user_id", "created_at"])

    # ── 23. User Interactions Table ──
    op.create_table(
        "user_interactions",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category_id", GUID(), sa.ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False, server_default="VIEW"),
        sa.Column("event_value", sa.String(255), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.String(128), nullable=True),
        sa.Column("source", sa.String(64), nullable=True),
        sa.Column("weight", sa.Float(), nullable=False, server_default="0.10"),
        sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_user_interactions_user_id", "user_interactions", ["user_id"])
    op.create_index("ix_user_interactions_service_id", "user_interactions", ["service_id"])
    op.create_index("ix_user_interactions_event_type", "user_interactions", ["event_type"])
    op.create_index("idx_user_interaction_event", "user_interactions", ["user_id", "event_type", "created_at"])
    op.create_index("idx_user_interaction_service", "user_interactions", ["user_id", "service_id", "created_at"])

    # ── 24. User Interest Profiles Table ──
    op.create_table(
        "user_interest_profiles",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", GUID(), sa.ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("interest_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("interaction_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_interaction_at", sa.DateTime(), nullable=True),
        sa.Column("category_affinity_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("destination_affinity_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("topic_affinity_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("budget_band_json", sa.Text(), nullable=False, server_default='{"min": 500, "max": 10000}'),
        sa.Column("language", sa.String(64), nullable=False, server_default="en"),
        sa.Column("last_updated", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", name="uq_user_interest_profile_user"),
    )
    op.create_index("ix_user_interest_profiles_user_id", "user_interest_profiles", ["user_id"])

    # ── 25. User Similarities Table ──
    op.create_table(
        "user_similarities",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id_1", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id_2", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("similarity_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("evidence_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id_1", "user_id_2", name="uq_user_similarity_pair"),
    )
    op.create_index("ix_user_similarities_user1", "user_similarities", ["user_id_1"])
    op.create_index("ix_user_similarities_user2", "user_similarities", ["user_id_2"])
    op.create_index("idx_user_sim_score", "user_similarities", ["user_id_1", "similarity_score"])

    # ── 26. Recommendation Results Table ──
    op.create_table(
        "recommendation_results",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category_id", GUID(), sa.ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recommendation_type", sa.String(64), nullable=False, server_default="PERSONALIZED"),
        sa.Column("section", sa.String(64), nullable=False, server_default="recommended_for_you"),
        sa.Column("score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("reason_code", sa.String(128), nullable=False, server_default="personalized_match"),
        sa.Column("explanation_text", sa.Text(), nullable=False, server_default="Recommended based on your preferences."),
        sa.Column("model_version", sa.String(64), nullable=False, server_default="v2.0.0"),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_recommendation_results_user_id", "recommendation_results", ["user_id"])
    op.create_index("ix_recommendation_results_service_id", "recommendation_results", ["service_id"])
    op.create_index("ix_recommendation_results_section", "recommendation_results", ["section"])
    op.create_index("idx_user_rec_section", "recommendation_results", ["user_id", "section", "score"])

    # ── 27. Recommendation Impressions Table ──
    op.create_table(
        "recommendation_impressions",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("recommendation_id", GUID(), sa.ForeignKey("recommendation_results.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("surface", sa.String(64), nullable=False, server_default="HOME"),
        sa.Column("section", sa.String(64), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shown_at", sa.DateTime(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("clicked_at", sa.DateTime(), nullable=True),
        sa.Column("viewed_at", sa.DateTime(), nullable=True),
        sa.Column("saved_at", sa.DateTime(), nullable=True),
        sa.Column("booked_at", sa.DateTime(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_recommendation_impressions_user_id", "recommendation_impressions", ["user_id"])
    op.create_index("ix_recommendation_impressions_service_id", "recommendation_impressions", ["service_id"])

    # ── 28. Recommendation Feedback Table ──
    op.create_table(
        "recommendation_feedback",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("recommendation_id", GUID(), sa.ForeignKey("recommendation_results.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback_type", sa.String(64), nullable=False),
        sa.Column("feedback_text", sa.Text(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_recommendation_feedback_user_id", "recommendation_feedback", ["user_id"])
    op.create_index("ix_recommendation_feedback_feedback_type", "recommendation_feedback", ["feedback_type"])

    # ── 29. NC Score Snapshots Table ──
    op.create_table(
        "nc_score_snapshots",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=True),
        sa.Column("score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("component_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("model_version", sa.String(64), nullable=False, server_default="v2.0.0"),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_nc_score_snapshots_provider_id", "nc_score_snapshots", ["provider_id"])
    op.create_index("ix_nc_score_snapshots_service_id", "nc_score_snapshots", ["service_id"])
    op.create_index("ix_nc_score_snapshots_calc_at", "nc_score_snapshots", ["calculated_at"])

    # ── 30. Provider Daily Metrics Table ──
    op.create_table(
        "provider_daily_metrics",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("saves", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bookings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("booking_requests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accepted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cancelled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("revenue", sa.Numeric(12, 2), nullable=False, server_default="0.0"),
        sa.Column("gross", sa.Numeric(12, 2), nullable=False, server_default="0.0"),
        sa.Column("net", sa.Numeric(12, 2), nullable=False, server_default="0.0"),
        sa.Column("available_slots", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("booked_slots", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("conversion_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("occupancy_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("rating_avg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("provider_id", "date", name="uq_provider_daily_metric_date"),
    )
    op.create_index("ix_provider_daily_metrics_provider_id", "provider_daily_metrics", ["provider_id"])
    op.create_index("ix_provider_daily_metrics_date", "provider_daily_metrics", ["date"])

    # ── 31. Service Daily Metrics Table ──
    op.create_table(
        "service_daily_metrics",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("saves", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bookings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("booking_requests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confirmed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cancellations", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("revenue", sa.Numeric(12, 2), nullable=False, server_default="0.0"),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("booked_slots", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("conversion_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("occupancy_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("rating_avg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("service_id", "date", name="uq_service_daily_metric_date"),
    )
    op.create_index("ix_service_daily_metrics_service_id", "service_daily_metrics", ["service_id"])
    op.create_index("ix_service_daily_metrics_date", "service_daily_metrics", ["date"])

    # ── 32. Provider Response Metrics Table ──
    op.create_table(
        "provider_response_metrics",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("pending_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("responded_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("requests_received", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("requests_responded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_response_seconds", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("avg_response_minutes", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("confirmation_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("cancellation_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("provider_id", "date", name="uq_provider_response_metric_date"),
    )
    op.create_index("ix_provider_response_metrics_provider_id", "provider_response_metrics", ["provider_id"])
    op.create_index("ix_provider_response_metrics_date", "provider_response_metrics", ["date"])

    # ── 33. Provider Action Recommendations Table ──
    op.create_table(
        "provider_action_recommendations",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("provider_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=True),
        sa.Column("action_type", sa.String(64), nullable=False),
        sa.Column("recommendation_type", sa.String(64), nullable=True),
        sa.Column("priority", sa.String(32), nullable=False, server_default="MEDIUM"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("evidence", sa.Text(), nullable=False, server_default=""),
        sa.Column("expected_impact", sa.Text(), nullable=False, server_default=""),
        sa.Column("action_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("metric_value", sa.Float(), nullable=True),
        sa.Column("threshold_value", sa.Float(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("priority_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("model_version", sa.String(64), nullable=False, server_default="v2.0.0"),
        sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_provider_action_recs_provider_id", "provider_action_recommendations", ["provider_id"])
    op.create_index("ix_provider_action_recs_action_type", "provider_action_recommendations", ["action_type"])
    op.create_index("idx_provider_action_priority", "provider_action_recommendations", ["provider_id", "priority_score"])

    # ── 34. Support Tickets Table ──
    op.create_table(
        "support_tickets",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("ticket_code", sa.String(50), nullable=False),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("booking_id", sa.String(255), nullable=True),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="OPEN"),
        sa.Column("priority", sa.String(50), nullable=False, server_default="MEDIUM"),
        sa.Column("responses_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_support_tickets_code", "support_tickets", ["ticket_code"], unique=True)
    op.create_index("ix_support_tickets_user_id", "support_tickets", ["user_id"])
    op.create_index("ix_support_tickets_status", "support_tickets", ["status"])
    op.create_index("idx_support_user_status", "support_tickets", ["user_id", "status"])
    op.create_index("idx_support_category", "support_tickets", ["category"])

    # ── 35. Platform Settings Table ──
    op.create_table(
        "platform_settings",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_platform_settings_key", "platform_settings", ["key"], unique=True)


def downgrade() -> None:
    # Drop all tables in strict reverse dependency order
    op.drop_table("platform_settings")
    op.drop_table("support_tickets")
    op.drop_table("provider_action_recommendations")
    op.drop_table("provider_response_metrics")
    op.drop_table("service_daily_metrics")
    op.drop_table("provider_daily_metrics")
    op.drop_table("nc_score_snapshots")
    op.drop_table("recommendation_feedback")
    op.drop_table("recommendation_impressions")
    op.drop_table("recommendation_results")
    op.drop_table("user_similarities")
    op.drop_table("user_interest_profiles")
    op.drop_table("user_interactions")
    op.drop_table("ai_trip_plans")
    op.drop_table("ai_messages")
    op.drop_table("ai_conversations")
    op.drop_table("trip_items")
    op.drop_table("trip_days")
    op.drop_table("trips")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("email_logs")
    op.drop_table("notifications")
    op.drop_table("reviews")
    op.drop_table("payouts")
    op.drop_table("refunds")
    op.drop_table("payments")
    op.drop_table("bookings")
    op.drop_table("content_translations")
    op.drop_table("saved_services")
    op.drop_table("service_availabilities")
    op.drop_table("services")
    op.drop_table("partner_applications")
    op.drop_table("marketplace_categories")
    op.drop_table("users")
