import sys

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def main():
    email = input("Admin email: ").strip().lower()
    password = input("Admin password: ").strip()
    full_name = input("Admin name: ").strip()

    if not email or not password or not full_name:
        print("Email, password and name are required.")
        sys.exit(1)

    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)

    db = SessionLocal()

    try:
        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            existing_user.role = "admin"
            existing_user.is_active = True
            existing_user.is_verified = True
            existing_user.hashed_password = get_password_hash(password)

            db.commit()

            print("Existing user promoted to admin.")
            print(f"Admin email: {email}")
            return

        admin = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role="admin",
            is_active=True,
            is_verified=True,
            phone_verified=False,
            auth_provider="local",
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("Admin account created successfully.")
        print(f"Admin email: {email}")

    except Exception as exc:
        db.rollback()
        print(f"Failed to create admin: {exc}")
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()