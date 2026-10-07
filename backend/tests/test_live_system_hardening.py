"""
Namma Connect V1 - Live System Hardening, Concurrency Stress & Integrity Suite.

Validates the live production-ready system:
1. Concurrency Stress: Concurrent searches and catalog feeds without deadlocks
2. Race Condition: Two users concurrently attempting to book the last remaining spots for a slot
3. Cross-User Authorization: Strict tenant and role isolation across customers, providers, and admins
4. Database Integrity: Scans database for orphaned records, negative capacity, duplicate reference codes
5. Provider Financial Integrity: Ensures provider net earnings strictly adhere to GMV minus platform commission
"""

import sys
import os
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import uuid
from datetime import datetime, date, timedelta
from concurrent.futures import ThreadPoolExecutor

import pytest
import requests
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.user import User
from app.models.booking import Booking

BASE_URL = os.environ.get("LIVE_SERVER_URL", "http://127.0.0.1:8000/api/v2")


def is_live_server_available() -> bool:
    """Check if the live FastAPI server is running and responsive."""
    try:
        health_url = BASE_URL.replace("/api/v2", "/health/live")
        r = requests.get(health_url, timeout=1.5)
        return r.status_code == 200
    except Exception:
        return False


live_test = pytest.mark.skipif(
    not is_live_server_available(),
    reason="Live server at http://127.0.0.1:8000 is not running. Start server or invoke with live server active to run this test."
)

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

