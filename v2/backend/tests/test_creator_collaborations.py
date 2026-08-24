"""Integration tests for Creator Discovery, Studio Profile, and Collaboration Lifecycle."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_creator(client: TestClient) -> dict:
    """Create test creator user."""
    user_payload = {
        "email": "priya.storyteller@example.com",
        "password": "SecurePassword123!",
        "full_name": "Priya Storyteller",
        "role": "creator",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_host(client: TestClient) -> dict:
    """Create test host/partner user."""
    user_payload = {
        "email": "host.organics@example.com",
        "password": "SecurePassword123!",
        "full_name": "Kodagu Organics Host",
        "role": "partner",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_intruder(client: TestClient) -> dict:
    """Create independent traveler user."""
    user_payload = {
        "email": "intruder.user@example.com",
        "password": "SecurePassword123!",
        "full_name": "Intruder User",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_public_creator_discovery(client: TestClient):
    """Verify public creator listing and detail endpoints."""
    resp = client.get("/api/v2/creators")
    assert resp.status_code == 200
    creators = resp.json()["data"]
    assert len(creators) > 0
    first_creator = creators[0]
    assert "display_name" in first_creator
    assert "handle" in first_creator
    assert "specialties" in first_creator

    # Detail view
    det_resp = client.get(f"/api/v2/creators/{first_creator['id']}")
    assert det_resp.status_code == 200
    assert det_resp.json()["data"]["handle"] == first_creator["handle"]


def test_creator_studio_profile_and_media_management(
    client: TestClient,
    auth_headers_creator: dict,
):
    """Verify creator can view/update profile, upload portfolio items, and configure packages."""
    # 1. Fetch own profile
    prof_resp = client.get("/api/v2/creators/me/profile", headers=auth_headers_creator)
    assert prof_resp.status_code == 200
    prof = prof_resp.json()["data"]
    assert prof["display_name"] == "Priya Storyteller"

    # 2. Update profile details
    update_resp = client.put(
        "/api/v2/creators/me/profile",
        headers=auth_headers_creator,
        json={
            "bio": "Top rural storyteller & documentary director in Karnataka.",
            "starting_rate": 18000.0,
            "specialties": ["4K Drone Reels", "Farm Gastronomy"],
        },
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["starting_rate"] == 18000.0

    # 3. Add portfolio item
    port_resp = client.post(
        "/api/v2/creators/me/portfolio",
        headers=auth_headers_creator,
        json={
            "title": "Biligiriranga Hills Organic Coffee Harvest",
            "location": "BR Hills, Karnataka",
            "imageUrl": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
            "category": "Cinematography",
        },
    )
    assert port_resp.status_code == 200
    portfolio_items = port_resp.json()["data"]["portfolio_items"]
    assert any(p["title"] == "Biligiriranga Hills Organic Coffee Harvest" for p in portfolio_items)

    # 4. Add service package
    pkg_resp = client.post(
        "/api/v2/creators/me/packages",
        headers=auth_headers_creator,
        json={
            "title": "Full Organic Estate Visual Transformation",
            "price": 25000.0,
            "deliverables": ["3x 4K Reels", "20x High-Res Retouched Images", "Licensed Audio Track"],
            "turnaround": "4 Business Days",
        },
    )
    assert pkg_resp.status_code == 200
    packages = pkg_resp.json()["data"]["packages"]
    assert any(p["title"] == "Full Organic Estate Visual Transformation" for p in packages)


def test_collaboration_proposal_lifecycle_and_authorization(
    client: TestClient,
    auth_headers_creator: dict,
    auth_headers_host: dict,
    auth_headers_intruder: dict,
):
    """Verify proposal submission, authorization, creator acceptance, and completion."""
    # 1. Get creator profile id
    prof_resp = client.get("/api/v2/creators/me/profile", headers=auth_headers_creator)
    creator_id = prof_resp.json()["data"]["id"]

    # 2. Host submits collaboration proposal
    prop_payload = {
        "creator_id": creator_id,
        "campaign_title": "Arabica Blossom Spring Campaign",
        "message": "We would love to sponsor a 3-day harvest shoot during the spring bloom.",
        "proposed_dates": "Oct 15 - Oct 18, 2026",
        "budget": 22000.0,
        "deliverables": ["2x 4K Reels", "15x Stills"],
    }
    create_collab_resp = client.post(
        "/api/v2/collaborations",
        headers=auth_headers_host,
        json=prop_payload,
    )
    assert create_collab_resp.status_code == 201
    collab = create_collab_resp.json()["data"]
    collab_id = collab["id"]
    assert collab["status"] == "PENDING"
    assert collab["partner_name"] == "Kodagu Organics Host"
    assert collab["creator_name"] == "Priya Storyteller"

    # 3. Intruder cannot accept or reject proposal (403 Forbidden)
    intruder_accept = client.post(
        f"/api/v2/collaborations/{collab_id}/accept",
        headers=auth_headers_intruder,
    )
    assert intruder_accept.status_code == 403

    # 4. Host checks their collaboration inquiries list
    host_list_resp = client.get("/api/v2/collaborations/me", headers=auth_headers_host)
    assert host_list_resp.status_code == 200
    assert any(c["id"] == collab_id for c in host_list_resp.json()["data"])

    # 5. Creator accepts proposal
    creator_accept = client.post(
        f"/api/v2/collaborations/{collab_id}/accept",
        headers=auth_headers_creator,
    )
    assert creator_accept.status_code == 200
    assert creator_accept.json()["data"]["status"] == "ACCEPTED"

    # 6. Cannot accept again (invalid state transition)
    second_accept = client.post(
        f"/api/v2/collaborations/{collab_id}/accept",
        headers=auth_headers_creator,
    )
    assert second_accept.status_code == 400

    # 7. Complete collaboration
    complete_resp = client.post(
        f"/api/v2/collaborations/{collab_id}/complete",
        headers=auth_headers_creator,
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["data"]["status"] == "COMPLETED"


def test_duplicate_collaboration_prevention_and_rejection_flow(
    client: TestClient,
    auth_headers_creator: dict,
    auth_headers_host: dict,
):
    """Verify duplicate active proposals return 409 and rejection flow works."""
    prof_resp = client.get("/api/v2/creators/me/profile", headers=auth_headers_creator)
    creator_id = prof_resp.json()["data"]["id"]

    payload = {
        "creator_id": creator_id,
        "campaign_title": "Monsoon Coffee Pod Showcase",
        "message": "Capture the monsoon downpour over coffee pods.",
        "proposed_dates": "Nov 01 - Nov 04, 2026",
        "budget": 16000.0,
        "deliverables": ["1x 4K Reel"],
    }

    # First proposal succeeds
    resp1 = client.post("/api/v2/collaborations", headers=auth_headers_host, json=payload)
    assert resp1.status_code == 201
    collab_id = resp1.json()["data"]["id"]

    # Second active proposal with identical campaign title returns 409 Conflict
    resp2 = client.post("/api/v2/collaborations", headers=auth_headers_host, json=payload)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"]

    # Creator declines the first proposal
    reject_resp = client.post(f"/api/v2/collaborations/{collab_id}/reject", headers=auth_headers_creator)
    assert reject_resp.status_code == 200
    assert reject_resp.json()["data"]["status"] == "REJECTED"


def test_admin_collaborations_oversight(
    client: TestClient,
    auth_headers_creator: dict,
    auth_headers_host: dict,
):
    """Verify admin can inspect all platform collaborations."""
    # Create admin user
    admin_payload = {
        "email": "collab.admin@nammaconnect.in",
        "password": "AdminSecurePassword123!",
        "full_name": "Collab Governance Admin",
        "role": "admin",
    }
    reg_resp = client.post("/api/v2/auth/register", json=admin_payload)
    if reg_resp.status_code == 201:
        admin_token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": admin_payload["email"], "password": admin_payload["password"]})
        admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch admin collaborations list
    admin_collab_resp = client.get("/api/v2/admin/collaborations", headers=admin_headers)
    assert admin_collab_resp.status_code == 200
    collabs = admin_collab_resp.json()["data"]
    assert isinstance(collabs, list)
    assert len(collabs) > 0
