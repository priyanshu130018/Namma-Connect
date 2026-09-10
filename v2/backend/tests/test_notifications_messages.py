"""Integration tests for Notifications and Messaging Systems."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers_user1(client: TestClient) -> dict:
    """Create test customer user 1."""
    user_payload = {
        "email": "traveler.user1@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler One",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_user2(client: TestClient) -> dict:
    """Create test customer user 2."""
    user_payload = {
        "email": "traveler.user2@example.com",
        "password": "SecurePassword123!",
        "full_name": "Traveler Two",
        "role": "customer",
    }
    reg_resp = client.post("/api/v2/auth/register", json=user_payload)
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/api/v2/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_notifications_unauthenticated_fails(client: TestClient):
    """Unauthenticated requests to notifications must be rejected."""
    resp = client.get("/api/v2/notifications")
    assert resp.status_code == 401


def test_notifications_workflow_and_isolation(
    client: TestClient,
    auth_headers_user1: dict,
    auth_headers_user2: dict,
):
    """Test notification list, mark read, mark all read, and user isolation."""
    # 1. Fetch user1 notifications
    resp1 = client.get("/api/v2/notifications", headers=auth_headers_user1)
    assert resp1.status_code == 200
    data1 = resp1.json()["data"]
    notifs1 = data1["notifications"]
    unread1 = data1["unread_count"]
    assert len(notifs1) >= 1
    assert unread1 >= 1


    first_notif = notifs1[0]
    notif_id = first_notif["id"]

    # 2. User 2 cannot mark User 1's notification as read (404 isolation)
    intruder_resp = client.post(f"/api/v2/notifications/{notif_id}/read", headers=auth_headers_user2)
    assert intruder_resp.status_code == 404

    # 3. User 1 marks their own notification as read
    mark_resp = client.post(f"/api/v2/notifications/{notif_id}/read", headers=auth_headers_user1)
    assert mark_resp.status_code == 200
    assert mark_resp.json()["data"]["is_read"] is True

    # 4. Mark all read
    mark_all_resp = client.post("/api/v2/notifications/read-all", headers=auth_headers_user1)
    assert mark_all_resp.status_code == 200

    # 5. Check unread count is 0
    refreshed_resp = client.get("/api/v2/notifications", headers=auth_headers_user1)
    assert refreshed_resp.json()["data"]["unread_count"] == 0


def test_messages_workflow_and_cross_user_security(
    client: TestClient,
    auth_headers_user1: dict,
    auth_headers_user2: dict,
):
    """Test conversation retrieval, thread loading, message sending, and authorization."""
    # 1. User 1 fetches conversations
    convs_resp = client.get("/api/v2/messages/conversations", headers=auth_headers_user1)
    assert convs_resp.status_code == 200
    convs = convs_resp.json()["data"]
    assert len(convs) >= 1
    conv_id = convs[0]["id"]

    # 2. User 2 cannot read User 1's conversation (403 Forbidden)
    intruder_thread = client.get(f"/api/v2/messages/conversations/{conv_id}", headers=auth_headers_user2)
    assert intruder_thread.status_code == 403

    # 3. User 1 reads conversation thread (marks messages read)
    thread_resp = client.get(f"/api/v2/messages/conversations/{conv_id}", headers=auth_headers_user1)
    assert thread_resp.status_code == 200
    thread_data = thread_resp.json()["data"]
    assert len(thread_data["messages"]) >= 2
    assert thread_data["conversation"]["unread_count"] == 0

    # 4. User 1 sends a message
    send_payload = {
        "conversation_id": conv_id,
        "content": "Looking forward to arriving around 4:00 PM on Friday!",
    }
    send_resp = client.post("/api/v2/messages/send", headers=auth_headers_user1, json=send_payload)
    assert send_resp.status_code == 201
    new_msg = send_resp.json()["data"]
    assert new_msg["content"] == send_payload["content"]
    assert new_msg["sender_name"] == "Traveler One"

    # 5. Verify thread includes new message
    thread_resp2 = client.get(f"/api/v2/messages/conversations/{conv_id}", headers=auth_headers_user1)
    messages = thread_resp2.json()["data"]["messages"]
    assert any(m["content"] == send_payload["content"] for m in messages)


def test_direct_provider_messaging_flow(
    client: TestClient,
    auth_headers_user1: dict,
    auth_headers_user2: dict,
):
    """Test customer initiating direct message to provider via recipient_id and provider reply."""
    # Register an authentic host provider
    host_payload = {
        "email": "coorg.coffee.host@example.com",
        "password": "SecurePassword123!",
        "full_name": "Kavitha Gowda (Coorg Estate)",
        "role": "partner",
    }
    reg = client.post("/api/v2/auth/register", json=host_payload)

    if reg.status_code == 201:
        host_token = reg.json()["access_token"]
    else:
        login = client.post("/api/v2/auth/login", json={"email": host_payload["email"], "password": host_payload["password"]})
        host_token = login.json()["access_token"]

    host_headers = {"Authorization": f"Bearer {host_token}"}
    me_resp = client.get("/api/v2/auth/me", headers=host_headers)
    host_id = me_resp.json()["id"]

    # 1. Customer initiates direct inquiry with host
    inquiry_payload = {
        "recipient_id": host_id,
        "subject": "Highland Arabica Roasting Tour",
        "content": "Namaskara! Do you have slots for coffee bean harvesting this weekend?",
    }
    inq_resp = client.post("/api/v2/messages/send", headers=auth_headers_user1, json=inquiry_payload)
    assert inq_resp.status_code == 201
    created_msg = inq_resp.json()["data"]
    assert created_msg["content"] == inquiry_payload["content"]
    conv_id = created_msg["conversation_id"]

    # 2. Host fetches conversations list and checks unread count
    host_convs_resp = client.get("/api/v2/messages/conversations", headers=host_headers)
    assert host_convs_resp.status_code == 200
    host_convs = host_convs_resp.json()["data"]
    target = next((c for c in host_convs if c["id"] == conv_id), None)
    assert target is not None
    assert target["unread_count"] >= 1
    assert target["participant_name"] == "Traveler One"

    # 3. Third-party customer (User 2) forbidden from viewing this conversation
    intruder_resp = client.get(f"/api/v2/messages/conversations/{conv_id}", headers=auth_headers_user2)
    assert intruder_resp.status_code == 403

    # 4. Host views thread (clearing unread count)
    host_thread_resp = client.get(f"/api/v2/messages/conversations/{conv_id}", headers=host_headers)
    assert host_thread_resp.status_code == 200
    assert host_thread_resp.json()["data"]["conversation"]["unread_count"] == 0

    # 5. Host sends reply
    reply_payload = {
        "conversation_id": conv_id,
        "content": "Namaskara! Yes, we have 4 morning slots open on Saturday.",
    }
    reply_resp = client.post("/api/v2/messages/send", headers=host_headers, json=reply_payload)
    assert reply_resp.status_code == 201
    assert reply_resp.json()["data"]["sender_name"] == "Kavitha Gowda (Coorg Estate)"

    # 6. Customer reads thread and sees host's reply
    cust_thread = client.get(f"/api/v2/messages/conversations/{conv_id}", headers=auth_headers_user1)
    msgs = cust_thread.json()["data"]["messages"]
    assert len(msgs) >= 2
    assert any(m["content"] == reply_payload["content"] for m in msgs)

