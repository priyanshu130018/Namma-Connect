"""Live Concurrency & Stress Tests against PostgreSQL / pgvector.

Verifies strict ACID consistency and row-level locking under high concurrency:
1. 50 concurrent booking attempts for a single slot with capacity 1
   -> exactly 1 succeeds (201 / PENDING)
   -> 49 fail with 400 (Insufficient capacity)
   -> remaining capacity in PostgreSQL is exactly 0 and never negative.
2. 100 identical Razorpay webhook deliveries for the same order
   -> exactly 1 state transition occurs (Payment -> PAID, Booking -> CONFIRMED)
   -> exactly 1 set of confirmation side effects
"""

import os
import sys
import uuid
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.enums import UserRole
from app.models.user import User
from app.models.service import Service
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.notification import Notification
from app.schemas.booking import BookingCreateRequest
from app.services.booking import BookingService
from app.services.payment import PaymentService
from app.services.marketplace import MarketplaceService
from fastapi import HTTPException


def get_postgres_engine():
    """Obtain direct PostgreSQL engine with pool sizing for concurrency tests."""
    url = settings.DATABASE_SYNC_URL or os.environ.get("DATABASE_SYNC_URL", "")
    if not url or url.startswith("sqlite"):
        url = "postgresql://postgres:sql0000@localhost:5432/namma_connect"

    try:
        engine = create_engine(
            url,
            pool_size=60,
            max_overflow=60,
            pool_pre_ping=True,
            pool_timeout=30,
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except Exception as e:
        pytest.fail(
            f"PostgreSQL environment is unavailable: {e}. "
            "Ensure nammaconnect-postgres container is running on port 5432 and DATABASE_SYNC_URL is configured."
        )


@pytest.fixture(scope="module")
def pg_session_factory():
    """Create session factory for live PostgreSQL tests."""
    engine = get_postgres_engine()
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    yield factory
    engine.dispose()


def test_50_concurrent_booking_attempts_for_one_slot(pg_session_factory):
    """
    Stress Test: 50 concurrent customer transactions attempting to book 1 remaining spot.
    
    Strictly verifies:
    - Exactly 1 transaction succeeds.
    - Exactly 49 transactions are rejected with HTTP 400.
    - Remaining capacity in PostgreSQL is exactly 0 and never negative.
    - Total bookings created in PostgreSQL for this slot is exactly 1.
    """
    db = pg_session_factory()
    created_user_ids = []
    service_id = None
    target_date = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")
    slot_id = f"{target_date}-slot-1"

    try:
        # 1. Setup a test service with max_capacity = 1
        service_id = uuid.uuid4()
        test_service = Service(
            id=service_id,
            title="Exclusive High-Demand Sunrise Trek",
            slug=f"exclusive-sunrise-trek-{uuid.uuid4().hex[:8]}",
            description="Limited capacity private trek for concurrency testing.",
            category="Adventure & Eco Treks",
            category_slug="adventure",
            marketplace_type="activity",
            location="Sakleshpur",
            district="Hassan",
            state="Karnataka",
            price=1500.0,
            unit="person",
            duration_hours=4.0,
            max_capacity=1,  # Strictly 1 spot available!
            rating=5.0,
            reviews_count=10,
            is_verified=True,
            status="PUBLISHED",
            provider_name="Sakleshpur Trek Guides",
            provider_type="Guide",
            primary_image="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
            images_json="[]",
            inclusions_json="[]",
            amenities_json="[]",
            is_test_data=True,
            is_synthetic=True,
        )
        db.add(test_service)

        # 2. Setup 50 distinct verified customers
        users: List[User] = []
        for i in range(50):
            u_id = uuid.uuid4()
            created_user_ids.append(u_id)
            user = User(
                id=u_id,
                email=f"concurrency.traveler.{i}.{uuid.uuid4().hex[:6]}@nammaconnect.test",
                full_name=f"Concurrent Traveler {i}",
                role="user",
                is_active=True,
                is_verified=True,
                phone_verified=True,
                is_test_data=True,
            )
            users.append(user)
            db.add(user)

        db.commit()

        # 3. Verify baseline availability and find slot with remaining_capacity == 1
        avail = MarketplaceService.get_service_availability(db, str(service_id))
        target_day = None
        target_slot = None
        for d in avail.days:
            if not d.is_available or d.remaining_capacity <= 0:
                continue
            for s in d.time_slots:
                if s.is_available and s.remaining_capacity == 1:
                    target_day = d
                    target_slot = s
                    break
            if target_slot:
                break

        assert target_day is not None and target_slot is not None, "Could not find slot with remaining capacity 1"
        target_date = target_day.date
        slot_id = target_slot.id
        assert target_slot.remaining_capacity == 1, f"Expected initial slot capacity 1, got {target_slot.remaining_capacity}"

        # 4. Prepare booking request for each user
        req = BookingCreateRequest(
            service_id=str(service_id),
            start_date=target_date,
            time_slot_id=slot_id,
            time_slot_label=f"{target_slot.start_time} - {target_slot.end_time}",
            guest_count=1,
            special_requests="Live Concurrency Slot Test",
        )

        results = []

        def execute_booking(user: User):
            thread_db = pg_session_factory()
            try:
                resp = BookingService.create_booking(thread_db, user, req)
                return {"status": "success", "booking_id": resp.id}
            except HTTPException as hex:
                return {"status": "error", "code": hex.status_code, "detail": str(hex.detail)}
            except Exception as ex:
                return {"status": "error", "code": 500, "detail": str(ex)}
            finally:
                thread_db.close()

        # 5. Launch 50 concurrent booking attempts
        with ThreadPoolExecutor(max_workers=50) as executor:
            results = list(executor.map(execute_booking, users))

        # 6. Strict assertions
        successes = [r for r in results if r["status"] == "success"]
        failures = [r for r in results if r["status"] == "error"]

        print(f"\n[50 Concurrent Bookings Result] Successes: {len(successes)}, Failures: {len(failures)}")

        assert len(successes) == 1, f"Expected exactly 1 success out of 50 concurrent attempts, got {len(successes)}"
        assert len(failures) == 49, f"Expected exactly 49 failures out of 50 concurrent attempts, got {len(failures)}"

        for f in failures:
            assert f["code"] == 400, f"Expected 400 Bad Request, got code {f['code']}: {f['detail']}"
            assert "capacity" in f["detail"].lower() or "available" in f["detail"].lower()

        # 7. Check database state directly in PostgreSQL
        bookings_in_db = db.query(Booking).filter(
            Booking.service_id == service_id,
            Booking.time_slot_id == slot_id,
        ).all()
        assert len(bookings_in_db) == 1, f"Expected exactly 1 booking row in DB, found {len(bookings_in_db)}"

        # Re-check remaining capacity: must be exactly 0, never negative
        recheck_avail = MarketplaceService.get_service_availability(db, str(service_id))
        recheck_day = next((d for d in recheck_avail.days if d.date == target_date), None)
        recheck_slot = next((s for s in recheck_day.time_slots if s.id == slot_id), None)
        assert recheck_slot.remaining_capacity == 0, f"Expected remaining capacity 0, got {recheck_slot.remaining_capacity}"

    finally:
        # Cleanup
        if service_id:
            db.execute(text("DELETE FROM bookings WHERE service_id = :sid"), {"sid": service_id})
            db.execute(text("DELETE FROM services WHERE id = :sid"), {"sid": service_id})
        for uid in created_user_ids:
            db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
        db.commit()
        db.close()


def test_100_identical_razorpay_webhook_deliveries(pg_session_factory):
    """
    Stress Test: 100 identical Razorpay webhook deliveries for the same order delivered simultaneously.
    
    Strictly verifies:
    - Exactly 1 webhook invocation performs the state transition (state_transitioned=True).
    - 99 webhook invocations are safely treated as idempotent duplicates (state_transitioned=False).
    - In PostgreSQL, Payment status is PAID and Booking status is CONFIRMED.
    - No duplicate database mutations occur.
    """
    db = pg_session_factory()
    test_user_id = uuid.uuid4()
    test_service_id = uuid.uuid4()
    test_booking_id = uuid.uuid4()
    test_payment_id = uuid.uuid4()
    order_id = f"order_conc_{uuid.uuid4().hex[:12]}"
    payment_captured_id = f"pay_conc_{uuid.uuid4().hex[:12]}"

    try:
        # 1. Setup User, Service, Booking, and Payment
        user = User(
            id=test_user_id,
            email=f"webhook.tester.{uuid.uuid4().hex[:6]}@nammaconnect.test",
            full_name="Webhook Tester",
            role="user",
            is_active=True,
            is_verified=True,
            is_test_data=True,
        )
        service = Service(
            id=test_service_id,
            title="Webhook Concurrency Test Farm",
            slug=f"webhook-test-farm-{uuid.uuid4().hex[:6]}",
            description="Testing webhook locking",
            category="Farm Tours",
            category_slug="farm",
            location="Mandya",
            district="Mandya",
            price=500.0,
            primary_image="https://images.unsplash.com/photo-1500937386664-56d1dfef3854",
            status="PUBLISHED",
            provider_name="Mandya Host",
            is_test_data=True,
            is_synthetic=True,
        )
        booking = Booking(
            id=test_booking_id,
            booking_code=f"NC-BKG-{uuid.uuid4().hex[:5].upper()}",
            customer_id=test_user_id,
            service_id=test_service_id,
            start_date=date.today() + timedelta(days=5),
            guest_count=2,
            status="PENDING",
            unit_price=500.0,
            total_amount=1000.0,
        )
        payment = Payment(
            id=test_payment_id,
            booking_id=test_booking_id,
            customer_id=test_user_id,
            amount=1000.0,
            currency="INR",
            razorpay_order_id=order_id,
            status="PENDING",
        )
        db.add(user)
        db.add(service)
        db.add(booking)
        db.add(payment)
        db.commit()

        # 2. Build identical webhook payload
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_captured_id,
                        "order_id": order_id,
                        "status": "captured",
                        "amount": 100000,
                    }
                }
            },
        }

        def deliver_webhook(_):
            thread_db = pg_session_factory()
            try:
                res = PaymentService.handle_webhook(thread_db, payload)
                return res
            except Exception as e:
                return {"status": "error", "detail": str(e)}
            finally:
                thread_db.close()

        # 3. Launch 100 identical webhook deliveries across 50 worker threads
        with ThreadPoolExecutor(max_workers=50) as executor:
            results = list(executor.map(deliver_webhook, range(100)))

        # 4. Assert exactly 1 state transition occurred
        transitions = [r for r in results if r.get("state_transitioned") is True]
        idempotent_skips = [r for r in results if r.get("state_transitioned") is False]

        print(f"\n[100 Webhook Deliveries Result] Transitions: {len(transitions)}, Idempotent skips: {len(idempotent_skips)}")

        assert len(transitions) == 1, f"Expected exactly 1 state transition out of 100 deliveries, got {len(transitions)}"
        assert len(idempotent_skips) == 99, f"Expected exactly 99 idempotent duplicate returns, got {len(idempotent_skips)}"

        # 5. Verify PostgreSQL row states
        db_payment = db.query(Payment).filter(Payment.id == test_payment_id).one()
        assert db_payment.status == "PAID", f"Expected payment status PAID, got {db_payment.status}"
        assert db_payment.razorpay_payment_id == payment_captured_id

        db_booking = db.query(Booking).filter(Booking.id == test_booking_id).one()
        assert db_booking.status == "CONFIRMED", f"Expected booking status CONFIRMED, got {db_booking.status}"

    finally:
        # Cleanup
        db.execute(text("DELETE FROM notifications WHERE user_id = :uid"), {"uid": test_user_id})
        db.execute(text("DELETE FROM payments WHERE booking_id = :bid"), {"bid": test_booking_id})
        db.execute(text("DELETE FROM bookings WHERE id = :bid"), {"bid": test_booking_id})
        db.execute(text("DELETE FROM services WHERE id = :sid"), {"sid": test_service_id})
        db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": test_user_id})
        db.commit()
        db.close()
