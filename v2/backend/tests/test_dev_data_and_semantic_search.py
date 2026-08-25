"""Comprehensive Automated Tests for Development Dataset, Safety Guards, Gemini Embeddings, and pgvector Semantic Search."""

import os
import uuid
import pytest
from unittest.mock import patch, MagicMock
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.service import Service, Review
from app.models.partner_application import PartnerApplication
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.notification import Notification
from app.models.creator import CreatorProfile
from app.services.embedding import EmbeddingService
from app.services.search import SemanticSearchService, _cosine_similarity
from scripts.seed_dev_data import seed_development_data, check_safety_guard as seed_safety_guard
from scripts.clear_dev_data import clear_development_data, check_safety_guard as clear_safety_guard


# ─────────────────────────────────────────────────────────────
# 1. MODEL TEST DATA FLAGS & SCHEMAS
# ─────────────────────────────────────────────────────────────
def test_is_test_data_model_defaults(db_session: Session):
    """Verify is_test_data defaults to False on real entity creation."""
    user = User(
        id=uuid.uuid4(),
        email=f"real.customer.{uuid.uuid4()}@example.com",
        full_name="Real Customer",
        role="customer",
    )
    srv = Service(
        id=uuid.uuid4(),
        title="Real Coffee Tour",
        slug=f"real-tour-{uuid.uuid4()}",
        description="Authentic real farm tour",
        category="Experiences",
        category_slug="experiences",
        location="Madikeri, Coorg",
        district="Kodagu (Coorg)",
        price=1200.0,
        primary_image="https://example.com/img.jpg",
        provider_name="Real Host",
    )
    db_session.add_all([user, srv])
    db_session.commit()

    assert user.is_test_data is False
    assert srv.is_test_data is False


