
from db.database import SessionLocal, engine, Base
from db.models import LoginDetail
import random

def test_simple_insert():
    db = SessionLocal()
    try:
        email = f"test_{random.randint(1000, 9999)}@example.com"
        print(f"Testing insert for {email}")
        login = LoginDetail(email=email, password_hash="test", role="tourist")
        db.add(login)
        db.commit()
        db.refresh(login)
        print(f"Success! Login ID: {login.id}")
    except Exception as e:
        print(f"Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_simple_insert()
