"""Comprehensive Integration Tests for Service Listing Moderation and Provider Enforcement (Step 4)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.service import Service
from app.models.notification import Notification


@pytest.fixture
def auth_headers_admin(client: TestClient, db_session: Session) -> dict:
    """Create test admin user."""
    user_payload = {
        "email": "admin.step4@example.com",
        "password": "SecurePassword123!",
        "full_name": "Admin Step4",
        "role": "admin",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]

    user = db_session.query(User).filter(User.email == user_payload["email"]).first()
    if user:
        user.role = "admin"
        user.is_verified = True
        user.is_active = True
        db_session.commit()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_verified_partner(client: TestClient, db_session: Session) -> dict:
    """Create verified test partner."""
    user_payload = {
        "email": "partner.verified@example.com",
        "password": "SecurePassword123!",
        "full_name": "Verified Host",
        "role": "partner",
    }
    user = db_session.query(User).filter(User.email == user_payload["email"]).first()
    if user:
        user.is_active = True
        user.is_verified = True
        user.role = "partner"
        db_session.commit()

    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]

    user = db_session.query(User).filter(User.email == user_payload["email"]).first()
    if user:
        user.role = "partner"
        user.is_verified = True
        user.is_active = True
        db_session.commit()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_unverified_partner(client: TestClient, db_session: Session) -> dict:
    """Create unverified test partner."""
    user_payload = {
        "email": "partner.unverified@example.com",
        "password": "SecurePassword123!",
        "full_name": "Unverified Host",
        "role": "partner",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]

    user = db_session.query(User).filter(User.email == user_payload["email"]).first()
    if user:
        user.role = "partner"
        user.is_verified = False
        user.is_active = True
        db_session.commit()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_customer(client: TestClient) -> dict:
    """Create regular customer."""
    user_payload = {
        "email": "customer.step4@example.com",
        "password": "SecurePassword123!",
        "full_name": "Customer User",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────
# 27 Requirements Verification Test Cases
# ─────────────────────────────────────────────────────────────

def test_01_new_service_starts_pending(client: TestClient, auth_headers_verified_partner: dict):
    """1. New service starts with status PENDING."""
    payload = {
        "title": "Chikmagalur Coffee Blossom Stay",
        "description": "Stay amidst blooming coffee trees in Mullayanagiri hills.",
        "category": "Stay",
        "location": "Chikmagalur, Karnataka",
        "price": 3500.0,
    }
    resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    assert resp.status_code in [200, 201]
    data = resp.json()["data"]
    assert data["status"] == "PENDING"


def test_02_pending_service_appears_in_admin_queue(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict
):
    """2. Pending service appears in admin moderation queue."""
    payload = {
        "title": "Kabini Wildlife River Boat Safari",
        "description": "Coracle boat safari along the Kabini river backwaters.",
        "category": "Experiences",
        "location": "HD Kote, Mysore",
        "price": 1800.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    admin_resp = client.get("/api/v2/admin/services?status=PENDING", headers=auth_headers_admin)
    assert admin_resp.status_code == 200
    services = admin_resp.json()["data"]
    assert any(s["id"] == service_id for s in services)


def test_03_admin_can_view_service_details(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict
):
    """3. Admin can view complete service details."""
    payload = {
        "title": "Gokarna Cliffside Yoga Retreat",
        "description": "Sunrise meditation and coastal yoga sessions.",
        "category": "Experiences",
        "location": "Gokarna, Uttara Kannada",
        "price": 1200.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    detail_resp = client.get(f"/api/v2/admin/services/{service_id}", headers=auth_headers_admin)
    assert detail_resp.status_code == 200
    data = detail_resp.json()["data"]
    assert data["id"] == service_id
    assert data["title"] == "Gokarna Cliffside Yoga Retreat"
    assert data["provider_name"] == "Verified Host"


def test_04_06_07_verified_provider_service_approved_and_notified(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict, db_session: Session
):
    """4, 6, 7. Verified provider service can be approved -> status PUBLISHED -> creates provider notification."""
    payload = {
        "title": "Hampi Heritage Cycling Expedition",
        "description": "Guided cycling tour among the boulders and Vijayanagara monuments.",
        "category": "Guides & Tours",
        "location": "Hampi, Vijayanagara",
        "price": 950.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    # Approve
    approve_resp = client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_admin)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["data"]["status"] == "PUBLISHED"
    assert approve_resp.json()["data"]["reviewed_by"] is not None

    # Check notification created for provider
    provider = db_session.query(User).filter(User.email == "partner.verified@example.com").first()
    notifs = db_session.query(Notification).filter(Notification.user_id == provider.id).all()
    assert any("approved" in n.title.lower() or "approved" in n.message.lower() for n in notifs)


def test_05_unverified_provider_cannot_be_approved(
    client: TestClient, auth_headers_unverified_partner: dict, auth_headers_admin: dict
):
    """5. Unverified provider service cannot be approved (400 Bad Request)."""
    payload = {
        "title": "Unverified Host Honey Harvesting",
        "description": "Wild honey collection in dense forest canopy.",
        "category": "Experiences",
        "location": "Sirsi, Uttara Kannada",
        "price": 2500.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_unverified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    approve_resp = client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_admin)
    assert approve_resp.status_code == 400
    assert "unverified" in approve_resp.json()["detail"].lower() or "suspended" in approve_resp.json()["detail"].lower()


def test_08_09_10_admin_rejection_requires_reason_and_notifies(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict, db_session: Session
):
    """8, 9, 10. Admin rejection requires reason -> status REJECTED -> provider notification created."""
    payload = {
        "title": "Suspicious Unsafe Mountain Climb",
        "description": "Unlicensed steep cliff climbing without safety gear.",
        "category": "Experiences",
        "location": "Savandurga, Ramanagara",
        "price": 500.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    # Reject without reason should fail (422 or 400)
    empty_reject = client.post(f"/api/v2/admin/services/{service_id}/reject", headers=auth_headers_admin, json={"rejection_reason": ""})
    assert empty_reject.status_code in [400, 422]

    # Reject with valid reason
    reason_text = "Missing mandatory safety gear certification and hazard insurance."
    reject_resp = client.post(
        f"/api/v2/admin/services/{service_id}/reject",
        headers=auth_headers_admin,
        json={"rejection_reason": reason_text},
    )
    assert reject_resp.status_code == 200
    data = reject_resp.json()["data"]
    assert data["status"] == "REJECTED"
    assert data["rejection_reason"] == reason_text

    # Provider notification
    provider = db_session.query(User).filter(User.email == "partner.verified@example.com").first()
    notifs = db_session.query(Notification).filter(Notification.user_id == provider.id).all()
    assert any("rejected" in n.title.lower() or reason_text in n.message for n in notifs)


def test_11_rejected_service_cannot_be_approved_directly(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict
):
    """11. Rejected service cannot be approved directly without resubmission."""
    payload = {
        "title": "Flawed Listing Draft",
        "description": "Missing description details.",
        "category": "Stay",
        "location": "Dandeli, Karnataka",
        "price": 2000.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    # Reject first
    client.post(
        f"/api/v2/admin/services/{service_id}/reject",
        headers=auth_headers_admin,
        json={"rejection_reason": "Incomplete details"},
    )

    # Attempt direct approval -> must fail (400)
    approve_resp = client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_admin)
    assert approve_resp.status_code == 400


def test_12_published_service_cannot_be_approved_again(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict
):
    """12. Published service cannot be approved again."""
    payload = {
        "title": "Agumbe Rainforest Trek",
        "description": "King cobra sanctuary canopy trek.",
        "category": "Experiences",
        "location": "Agumbe, Shimoga",
        "price": 1500.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    # Approve once
    client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_admin)

    # Duplicate approve -> 400
    dup_resp = client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_admin)
    assert dup_resp.status_code == 400


def test_13_14_15_published_service_removal_workflow(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict
):
    """13, 14, 15. Published service can be removed with reason -> removed service hidden from marketplace."""
    payload = {
        "title": "Bandipur Night Jungle Safari",
        "description": "Late night wildlife expedition.",
        "category": "Experiences",
        "location": "Bandipur, Chamarajanagar",
        "price": 3000.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]

    # Publish
    client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_admin)

    # Removal without reason fails
    empty_rem = client.post(f"/api/v2/admin/services/{service_id}/remove", headers=auth_headers_admin, json={"removal_reason": ""})
    assert empty_rem.status_code in [400, 422]

    # Remove with valid reason
    rem_resp = client.post(
        f"/api/v2/admin/services/{service_id}/remove",
        headers=auth_headers_admin,
        json={"removal_reason": "Night safaris in core reserve are restricted by forest department."},
    )
    assert rem_resp.status_code == 200
    assert rem_resp.json()["data"]["status"] == "REMOVED"

    # Marketplace verify: NOT in public catalog
    cat_resp = client.get("/api/v2/services")
    ids = [s["id"] for s in cat_resp.json()["data"]["services"]]
    assert service_id not in ids

    # Public detail returns 404
    detail_resp = client.get(f"/api/v2/services/{service_id}")
    assert detail_resp.status_code == 404


def test_16_17_18_19_provider_block_workflow(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict, db_session: Session
):
    """16, 17, 18, 19. Provider can be blocked -> removes active services -> cannot create services -> receives notification."""
    # 1. Partner creates and publishes a service
    payload = {
        "title": "Malnad Coffee Estate Villa",
        "description": "Heritage bungalow stay.",
        "category": "Stay",
        "location": "Mudigere, Chikmagalur",
        "price": 5000.0,
    }
    create_resp = client.post("/api/v2/services", headers=auth_headers_verified_partner, json=payload)
    service_id = create_resp.json()["data"]["id"]
    client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_admin)

    provider = db_session.query(User).filter(User.email == "partner.verified@example.com").first()
    provider_id = str(provider.id)

    # 2. Block Provider
    block_resp = client.post(
        f"/api/v2/admin/providers/{provider_id}/block",
        headers=auth_headers_admin,
        json={"reason": "Fraudulent host identity and fake property photos."},
    )
    assert block_resp.status_code == 200
    assert block_resp.json()["data"]["is_active"] is False

    # 3. All provider's services are REMOVED from marketplace
    serv = db_session.query(Service).filter(Service.id == service_id).first()
    assert serv.status == "REMOVED"

    cat_resp = client.get("/api/v2/services")
    ids = [s["id"] for s in cat_resp.json()["data"]["services"]]
    assert service_id not in ids

    # 4. Blocked provider cannot create new services (401 or 403)
    new_create = client.post(
        "/api/v2/services",
        headers=auth_headers_verified_partner,
        json={
            "title": "Blocked Host Attempt",
            "description": "Should be blocked.",
            "category": "Stay",
            "location": "Coorg",
            "price": 1000.0,
        },
    )
    assert new_create.status_code in [401, 403]

    # 5. Blocked provider receives notification
    notifs = db_session.query(Notification).filter(Notification.user_id == provider.id).all()
    assert any("suspended" in n.title.lower() or "suspended" in n.message.lower() for n in notifs)


def test_20_21_22_23_non_admin_cannot_perform_moderation(
    client: TestClient, auth_headers_customer: dict, auth_headers_verified_partner: dict
):
    """20, 21, 22, 23. Non-admin customer cannot approve, reject, remove, or block provider."""
    # Create service as partner
    create_resp = client.post(
        "/api/v2/services",
        headers=auth_headers_verified_partner,
        json={"title": "Test Security Service", "description": "Desc", "category": "Stay", "location": "Loc", "price": 100.0},
    )
    service_id = create_resp.json()["data"]["id"]

    # Customer tries to approve -> 403
    assert client.post(f"/api/v2/admin/services/{service_id}/approve", headers=auth_headers_customer).status_code == 403

    # Customer tries to reject -> 403
    assert client.post(
        f"/api/v2/admin/services/{service_id}/reject",
        headers=auth_headers_customer,
        json={"rejection_reason": "Hack"},
    ).status_code == 403

    # Customer tries to remove -> 403
    assert client.post(
        f"/api/v2/admin/services/{service_id}/remove",
        headers=auth_headers_customer,
        json={"removal_reason": "Hack"},
    ).status_code == 403

    # Customer tries to block provider -> 403
    assert client.post(
        "/api/v2/admin/providers/any-id/block",
        headers=auth_headers_customer,
        json={"reason": "Hack"},
    ).status_code == 403


def test_24_25_26_27_marketplace_query_safety(
    client: TestClient, auth_headers_verified_partner: dict, auth_headers_admin: dict
):
    """24, 25, 26, 27. Marketplace never returns pending, rejected, removed, or blocked provider services."""
    # Create 3 services: 1 pending, 1 rejected, 1 removed
    p_resp = client.post(
        "/api/v2/services",
        headers=auth_headers_verified_partner,
        json={"title": "Pending Safety Service", "description": "Desc", "category": "Stay", "location": "Loc", "price": 100.0},
    )
    pending_id = p_resp.json()["data"]["id"]

    rej_resp = client.post(
        "/api/v2/services",
        headers=auth_headers_verified_partner,
        json={"title": "Rejected Safety Service", "description": "Desc", "category": "Stay", "location": "Loc", "price": 100.0},
    )
    rej_id = rej_resp.json()["data"]["id"]
    client.post(f"/api/v2/admin/services/{rej_id}/reject", headers=auth_headers_admin, json={"rejection_reason": "Reject"})

    rem_resp = client.post(
        "/api/v2/services",
        headers=auth_headers_verified_partner,
        json={"title": "Removed Safety Service", "description": "Desc", "category": "Stay", "location": "Loc", "price": 100.0},
    )
    rem_id = rem_resp.json()["data"]["id"]
    client.post(f"/api/v2/admin/services/{rem_id}/approve", headers=auth_headers_admin)
    client.post(f"/api/v2/admin/services/{rem_id}/remove", headers=auth_headers_admin, json={"removal_reason": "Removed"})

    # Public listing check
    pub_list = client.get("/api/v2/services").json()["data"]["services"]
    pub_ids = [s["id"] for s in pub_list]
    assert pending_id not in pub_ids
    assert rej_id not in pub_ids
    assert rem_id not in pub_ids

    # Filtered location query check
    query_resp = client.get("/api/v2/services?location=Loc").json()["data"]["services"]
    query_ids = [s["id"] for s in query_resp]
    assert pending_id not in query_ids
    assert rej_id not in query_ids
    assert rem_id not in query_ids