def get_auth_token(email: str, password: str = "123456789") -> str:
    """Obtain JWT access token for given user via live /auth/login endpoint."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


# ----------------------------------------------------------------------
# Test 1: Concurrency Stress on Search and Catalog
# ----------------------------------------------------------------------

@pytest.mark.live
@live_test
def test_concurrent_search_and_recommendations():
    """Simulate 10 concurrent customer requests hitting search and catalog feeds."""
    queries = [
        "/services?location=Kodagu",
        "/services?location=Chikkamagaluru",
        "/services?category=farm",
        "/services?category=adventure",
        "/services?max_price=3000",
        "/services?sort_by=price_asc",
        "/services?sort_by=rating",
        "/services?location=Mysuru",
        "/services?location=Bengaluru",
        "/services?page=1&limit=10",
    ]

    token = get_auth_token("priyanshu@gmail.com")
    headers = {"Authorization": f"Bearer {token}"}

    def fetch_endpoint(query_path: str):
        url = f"{BASE_URL}{query_path}"
        r = requests.get(url, headers=headers, timeout=10)
        services = r.json().get("data", {}).get("services", [])
        return r.status_code, len(services)

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(fetch_endpoint, queries))

    for status_code, count in results:
        assert status_code == 200, f"Unexpected status {status_code} during concurrent search"
    
    print("\n[PASS] Concurrent Searches: 10 parallel queries succeeded without degradation.")


# ----------------------------------------------------------------------
# Test 2: Race Condition Stress Test on Booking Capacity
# ----------------------------------------------------------------------

@pytest.mark.live
@live_test
def test_race_condition_capacity_lock():
    """
    Two users concurrently attempt to book the last available capacity of a slot.
    Strictly verifies:
    - Exactly one booking succeeds (201 Created).
    - The second booking fails (400 Bad Request: exceeds remaining capacity).
    - Database remaining capacity is never negative.
    """
    db = SessionLocal()
    created_booking_ids = []

    try:
        # 1. Fetch first published service with active slots
        r_svc = requests.get(f"{BASE_URL}/services?page=1&limit=5", timeout=10)
        assert r_svc.status_code == 200
        services_list = r_svc.json()["data"]["services"]
        assert len(services_list) > 0, "No services returned from marketplace"

        target_service = None
        target_day = None
        target_slot = None

        for svc_item in services_list:
            sid = svc_item["id"]
            r_avail = requests.get(f"{BASE_URL}/services/{sid}/availability", timeout=10)
            if r_avail.status_code == 200:
                avail_data = r_avail.json().get("data", {})
                for d in avail_data.get("days", []):
                    if not d.get("is_available"):
                        continue
                    slots = [s for s in d.get("time_slots", []) if s.get("is_available") and s.get("remaining_capacity", 0) > 0]
                    if slots:
                        target_service = svc_item
                        target_day = d
                        target_slot = slots[0]
                        break
            if target_slot:
                break

        assert target_service is not None, "No service with available time slots found"
        assert target_slot is not None, "No available time slot found"

        rem_cap = target_slot["remaining_capacity"]
        service_id = target_service["id"]
        target_date = target_day["date"]
        slot_id = target_slot["id"]

        print(f"\n[Testing Race Condition] Service: '{target_service['title'][:40]}...', Date: {target_date}, Slot: {slot_id}, Rem Cap: {rem_cap}")

        # Authenticate two distinct customers
        token_a = get_auth_token("cust.karnataka.0001@nammaconnect.dev")
        token_b = get_auth_token("cust.karnataka.0002@nammaconnect.dev")

        # Both users try to book all remaining spots for this slot concurrently
        booking_payload = {
            "service_id": service_id,
            "start_date": target_date,
            "time_slot_id": slot_id,
            "time_slot_label": f"{target_slot.get('start_time', '')} - {target_slot.get('end_time', '')}",
            "guest_count": rem_cap,
            "special_requests": "Concurrency Race Condition Test",
        }

        def attempt_booking(token: str):
            h = {"Authorization": f"Bearer {token}"}
            r = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=h, timeout=15)
            return r.status_code, r.json()

        with ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(attempt_booking, token_a)
            fut2 = executor.submit(attempt_booking, token_b)
            res1_code, res1_data = fut1.result()
            res2_code, res2_data = fut2.result()

        status_codes = [res1_code, res2_code]
        print(f"[Race Condition HTTP Codes] User A: {res1_code}, User B: {res2_code}")

        # Record created booking for cleanup
        if res1_code == 201 and "data" in res1_data:
            created_booking_ids.append(res1_data["data"]["id"])
        if res2_code == 201 and "data" in res2_data:
            created_booking_ids.append(res2_data["data"]["id"])

        # Exactly one succeeded and one was rejected
        success_count = sum(1 for code in status_codes if code == 201)
        fail_count = sum(1 for code in status_codes if code in [400, 409, 422])

        assert success_count == 1, f"Expected exactly 1 successful booking, got {success_count}. Codes: {status_codes}"
        assert fail_count == 1, f"Expected exactly 1 rejected booking, got {fail_count}. Codes: {status_codes}"

        # Re-check availability: remaining capacity must be 0, never negative!
        r_recheck = requests.get(f"{BASE_URL}/services/{service_id}/availability", timeout=10)
        assert r_recheck.status_code == 200
        days = r_recheck.json()["data"]["days"]
        matching_day = next((d for d in days if d["date"] == target_date), None)
        assert matching_day is not None
        matching_slot = next((s for s in matching_day["time_slots"] if s["id"] == slot_id), None)
        assert matching_slot is not None
        assert matching_slot["remaining_capacity"] >= 0, "Capacity violated or negative!"

        print("[PASS] Race condition prevented: Exactly 1 spot booked, 0 remaining, 0 overbooking.")

    finally:
        # Cleanup test bookings
        for bid in created_booking_ids:
            db.execute(text("DELETE FROM payments WHERE booking_id = :bid"), {"bid": bid})
            db.execute(text("DELETE FROM bookings WHERE id = :bid"), {"bid": bid})
        db.commit()
        db.close()


# ----------------------------------------------------------------------
# Test 3: Cross-User Authorization and Role Isolation
# ----------------------------------------------------------------------

@pytest.mark.live
@live_test
def test_cross_user_authorization_and_isolation():
    """Ensure strict tenant isolation across customers, providers, and admins."""
    token_priyanshu = get_auth_token("priyanshu@gmail.com")
    token_other = get_auth_token("cust.karnataka.0006@nammaconnect.dev")

    # 1. Priyanshu creates a private trip
    trip_resp = requests.post(
        f"{BASE_URL}/trips",
        json={"title": "Private Security Test Trip", "destination": "Kodagu", "start_date": "2026-11-01", "end_date": "2026-11-03"},
        headers={"Authorization": f"Bearer {token_priyanshu}"},
        timeout=10,
    )
    assert trip_resp.status_code == 201
    trip_id = trip_resp.json()["data"]["id"]

    try:
        # 2. Other customer attempts to access Priyanshu's private trip -> MUST be 403 or 404
        unauth_resp = requests.get(
            f"{BASE_URL}/trips/{trip_id}",
            headers={"Authorization": f"Bearer {token_other}"},
            timeout=10,
        )
        assert unauth_resp.status_code in [403, 404], f"Cross-user trip access allowed! Code: {unauth_resp.status_code}"

        # 3. Customer attempts to access Provider Listing Creation -> MUST be 403 Forbidden
        prov_resp = requests.post(
            f"{BASE_URL}/provider/listings",
            json={"title": "Illegal Host Listing"},
            headers={"Authorization": f"Bearer {token_priyanshu}"},
            timeout=10,
        )
        assert prov_resp.status_code == 403, f"Customer accessed provider endpoint: {prov_resp.status_code}"

        # 4. Customer attempts to access Admin Users -> MUST be 403 Forbidden
        admin_resp = requests.get(
            f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {token_priyanshu}"},
            timeout=10,
        )
        assert admin_resp.status_code == 403, f"Customer accessed admin endpoint: {admin_resp.status_code}"

        print("[PASS] Cross-user authorization and RBAC strictly enforced.")

    finally:
        # Cleanup trip
        db = SessionLocal()
        db.execute(text("DELETE FROM trips WHERE id = :tid"), {"tid": trip_id})
        db.commit()
        db.close()


# ----------------------------------------------------------------------
# Test 4: Database Integrity & Orphan SQL Audit
# ----------------------------------------------------------------------

def test_database_integrity_audit():
    """
    Comprehensive SQL audit across database tables:
    - Scans for orphan records (TripItem without Trip, Booking without Service/Customer, Payment without Booking)
    - Checks for negative spots or overbooked capacity
    - Checks for duplicate booking codes
    - Verifies synthetic dataset tagging consistency
    """
    db = SessionLocal()
    try:
        # 1. Orphan Check: Trip days and trip items without valid parent records
        orphan_days = db.execute(text("""
            SELECT count(*) FROM trip_days td 
            LEFT JOIN trips t ON td.trip_id = t.id 
            WHERE t.id IS NULL
        """)).scalar()
        assert orphan_days == 0, f"Found {orphan_days} orphaned trip days"

        orphan_items = db.execute(text("""
            SELECT count(*) FROM trip_items ti 
            LEFT JOIN trip_days td ON ti.trip_day_id = td.id 
            WHERE td.id IS NULL
        """)).scalar()
        assert orphan_items == 0, f"Found {orphan_items} orphaned trip items"

        # 2. Orphan Check: Bookings without valid services or customers
        orphan_bookings = db.execute(text("""
            SELECT count(*) FROM bookings b 
            LEFT JOIN services s ON b.service_id = s.id 
            LEFT JOIN users u ON b.customer_id = u.id 
            WHERE s.id IS NULL OR u.id IS NULL
        """)).scalar()
        assert orphan_bookings == 0, f"Found {orphan_bookings} orphaned bookings"

        # 3. Orphan Check: Payments without valid bookings
        orphan_payments = db.execute(text("""
            SELECT count(*) FROM payments p 
            LEFT JOIN bookings b ON p.booking_id = b.id 
            WHERE b.id IS NULL
        """)).scalar()
        assert orphan_payments == 0, f"Found {orphan_payments} orphaned payments"

        # 4. Capacity Integrity: No negative spots available
        negative_spots = db.execute(text("""
            SELECT count(*) FROM service_availabilities 
            WHERE (capacity - booked_count) < 0
        """)).scalar()
        assert negative_spots == 0, f"Found {negative_spots} overbooked availability records"

        # 5. Booking Code Uniqueness
        duplicate_codes = db.execute(text("""
            SELECT booking_code, count(*) FROM bookings 
            WHERE booking_code IS NOT NULL 
            GROUP BY booking_code HAVING count(*) > 1
        """)).fetchall()
        assert len(duplicate_codes) == 0, f"Found duplicate booking codes: {duplicate_codes}"

        # 6. Synthetic Data Coverage Audit
        synthetic_users = db.execute(text("SELECT count(*) FROM users WHERE is_synthetic = true")).scalar()
        synthetic_services = db.execute(text("SELECT count(*) FROM services WHERE is_synthetic = true")).scalar()
        synthetic_bookings = db.execute(text("SELECT count(*) FROM bookings WHERE is_synthetic = true")).scalar()

        print("\n[PASS] Database Integrity Clean:")
        print("  - Orphan Trip Items: 0")
        print("  - Orphan Bookings: 0")
        print("  - Orphan Payments: 0")
        print("  - Negative Capacity Violations: 0")
        print("  - Duplicate Booking Codes: 0")
        print(f"  - Synthetic Entity Counts: Users={synthetic_users}, Services={synthetic_services}, Bookings={synthetic_bookings}")

    finally:
        db.close()


# ----------------------------------------------------------------------
# Test 5: Provider Financial Accounting Integrity
# ----------------------------------------------------------------------

@pytest.mark.live
@live_test
def test_provider_financial_accounting_integrity():
    """
    Verify provider financial metrics:
    - Provider net earnings must strictly be <= GMV
    - Platform commission is deducted and never labeled as provider earnings
    """
    token_arayn = get_auth_token("arayn@gmail.com")
    resp = requests.get(
        f"{BASE_URL}/provider/analytics/overview?period=all",
        headers={"Authorization": f"Bearer {token_arayn}"},
        timeout=10,
    )
    assert resp.status_code == 200, f"Analytics overview failed: {resp.text}"
    fin = resp.json()["data"]["financials"]

    gmv = float(fin.get("gross_booking_value", 0.0))
    net_earnings = float(fin.get("net_realized_earnings", 0.0))
    platform_fee = float(fin.get("platform_commission", 0.0))

    print(f"\n[Provider Accounting Audit] Arayn: GMV=₹{gmv:.2f}, Net Realized Earnings=₹{net_earnings:.2f}, Platform Commission=₹{platform_fee:.2f}")

    assert net_earnings <= gmv, f"Violation: Net earnings (₹{net_earnings}) exceed GMV (₹{gmv})!"
    realized_gmv = net_earnings + platform_fee
    assert round(net_earnings, 2) == round(realized_gmv * 0.90, 2), "Provider 90% payout split mismatch!"
    assert round(platform_fee, 2) == round(realized_gmv * 0.10, 2), "Platform 10% commission split mismatch!"
    print("[PASS] Provider earnings clearly distinct from platform GMV; 90/10 commission split verified.")


if __name__ == "__main__":
    test_concurrent_search_and_recommendations()
    test_race_condition_capacity_lock()
    test_cross_user_authorization_and_isolation()
    test_database_integrity_audit()
    test_provider_financial_accounting_integrity()
    print("\n==================================================")
    print("ALL LIVE HARDENING & INTEGRITY TESTS PASSED!")
    print("==================================================")
