"""modular_refactor

Revision ID: e0fda819dada
Revises: e489494665c4
Create Date: 2026-08-16 13:08:12.975345

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0fda819dada'
down_revision: Union[str, Sequence[str], None] = 'e489494665c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create independent new tables first
    op.execute("""
        CREATE TABLE IF NOT EXISTS media (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(30) NOT NULL,
            reference_type VARCHAR(50) NOT NULL,
            reference_id INTEGER NOT NULL,
            file_url TEXT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS blogs (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(255) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category VARCHAR(100) NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'published',
            views INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    # 2. Create profiles, farmer_profiles, creator_profiles
    op.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            dob DATE NULL,
            gender VARCHAR(30) NULL,
            address TEXT NULL,
            city VARCHAR(100) NULL,
            district VARCHAR(100) NULL,
            state VARCHAR(100) NULL,
            country VARCHAR(100) NULL DEFAULT 'India',
            pincode VARCHAR(10) NULL,
            languages JSON NULL,
            interests JSON NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS farmer_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            farmer_id VARCHAR(100) NULL,
            farm_experience_years INTEGER NULL,
            farmer_category VARCHAR(100) NULL,
            primary_crops JSON NULL,
            verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS creator_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            display_name VARCHAR(150) NOT NULL,
            bio TEXT NULL,
            category VARCHAR(100) NULL,
            experience_years INTEGER NULL,
            languages JSON NULL,
            instagram_url TEXT NULL,
            facebook_url TEXT NULL,
            youtube_url TEXT NULL,
            portfolio_url TEXT NULL,
            verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    # 3. Migrate old profiles data
    # Map old tourist table -> profiles
    op.execute("""
        INSERT INTO profiles (user_id, address, city, state, country, pincode, created_at, updated_at)
        SELECT user_id, address, city, state, country, postal_code, created_at, updated_at FROM tourist
        ON CONFLICT (user_id) DO NOTHING;
    """)

    # Map old farmer table -> farmer_profiles (keep the exact ID values for relationship compatibility)
    op.execute("""
        INSERT INTO farmer_profiles (id, user_id, verification_status, created_at, updated_at)
        SELECT id, user_id, CASE WHEN is_verified THEN 'approved' ELSE 'pending' END, created_at, updated_at FROM farmer
        ON CONFLICT (user_id) DO NOTHING;
        SELECT setval('farmer_profiles_id_seq', COALESCE((SELECT MAX(id)+1 FROM farmer_profiles), 1), false);
    """)

    # Map old creator table -> creator_profiles
    op.execute("""
        INSERT INTO creator_profiles (id, user_id, display_name, bio, category, instagram_url, youtube_url, portfolio_url, verification_status, created_at, updated_at)
        SELECT id, user_id, name, bio, niche, instagram, youtube, portfolio, CASE WHEN is_verified THEN 'approved' ELSE 'pending' END, created_at, updated_at FROM creator
        ON CONFLICT (user_id) DO NOTHING;
        SELECT setval('creator_profiles_id_seq', COALESCE((SELECT MAX(id)+1 FROM creator_profiles), 1), false);
    """)

    # 4. Create applications & verification_documents
    op.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
            reviewed_at TIMESTAMP NULL,
            reviewed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            rejection_reason TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS verification_documents (
            id SERIAL PRIMARY KEY,
            application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
            document_type VARCHAR(50) NOT NULL,
            document_number VARCHAR(255) NULL,
            file_id INTEGER NULL REFERENCES media(id) ON DELETE SET NULL,
            verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            verified_at TIMESTAMP NULL,
            verified_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            rejection_reason TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    # 5. Populate applications for existing verified farmers/creators to preserve access
    op.execute("""
        INSERT INTO applications (user_id, type, status, submitted_at, reviewed_at, created_at, updated_at)
        SELECT user_id, 'farmer', 'approved', created_at, created_at, created_at, updated_at FROM farmer WHERE is_verified = TRUE;
        
        INSERT INTO applications (user_id, type, status, submitted_at, reviewed_at, created_at, updated_at)
        SELECT user_id, 'creator', 'approved', created_at, created_at, created_at, updated_at FROM creator WHERE is_verified = TRUE;
    """)

    # 6. Migrate farm_listing to farms
    # Rename table
    op.execute("ALTER TABLE farm_listing RENAME TO farms;")
    
    # Drop old foreign key constraint to farmer table
    op.execute("ALTER TABLE farms DROP CONSTRAINT IF EXISTS farm_listing_farmer_id_fkey;")
    
    # Re-link farmer_id to farmer_profiles
    op.execute("ALTER TABLE farms ADD CONSTRAINT farms_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(id) ON DELETE CASCADE;")
    
    # Rename columns and add new fields
    op.execute("ALTER TABLE farms RENAME COLUMN farm_name TO name;")
    op.execute("ALTER TABLE farms RENAME COLUMN price_per_night TO price_from;")
    op.execute("""
        ALTER TABLE farms 
        ADD COLUMN IF NOT EXISTS village VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS taluk VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS district VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS pincode VARCHAR(10) NULL,
        ADD COLUMN IF NOT EXISTS farm_area NUMERIC(10, 2) NULL,
        ADD COLUMN IF NOT EXISTS farm_area_unit VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS farm_type VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS primary_crops JSON NULL,
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    """)
    op.execute("UPDATE farms SET district = city, status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;")
    op.execute("ALTER TABLE farms DROP COLUMN IF EXISTS is_active;")

    # Convert crop_types to JSON primary_crops array
    op.execute("""
        UPDATE farms SET primary_crops = json_build_array(crop_types)::json 
        WHERE crop_types IS NOT NULL AND crop_types != '';
    """)

    # 7. Migrate activities
    op.execute("ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_farm_id_fkey;")
    op.execute("ALTER TABLE activities ADD CONSTRAINT activities_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE;")
    op.execute("ALTER TABLE activities RENAME COLUMN title TO name;")
    op.execute("""
        ALTER TABLE activities
        ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NULL,
        ADD COLUMN IF NOT EXISTS capacity INTEGER NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    """)

    # 8. Create collaborations table
    op.execute("""
        CREATE TABLE IF NOT EXISTS collaborations (
            id SERIAL PRIMARY KEY,
            farmer_id INTEGER NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
            creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
            farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
            initiated_by VARCHAR(20) NOT NULL,
            message TEXT NULL,
            proposal TEXT NULL,
            requested_date DATE NULL,
            start_time TIME NULL,
            end_time TIME NULL,
            amount NUMERIC(12, 2) NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            status VARCHAR(30) NOT NULL DEFAULT 'requested',
            payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
            cancelled_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            cancel_reason TEXT NULL,
            cancelled_at TIMESTAMP NULL,
            completed_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    # 9. Migrate creator bookings into collaborations
    op.execute("""
        INSERT INTO collaborations (id, farmer_id, creator_id, farm_id, initiated_by, message, proposal, requested_date, amount, status, payment_status, created_at, updated_at)
        SELECT b.id, f.id, b.creator_id, COALESCE(b.farm_id, (SELECT MIN(id) FROM farms)), 'farmer', b.collab_note, b.collab_note, b.check_in, b.total_price,
               CASE WHEN b.status = 'confirmed' THEN 'accepted'
                    WHEN b.status = 'cancelled' THEN 'cancelled'
                    ELSE 'requested' END,
               b.payment_status, b.created_at, b.updated_at
        FROM booking b
        JOIN tourist t ON b.tourist_id = t.id
        JOIN farmer_profiles f ON t.user_id = f.user_id
        WHERE b.booking_type = 'creator'
        ON CONFLICT DO NOTHING;
    """)

    # Reset collaborations sequence
    op.execute("SELECT setval('collaborations_id_seq', COALESCE((SELECT MAX(id)+1 FROM collaborations), 1), false);")

    # 10. Migrate booking to bookings
    op.execute("ALTER TABLE booking RENAME TO bookings;")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_booking_type_integrity;")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_creator_id_fkey;")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_farm_id_fkey;")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_tourist_id_fkey;")

    # Remove non-farm bookings
    op.execute("DELETE FROM bookings WHERE booking_type = 'creator';")

    op.execute("""
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS user_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS activity_id INTEGER NULL REFERENCES activities(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS special_request TEXT NULL,
        ADD COLUMN IF NOT EXISTS contact_name VARCHAR(150) NULL,
        ADD COLUMN IF NOT EXISTS contact_mobile VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(50) NULL UNIQUE,
        ADD COLUMN IF NOT EXISTS cancelled_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS cancel_reason TEXT NULL,
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL;
    """)

    # Populate user_id and contact details
    op.execute("""
        UPDATE bookings b SET 
            user_id = t.user_id,
            contact_name = COALESCE(t.name, 'Guest'),
            contact_mobile = COALESCE(t.mobile, '9999999999'),
            contact_email = COALESCE(t.email, 'guest@example.com'),
            confirmation_code = 'CONF-' || b.id
        FROM tourist t 
        WHERE b.tourist_id = t.id;
    """)

    # Delete bookings that couldn't be resolved
    op.execute("DELETE FROM bookings WHERE user_id IS NULL;")

    op.execute("""
        ALTER TABLE bookings 
        ALTER COLUMN user_id SET NOT NULL,
        ALTER COLUMN contact_name SET NOT NULL,
        ALTER COLUMN contact_mobile SET NOT NULL,
        ALTER COLUMN contact_email SET NOT NULL,
        ALTER COLUMN confirmation_code SET NOT NULL;
    """)

    # Add foreign keys
    op.execute("ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;")
    op.execute("ALTER TABLE bookings ADD CONSTRAINT bookings_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE;")

    # Rename stay columns
    op.execute("ALTER TABLE bookings RENAME COLUMN check_in TO booking_date;")
    op.execute("ALTER TABLE bookings RENAME COLUMN guests TO guest_count;")
    op.execute("ALTER TABLE bookings RENAME COLUMN total_price TO amount;")
    
    # Drop old/obsolete columns
    op.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS tourist_id;")
    op.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS booking_type;")
    op.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS collab_note;")
    op.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS creator_id;")

    # 11. Create wishlists table with UniqueConstraint
    op.execute("""
        CREATE TABLE IF NOT EXISTS wishlists (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            target_type VARCHAR(30) NOT NULL,
            target_id INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_wishlist_user_target UNIQUE(user_id, target_type, target_id)
        );
    """)

    # Migrate old wishlists data
    op.execute("""
        INSERT INTO wishlists (user_id, target_type, target_id, created_at)
        SELECT t.user_id, 'farm', CAST(trim(w) AS INTEGER), NOW()
        FROM tourist t, regexp_split_to_table(t.wishlist, ',') w
        WHERE t.wishlist IS NOT NULL AND t.wishlist != '' AND w ~ '^[0-9]+$'
        ON CONFLICT (user_id, target_type, target_id) DO NOTHING;
    """)

    # 12. Migrate payments polymorphic columns
    op.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;")
    op.execute("""
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS type VARCHAR(30) NULL,
        ADD COLUMN IF NOT EXISTS reference_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS razorpay_signature TEXT NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    """)

    op.execute("""
        UPDATE payments p SET
            type = 'booking',
            reference_id = booking_id,
            razorpay_order_id = 'order_migrated_' || booking_id
        WHERE type IS NULL;
    """)

    # Set non-nullable
    op.execute("""
        ALTER TABLE payments 
        ALTER COLUMN type SET NOT NULL,
        ALTER COLUMN reference_id SET NOT NULL,
        ALTER COLUMN razorpay_order_id SET NOT NULL;
    """)
    
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS booking_id;")

    # 13. Create change_requests & reviews
    op.execute("""
        CREATE TABLE IF NOT EXISTS change_requests (
            id SERIAL PRIMARY KEY,
            type VARCHAR(30) NOT NULL,
            reference_id INTEGER NOT NULL,
            requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            old_date DATE NOT NULL,
            new_date DATE NOT NULL,
            message TEXT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            responded_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            response_message TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            target_type VARCHAR(30) NOT NULL,
            target_id INTEGER NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)

    # 14. Migrate users columns
    op.execute("ALTER TABLE users RENAME COLUMN full_name TO name;")
    op.execute("ALTER TABLE users RENAME COLUMN password TO password_hash;")
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE NULL,
        ADD COLUMN IF NOT EXISTS profile_photo TEXT NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    """)
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS role;")

    # 15. Migrate contact_us -> contact_messages
    op.execute("ALTER TABLE contact_us RENAME TO contact_messages;")
    op.execute("ALTER TABLE contact_messages RENAME COLUMN topic TO subject;")
    op.execute("""
        ALTER TABLE contact_messages
        ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending';
    """)

    # 16. Messages & Notifications Foreign Keys update
    op.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS collaboration_id INTEGER REFERENCES collaborations(id) ON DELETE SET NULL;")
    op.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL;")
    op.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50) NULL;")
    op.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id INTEGER NULL;")
    op.execute("ALTER TABLE notifications RENAME COLUMN body TO message;")

    # 17. Drop legacy profile tables
    op.execute("DROP TABLE IF EXISTS tourist CASCADE;")
    op.execute("DROP TABLE IF EXISTS farmer CASCADE;")
    op.execute("DROP TABLE IF EXISTS creator CASCADE;")


def downgrade() -> None:
    """Downgrade schema."""
    pass
