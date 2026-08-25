"""Health endpoint tests."""

def test_health_check_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0.0"
    assert "services" in data


def test_openapi_v2_docs_accessible(client):
    response = client.get("/api/v2/docs")
    assert response.status_code == 200

    openapi_response = client.get("/api/v2/openapi.json")
    assert openapi_response.status_code == 200
    spec = openapi_response.json()
    assert spec["info"]["title"] == "Namma Connect V2"