# ─────────────────────────────────────────────────────────────
# 2. SAFETY ENVIRONMENT GUARDS
# ─────────────────────────────────────────────────────────────
def test_seed_and_clear_safety_guard_refuses_production(monkeypatch):
    """Verify seed and clear scripts refuse execution in production."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(SystemExit) as exc_info:
        seed_safety_guard()
    assert exc_info.value.code == 1

    with pytest.raises(SystemExit) as exc_clear:
        clear_safety_guard()
    assert exc_clear.value.code == 1


# ─────────────────────────────────────────────────────────────
# 3. EMBEDDING SERVICE TESTS
# ─────────────────────────────────────────────────────────────
def test_embedding_dimension_and_text_construction(db_session: Session):
    """Verify searchable text creation and 768-dimension vector generation."""
    srv = Service(
        id=uuid.uuid4(),
        title="Organic Coffee Farm Stay",
        slug=f"coffee-farm-{uuid.uuid4()}",
        description="Stay in an 80-year-old estate with plantation walks.",
        category="Stays",
        category_slug="stay",
        location="Somwarpet, Coorg",
        district="Kodagu (Coorg)",
        state="Karnataka",
        price=3500.0,
        unit="night",
        provider_name="Bopanna",
        provider_type="Farmer",
        primary_image="https://example.com/coorg.jpg",
        inclusions_json='["Breakfast", "Plantation Trail"]',
        amenities_json='["Hot Water", "Wi-Fi"]',
        status="PUBLISHED",
    )
    db_session.add(srv)
    db_session.commit()

    searchable_text = EmbeddingService.build_searchable_text(srv)
    assert "Organic Coffee Farm Stay" in searchable_text
    assert "Somwarpet" in searchable_text
    assert "Kodagu" in searchable_text
    assert "Bopanna" in searchable_text
    assert "Breakfast" in searchable_text

    # Generate 768-dim embedding
    vector = EmbeddingService.generate_embedding(searchable_text)
    assert len(vector) == 768
    # Test batch generation
    batch_vecs = EmbeddingService.batch_generate_embeddings([searchable_text, "Another Karnataka tour"])
    assert len(batch_vecs) == 2
    assert len(batch_vecs[0]) == 768
    assert len(batch_vecs[1]) == 768


# ─────────────────────────────────────────────────────────────
# 4. SEMANTIC SEARCH & COSINE SIMILARITY RETRIEVAL
# ─────────────────────────────────────────────────────────────
def test_semantic_search_cosine_ranking_and_filters(db_session: Session):
    """Verify semantic search ranks relevant listings and respects relational filters."""
    # Seed 3 services with embeddings
    # 1. Coffee Farm in Coorg
    coffee_srv = Service(
        id=uuid.uuid4(),
        title="Heritage Coffee Plantation Stay",
        slug=f"coffee-stay-{uuid.uuid4()}",
        description="Scenic coffee plantation stay with guided morning harvesting in Madikeri Coorg.",
        category="Stays",
        category_slug="stay",
        location="Madikeri, Coorg",
        district="Kodagu (Coorg)",
        price=4000.0,
        rating=4.9,
        status="PUBLISHED",
        primary_image="https://example.com/c1.jpg",
        provider_name="Ramesh Gowda",
        embedding=EmbeddingService.generate_embedding("Heritage Coffee Plantation Stay Madikeri Coorg organic harvesting"),
    )
    # 2. Pottery workshop in Channapatna
    pottery_srv = Service(
        id=uuid.uuid4(),
        title="Traditional Pottery & Toy Workshop",
        slug=f"pottery-craft-{uuid.uuid4()}",
        description="Hands-on earthen pottery wheel and wooden lacquer toy craft workshop.",
        category="Experiences",
        category_slug="experiences",
        location="Channapatna, Ramanagara",
        district="Ramanagara",
        price=800.0,
        rating=4.8,
        status="PUBLISHED",
        primary_image="https://example.com/p1.jpg",
        provider_name="Kiran Artisan",
        embedding=EmbeddingService.generate_embedding("Traditional Pottery Toy Craft Workshop Channapatna earthenware"),
    )
    # 3. Unpublished draft coffee stay
    draft_coffee = Service(
        id=uuid.uuid4(),
        title="Unpublished Coffee Estate",
        slug=f"draft-coffee-{uuid.uuid4()}",
        description="Draft coffee estate listing not yet approved.",
        category="Stays",
        category_slug="stay",
        location="Virajpet, Coorg",
        district="Kodagu (Coorg)",
        price=3200.0,
        status="PENDING",
        primary_image="https://example.com/c2.jpg",
        provider_name="Dev Host",
        embedding=EmbeddingService.generate_embedding("Unpublished Coffee Estate Madikeri Coorg"),
    )
    db_session.add_all([coffee_srv, pottery_srv, draft_coffee])
    db_session.commit()

    # Search for coffee in Coorg
    results, total = SemanticSearchService.semantic_search(
        db_session,
        query="peaceful coffee plantation farm stay in Coorg",
        status="PUBLISHED",
    )
    assert len(results) >= 1
    # First result should be the coffee farm stay
    assert results[0].id == coffee_srv.id
    # Unpublished service must NEVER be returned
    assert all(r.status == "PUBLISHED" for r in results)
    assert not any(r.id == draft_coffee.id for r in results)

    # Search with category filter
    exp_results, exp_total = SemanticSearchService.semantic_search(
        db_session,
        query="pottery craft",
        category="experiences",
        status="PUBLISHED",
    )
    assert len(exp_results) >= 1
    assert exp_results[0].id == pottery_srv.id

    # Search with price filter (max_price=1000)
    budget_results, _ = SemanticSearchService.semantic_search(
        db_session,
        query="workshop",
        max_price=1000.0,
        status="PUBLISHED",
    )
    assert all(r.price <= 1000.0 for r in budget_results)


# ─────────────────────────────────────────────────────────────
# 5. UNIFIED SEARCH PIPELINE INTEGRATION
# ─────────────────────────────────────────────────────────────
def test_normal_search_and_ai_chat_use_semantic_pipeline(client: TestClient, db_session: Session):
    """Verify that both /search and /ai/travel/chat route through the unified semantic search pipeline."""
    srv = Service(
        id=uuid.uuid4(),
        title="Spices & Vanilla Agro-Tour",
        slug=f"spices-tour-{uuid.uuid4()}",
        description="Explore organic cardamom, pepper vines, and pure vanilla orchid farms in Sirsi.",
        category="Experiences",
        category_slug="experiences",
        location="Sirsi, Uttara Kannada",
        district="Uttara Kannada",
        price=950.0,
        rating=4.9,
        status="PUBLISHED",
        primary_image="https://example.com/spice.jpg",
        provider_name="Girish Hegde",
        embedding=EmbeddingService.generate_embedding("Spices Vanilla Agro Tour Cardamom Pepper Sirsi"),
    )
    db_session.add(srv)
    db_session.commit()

    # 1. Normal search endpoint
    search_resp = client.get("/api/v2/search?q=cardamom+and+vanilla+agro+farm")
    assert search_resp.status_code == 200
    search_data = search_resp.json()["data"]
    assert "results" in search_data
    assert len(search_data["results"]) >= 1
    assert search_data["results"][0]["id"] == str(srv.id)

    # 2. Search suggestions endpoint
    sugg_resp = client.get("/api/v2/search/suggestions?q=spices")
    assert sugg_resp.status_code == 200
    sugg_data = sugg_resp.json()["data"]
    assert "suggestions" in sugg_data

    # 3. Travel AI conversational assistant endpoint
    ai_resp = client.post("/api/v2/ai/travel/chat", json={
        "message": "I want to visit organic spice and cardamom plantations in Uttara Kannada",
        "language": "en",
    })
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()["data"]
    assert "reply" in ai_data
    assert "suggested_services" in ai_data
    assert len(ai_data["suggested_services"]) >= 1
    assert any(s["id"] == str(srv.id) for s in ai_data["suggested_services"])


# ─────────────────────────────────────────────────────────────
# 6. SEED & CLEANUP SCRIPT INTEGRATION TEST
# ─────────────────────────────────────────────────────────────
def test_seed_and_clear_dataset_execution(db_session: Session):
    """Test safe seeding and cleanup lifecycle on the test database."""
    # Run seeder
    seed_development_data(db_session)

    test_users = db_session.query(User).filter(User.is_test_data == True).count()
    test_services = db_session.query(Service).filter(Service.is_test_data == True).count()
    test_apps = db_session.query(PartnerApplication).filter(PartnerApplication.is_test_data == True).count()

    assert test_users >= 500
    assert test_services >= 1000
    assert test_apps >= 100

    # Verify approval state distribution
    published_count = db_session.query(Service).filter(Service.is_test_data == True, Service.status == "PUBLISHED").count()
    pending_count = db_session.query(Service).filter(Service.is_test_data == True, Service.status == "PENDING").count()
    assert published_count > 0
    assert pending_count > 0

    # Run cleanup
    clear_development_data(db_session)

    after_users = db_session.query(User).filter(User.is_test_data == True).count()
    after_services = db_session.query(Service).filter(Service.is_test_data == True).count()
    assert after_users == 0
    assert after_services == 0
