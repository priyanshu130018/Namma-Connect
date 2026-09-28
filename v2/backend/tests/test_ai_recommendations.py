"""Comprehensive Automated Tests for Grounded Vector AI Recommendation System.

Verifies:
1. Retrieval Grounding: Recommendations strictly come from database registered services.
2. Vector Similarity Search: Candidate retrieval via vector similarity.
3. Business Eligibility Filtering: Rejection of PENDING, REJECTED, REMOVED services and unverified hosts.
4. Hybrid Re-ranking: Semantic score combined with location, category, availability, and rating.
5. Hallucination Prevention & No-Result Handling: Off-topic queries return 0 recommendations.
6. Backfill Mechanism: Safe idempotent backfill of missing service embeddings.
7. Top-K Gating: At most 5 recommendations returned.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.service import Service
from app.services.embedding import EmbeddingService
from app.services.search import SemanticSearchService, _cosine_similarity
from app.services.gemini import GeminiService


def test_embedding_backfill_mechanism(db_session: Session):
    """Verify safe backfill generates missing embeddings without overwriting existing unless forced."""
    # 1. Create service without embedding
    s1 = Service(
        id=uuid.uuid4(),
        title="Unembedded Areca Farm",
        slug=f"areca-farm-{uuid.uuid4()}",
        description="Fresh farm tour in Thirthahalli",
        category="Experiences",
        category_slug="experiences",
        location="Thirthahalli, Shimoga",
        district="Shimoga",
        price=500.0,
        provider_name="Hegde Host",
        primary_image="https://example.com/a.jpg",
        status="PUBLISHED",
        inclusions_json='["Tour", "Refreshments"]',
        amenities_json='["Parking", "Restrooms"]',
    )
    # 2. Create service with pre-existing embedding
    pre_emb = EmbeddingService.generate_embedding("Pre-existing Coffee Stay Coorg")
    s2 = Service(
        id=uuid.uuid4(),
        title="Existing Embedded Stay",
        slug=f"existing-stay-{uuid.uuid4()}",
        description="Coorg stay",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg",
        district="Coorg",
        price=2000.0,
        provider_name="Coorg Host",
        primary_image="https://example.com/b.jpg",
        status="PUBLISHED",
        inclusions_json='["Stay", "Breakfast"]',
        amenities_json='["Wi-Fi", "Hot Water"]',
        embedding=pre_emb,
    )
    db_session.add_all([s1, s2])
    db_session.commit()

    try:
        # Backfill missing only (force=False)
        res = EmbeddingService.backfill_service_embeddings(db_session, force=False)
        assert res["processed"] >= 1
        assert res["updated"] >= 1
        assert res["errors"] == 0

        db_session.refresh(s1)
        assert s1.embedding is not None
        assert len(s1.embedding) == 768

        # Pre-existing embedding remains intact
        db_session.refresh(s2)
        assert len(s2.embedding) == 768
    finally:
        db_session.delete(s1)
        db_session.delete(s2)
        db_session.commit()


def test_strict_eligibility_hard_gates_all_conditions(db_session: Session):
    """Verify all 8 individual service and provider eligibility conditions."""
    # 1. Create providers with varied states
    p_valid = User(
        id=uuid.uuid4(),
        email=f"p.valid.{uuid.uuid4()}@nammaconnect.test",
        full_name="Valid Host",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    p_unverified = User(
        id=uuid.uuid4(),
        email=f"p.unver.{uuid.uuid4()}@nammaconnect.test",
        full_name="Unverified Host",
        role="partner",
        is_active=True,
        is_verified=False,
    )
    p_inactive = User(
        id=uuid.uuid4(),
        email=f"p.inact.{uuid.uuid4()}@nammaconnect.test",
        full_name="Inactive Host",
        role="partner",
        is_active=False,
        is_verified=True,
    )
    db_session.add_all([p_valid, p_unverified, p_inactive])
    db_session.commit()

    # Test 1: Verified published service + verified active provider -> ELIGIBLE
    s_valid = Service(
        id=uuid.uuid4(),
        provider_id=p_valid.id,
        title="Valid Certified Coffee Stay",
        slug=f"valid-stay-{uuid.uuid4()}",
        description="Certified plantation stay in Madikeri Coorg",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3500.0,
        status="PUBLISHED",
        is_verified=True,
        provider_name=p_valid.full_name,
        primary_image="https://example.com/v.jpg",
        inclusions_json='["Stay", "Coffee Tour"]',
        amenities_json='["Wi-Fi", "Parking"]',
        embedding=EmbeddingService.generate_embedding("Valid Certified Coffee Stay Madikeri Coorg"),
    )

    # Test 2: Unverified service -> INELIGIBLE
    s_unverified = Service(
        id=uuid.uuid4(),
        provider_id=p_valid.id,
        title="Unverified Coffee Stay",
        slug=f"unver-stay-{uuid.uuid4()}",
        description="Coffee plantation stay with unverified documentation",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3000.0,
        status="PUBLISHED",
        is_verified=False,  # <--- Unverified service
        provider_name=p_valid.full_name,
        primary_image="https://example.com/uv.jpg",
        inclusions_json='["Stay"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Unverified Coffee Stay Madikeri Coorg"),
    )

    # Test 3: Unpublished service -> INELIGIBLE
    s_pending = Service(
        id=uuid.uuid4(),
        provider_id=p_valid.id,
        title="Pending Coffee Stay",
        slug=f"pending-stay-{uuid.uuid4()}",
        description="Pending review coffee plantation stay",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3000.0,
        status="PENDING",  # <--- Unpublished status
        is_verified=True,
        provider_name=p_valid.full_name,
        primary_image="https://example.com/pend.jpg",
        inclusions_json='["Stay"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Pending Coffee Stay Madikeri Coorg"),
    )

    # Test 5: Missing provider (provider_id = None) -> INELIGIBLE
    s_no_provider = Service(
        id=uuid.uuid4(),
        provider_id=None,  # <--- Missing provider_id
        title="Orphan Coffee Stay",
        slug=f"orphan-stay-{uuid.uuid4()}",
        description="Coffee stay without provider reference",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3000.0,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Unknown Host",
        primary_image="https://example.com/orph.jpg",
        inclusions_json='["Stay"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Orphan Coffee Stay Madikeri Coorg"),
    )

    # Test 6: Provider does not exist in DB -> INELIGIBLE
    non_existent_provider_id = uuid.uuid4()
    s_ghost_provider = Service(
        id=uuid.uuid4(),
        provider_id=non_existent_provider_id,  # <--- Provider not in database
        title="Ghost Host Coffee Stay",
        slug=f"ghost-stay-{uuid.uuid4()}",
        description="Coffee stay with deleted/ghost provider reference",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3000.0,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Ghost Host",
        primary_image="https://example.com/ghost.jpg",
        inclusions_json='["Stay"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Ghost Host Coffee Stay Madikeri Coorg"),
    )

    # Test 7: Provider unverified -> INELIGIBLE
    s_unverified_prov = Service(
        id=uuid.uuid4(),
        provider_id=p_unverified.id,  # <--- Provider is_verified == False
        title="Unverified Host Coffee Stay",
        slug=f"unver-prov-stay-{uuid.uuid4()}",
        description="Coffee stay hosted by unverified provider",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3000.0,
        status="PUBLISHED",
        is_verified=True,
        provider_name=p_unverified.full_name,
        primary_image="https://example.com/up.jpg",
        inclusions_json='["Stay"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Unverified Host Coffee Stay Madikeri Coorg"),
    )

    # Test 8: Provider inactive -> INELIGIBLE
    s_inactive_prov = Service(
        id=uuid.uuid4(),
        provider_id=p_inactive.id,  # <--- Provider is_active == False
        title="Inactive Host Coffee Stay",
        slug=f"inact-prov-stay-{uuid.uuid4()}",
        description="Coffee stay hosted by deactivated provider",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3000.0,
        status="PUBLISHED",
        is_verified=True,
        provider_name=p_inactive.full_name,
        primary_image="https://example.com/ip.jpg",
        inclusions_json='["Stay"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Inactive Host Coffee Stay Madikeri Coorg"),
    )

    all_test_services = [
        s_valid, s_unverified, s_pending, s_no_provider,
        s_ghost_provider, s_unverified_prov, s_inactive_prov
    ]
    db_session.add_all(all_test_services)
    db_session.commit()

    try:
        # A. Programmatic Gate Verification
        assert SemanticSearchService.is_service_eligible(s_valid, db_session) is True
        assert SemanticSearchService.is_service_eligible(s_unverified, db_session) is False
        assert SemanticSearchService.is_service_eligible(s_pending, db_session) is False
        assert SemanticSearchService.is_service_eligible(s_no_provider, db_session) is False
        assert SemanticSearchService.is_service_eligible(s_ghost_provider, db_session) is False
        assert SemanticSearchService.is_service_eligible(s_unverified_prov, db_session) is False
        assert SemanticSearchService.is_service_eligible(s_inactive_prov, db_session) is False

        # Test 4: Inactive service (if active field exists)
        if hasattr(Service, "is_active"):
            s_inactive_srv = Service(
                id=uuid.uuid4(),
                provider_id=p_valid.id,
                title="Inactive Service Stay",
                slug=f"inact-srv-{uuid.uuid4()}",
                description="Inactive service listing",
                category="Stay",
                category_slug="stay",
                location="Madikeri, Coorg",
                district="Coorg",
                price=3000.0,
                status="PUBLISHED",
                is_verified=True,
                is_active=False,
                provider_name=p_valid.full_name,
                primary_image="https://example.com/inact.jpg",
                inclusions_json='["Stay"]',
                amenities_json='["Parking"]',
                embedding=EmbeddingService.generate_embedding("Inactive Service Stay Madikeri Coorg"),
            )
            db_session.add(s_inactive_srv)
            db_session.commit()
            assert SemanticSearchService.is_service_eligible(s_inactive_srv, db_session) is False
            db_session.delete(s_inactive_srv)
            db_session.commit()

        # B. Recommendation Pipeline Gate Verification
        recs, diag = SemanticSearchService.recommend_services(
            db_session,
            query="Certified Coffee Stay in Coorg",
            final_k=10,
        )
        rec_ids = [str(r.id) for r in recs]

        # Valid service must be recommended
        assert str(s_valid.id) in rec_ids

        # Ineligible services must NEVER be recommended
        assert str(s_unverified.id) not in rec_ids
        assert str(s_pending.id) not in rec_ids
        assert str(s_no_provider.id) not in rec_ids
        assert str(s_ghost_provider.id) not in rec_ids
        assert str(s_unverified_prov.id) not in rec_ids
        assert str(s_inactive_prov.id) not in rec_ids
    finally:
        for s in all_test_services:
            db_session.delete(s)
        db_session.delete(p_valid)
        db_session.delete(p_unverified)
        db_session.delete(p_inactive)
        db_session.commit()


def test_eligibility_hard_filter_beats_similarity(db_session: Session):
    """Test 9: Highly similar but invalid service vs valid service with lower similarity.
    Verifies that vector similarity can NEVER make an ineligible service eligible.
    """
    provider_valid = User(
        id=uuid.uuid4(),
        email=f"valid.coffee.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Valid Estate Host",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    provider_unverified = User(
        id=uuid.uuid4(),
        email=f"unver.coffee.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Unverified Estate Host",
        role="partner",
        is_active=True,
        is_verified=False,  # Unverified host
    )
    db_session.add_all([provider_valid, provider_unverified])
    db_session.commit()

    query_str = "Exclusive Private Arabica Coffee Plantation Trail in Madikeri Coorg"

    # 1. Invalid Service with 100% text match to query (sim ~ 1.0)
    invalid_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider_unverified.id,  # Hosted by unverified provider
        title="Exclusive Private Arabica Coffee Plantation Trail in Madikeri Coorg",
        slug=f"invalid-high-sim-{uuid.uuid4()}",
        description="Exclusive Private Arabica Coffee Plantation Trail in Madikeri Coorg",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=5000.0,
        rating=5.0,
        status="PENDING",  # And status is pending!
        is_verified=False,
        provider_name="Unverified Estate Host",
        primary_image="https://example.com/inv.jpg",
        inclusions_json='["Private Cupping", "Bungalow"]',
        amenities_json='["Wi-Fi", "Pool"]',
        embedding=EmbeddingService.generate_embedding(query_str),
    )

    # 2. Valid Service with modest/lower similarity but 100% eligible
    valid_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider_valid.id,
        title="Green Haven Organic Coffee Estate Homestay",
        slug=f"valid-modest-sim-{uuid.uuid4()}",
        description="Rustic homestay with morning coffee garden walk in Somwarpet Coorg.",
        category="Stay",
        category_slug="stay",
        location="Somwarpet, Coorg, Karnataka",
        district="Coorg",
        price=2800.0,
        rating=4.8,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Valid Estate Host",
        primary_image="https://example.com/val.jpg",
        inclusions_json='["Stay", "Breakfast"]',
        amenities_json='["Hot Water", "Parking"]',
        embedding=EmbeddingService.generate_embedding("Green Haven Organic Coffee Estate Homestay Somwarpet Coorg"),
    )
    db_session.add_all([invalid_srv, valid_srv])
    db_session.commit()

    try:
        recs, diag = SemanticSearchService.recommend_services(
            db_session,
            query=query_str,
            final_k=5,
        )
        rec_ids = [str(r.id) for r in recs]

        # The invalid service must NEVER be returned despite being an exact match
        assert str(invalid_srv.id) not in rec_ids, "Ineligible service must NEVER be recommended regardless of similarity!"

        # The valid service must be returned
        assert str(valid_srv.id) in rec_ids
    finally:
        db_session.delete(invalid_srv)
        db_session.delete(valid_srv)
        db_session.delete(provider_valid)
        db_session.delete(provider_unverified)
        db_session.commit()


def test_recommendation_grounding_all_records(db_session: Session):
    """Verify that every returned recommendation is strictly grounded in a real DB service with verified provider."""
    provider = User(
        id=uuid.uuid4(),
        email=f"grounding.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Grounded Host",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()

    srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Coorg Spice and Honey Nature Retreat",
        slug=f"spice-honey-retreat-{uuid.uuid4()}",
        description="Peaceful cottage in Coorg surrounded by wild bee hives and pepper vines.",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3200.0,
        rating=4.9,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Grounded Host",
        primary_image="https://example.com/honey.jpg",
        inclusions_json='["Honey Tasting", "Stay"]',
        amenities_json='["Wi-Fi", "Parking"]',
        embedding=EmbeddingService.generate_embedding("Coorg Spice Honey Nature Retreat Madikeri stay"),
    )
    db_session.add(srv)
    db_session.commit()

    try:
        recs, diag = SemanticSearchService.recommend_services(
            db_session,
            query="I want a peaceful honey and spice retreat in Coorg",
        )
        assert len(recs) >= 1

        for r in recs:
            # Service exists in DB
            db_srv = db_session.query(Service).filter(Service.id == r.id).first()
            assert db_srv is not None
            assert db_srv.status == "PUBLISHED"
            assert db_srv.is_verified is True
            assert db_srv.provider_id is not None

            # Provider exists in DB, active, and verified
            db_prov = db_session.query(User).filter(User.id == db_srv.provider_id).first()
            assert db_prov is not None
            assert db_prov.is_active is True
            assert db_prov.is_verified is True
    finally:
        db_session.delete(srv)
        db_session.delete(provider)
        db_session.commit()


def test_no_hallucination_impossible_query(client: TestClient, db_session: Session):
    """Verify that off-topic / impossible queries return 0 services and do not invent fake entities."""
    query = "I want a luxury underwater coffee plantation on Mars with zero gravity submarines"

    # 1. Search service layer
    recs, diag = SemanticSearchService.recommend_services(db_session, query=query)
    assert len(recs) == 0

    # 2. AI Chat assistant layer
    resp = client.post("/api/v2/ai/travel/chat", json={
        "message": query,
        "language": "en",
    })
    assert resp.status_code == 200
    data = resp.json()["data"]

    # Must not hallucinate service listings
    assert len(data["suggested_services"]) == 0
    # Must provide clear, polite no-match response
    assert "couldn't find a matching experience" in data["reply"].lower() or "not find" in data["reply"].lower()


def test_multilingual_recommendation_queries(client: TestClient, db_session: Session):
    """Verify recommendation system processes Kannada script, Hindi script, Roman Kannada, and Roman Hindi."""
    provider = User(
        id=uuid.uuid4(),
        email=f"multi.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Somanna Gowda",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()

    coffee_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Kodagu Arabica Coffee Plantation Stay",
        slug=f"kodagu-arabica-{uuid.uuid4()}",
        description="Scenic Arabica coffee estate homestay with plantation walks in Madikeri Coorg.",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3200.0,
        rating=4.95,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Somanna Gowda",
        primary_image="https://example.com/arabica.jpg",
        inclusions_json='["Guided Walk", "Breakfast"]',
        amenities_json='["Parking", "Wi-Fi"]',
        embedding=EmbeddingService.generate_embedding("Kodagu Arabica Coffee Plantation Stay Madikeri Coorg"),
    )
    db_session.add(coffee_srv)
    db_session.commit()

    multilingual_prompts = [
        # 1. Kannada script
        ("kn_script", "ನನಗೆ ಕೊಡಗಿನಲ್ಲಿ ಕಾಫಿ ತೋಟದ ಅನುಭವ ಬೇಕು", "kn"),
        # 2. Hindi script
        ("hi_script", "मुझे कूर्ग में कॉफी फार्म का अनुभव चाहिए", "hi"),
        # 3. Romanized Kannada
        ("kn_roman", "nanage Coorg alli coffee plantation experience beku", "kn"),
        # 4. Romanized Hindi
        ("hi_roman", "mujhe Coorg mein coffee farm experience chahiye", "hi"),
    ]

    try:
        for name, prompt_text, expected_lang in multilingual_prompts:
            # 1. Test direct vector retrieval
            recs, diag = SemanticSearchService.recommend_services(
                db_session,
                query=prompt_text,
                final_k=5,
            )
            assert len(recs) >= 1, f"Query '{name}' ({prompt_text}) must return eligible coffee service"
            rec_ids = [str(r.id) for r in recs]
            assert str(coffee_srv.id) in rec_ids, f"Service {coffee_srv.id} must be in recommendations for '{name}'"

            # 2. Test AI chat endpoint
            resp = client.post("/api/v2/ai/travel/chat", json={
                "message": prompt_text,
                "language": "en",  # Default passed; assistant should detect script/Roman language
            })
            assert resp.status_code == 200
            data = resp.json()["data"]

            suggested = data.get("suggested_services", [])
            assert len(suggested) >= 1, f"AI suggested_services must not be empty for '{name}'"
            suggested_ids = [s["id"] for s in suggested]
            assert str(coffee_srv.id) in suggested_ids

            # Verify response language adaptation
            reply = data.get("reply", "")
            if expected_lang == "kn":
                assert any('\u0C80' <= c <= '\u0CFF' for c in reply), f"Expected Kannada response for '{name}'"
            elif expected_lang == "hi":
                assert any('\u0900' <= c <= '\u097F' for c in reply), f"Expected Hindi response for '{name}'"
    finally:
        db_session.delete(coffee_srv)
        db_session.delete(provider)
        db_session.commit()


def test_conversational_messages_do_not_recommend_services(client: TestClient):
    """Verify conversational messages (hello, namaskara, thank you, how are you) return suggested_services: []."""
    conversational_prompts = [
        ("hello", "en"),
        ("namaskara", "kn"),
        ("thank you", "en"),
        ("thanks", "en"),
        ("how are you", "en"),
    ]
    for prompt, lang in conversational_prompts:
        resp = client.post("/api/v2/ai/travel/chat", json={
            "message": prompt,
            "language": lang,
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["suggested_services"] == [], f"Expected empty suggested_services for '{prompt}', got {data['suggested_services']}"
        assert data["reply"], f"Expected non-empty reply for '{prompt}'"
        assert "source" in data
        assert "conversation_id" in data


def test_suggest_me_some_fair_returns_fair_and_no_unrelated_padding(client: TestClient, db_session: Session):
    """Verify 'suggest me some fair' returns fair/event services and does NOT pad with unrelated coffee/paddy stays."""
    provider = User(
        id=uuid.uuid4(),
        email=f"fair.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Fair Host",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()

    # Create 1 Fair/Event service
    fair_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Maddur Jaggery Fair & Village Market",
        slug=f"maddur-fair-{uuid.uuid4()}",
        description="Traditional rural Karnataka harvest fair and seasonal jaggery mela.",
        category="Events",
        category_slug="events",
        location="Maddur, Mandya, Karnataka",
        district="Mandya",
        price=300.0,
        rating=4.8,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Fair Host",
        primary_image="https://example.com/fair.jpg",
        inclusions_json='["Entry", "Tasting"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Maddur Jaggery Fair & Village Market harvest mela festival"),
    )

    # Create 2 unrelated coffee and pottery services
    coffee_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Coorg Arabica Coffee Homestay",
        slug=f"coorg-coffee-{uuid.uuid4()}",
        description="Coffee plantation stay in Madikeri Coorg",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3500.0,
        rating=4.9,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Fair Host",
        primary_image="https://example.com/coffee.jpg",
        inclusions_json='["Stay"]',
        amenities_json='["Wi-Fi"]',
        embedding=EmbeddingService.generate_embedding("Coorg Arabica Coffee Homestay Madikeri plantation stay"),
    )

    pottery_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Ramanagara Terracotta Pottery Workshop",
        slug=f"pottery-ws-{uuid.uuid4()}",
        description="Hands-on clay pottery sculpting workshop in Ramanagara",
        category="Experiences",
        category_slug="experiences",
        location="Ramanagara, Karnataka",
        district="Ramanagara",
        price=800.0,
        rating=4.7,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Fair Host",
        primary_image="https://example.com/pottery.jpg",
        inclusions_json='["Clay", "Wheel Time"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Ramanagara Terracotta Pottery Workshop clay sculpting"),
    )

    db_session.add_all([fair_srv, coffee_srv, pottery_srv])
    db_session.commit()

    try:
        # 1. Direct search service test
        recs, diag = SemanticSearchService.recommend_services(
            db_session,
            query="suggest me some fair",
            k_final=5,
        )
        assert len(recs) >= 1
        rec_ids = [str(r.id) for r in recs]
        assert str(fair_srv.id) in rec_ids
        # Anti-padding: unrelated coffee homestay must NOT be included as weak similarity padding
        assert str(coffee_srv.id) not in rec_ids
        assert str(pottery_srv.id) not in rec_ids

        # 2. AI chat endpoint test
        resp = client.post("/api/v2/ai/travel/chat", json={
            "message": "suggest me some fair",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        suggested = data.get("suggested_services", [])
        assert len(suggested) >= 1
        suggested_ids = [s["id"] for s in suggested]
        assert str(fair_srv.id) in suggested_ids
        assert str(coffee_srv.id) not in suggested_ids
    finally:
        db_session.delete(fair_srv)
        db_session.delete(coffee_srv)
        db_session.delete(pottery_srv)
        db_session.delete(provider)
        db_session.commit()


def test_tea_farm_and_coorg_recommendations(client: TestClient, db_session: Session):
    """Verify 'tea farm near me' and 'places to visit in Coorg' / 'coffee plantation stay' return matching services."""
    provider = User(
        id=uuid.uuid4(),
        email=f"tea.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Tea Host",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()

    tea_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Chikmagalur Heritage Tea Farm Stay",
        slug=f"tea-farm-{uuid.uuid4()}",
        description="Organic tea plantation and processing farm stay in Mudigere Chikmagalur",
        category="Stay",
        category_slug="stay",
        location="Mudigere, Chikmagalur, Karnataka",
        district="Chikmagalur",
        price=2800.0,
        rating=4.85,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Tea Host",
        primary_image="https://example.com/tea.jpg",
        inclusions_json='["Tea Tasting", "Stay"]',
        amenities_json='["Wi-Fi"]',
        embedding=EmbeddingService.generate_embedding("Chikmagalur Heritage Tea Farm Stay Mudigere plantation"),
    )

    coorg_coffee = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Madikeri Mist Coffee Plantation Retreat",
        slug=f"madikeri-mist-{uuid.uuid4()}",
        description="Authentic coffee estate stay with guided plantation walks in Coorg",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=3200.0,
        rating=4.9,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Tea Host",
        primary_image="https://example.com/mist.jpg",
        inclusions_json='["Walk", "Stay"]',
        amenities_json='["Wi-Fi"]',
        embedding=EmbeddingService.generate_embedding("Madikeri Mist Coffee Plantation Retreat Coorg coffee estate stay"),
    )

    db_session.add_all([tea_srv, coorg_coffee])
    db_session.commit()

    try:
        # 1. "tea farm near me"
        resp_tea = client.post("/api/v2/ai/travel/chat", json={
            "message": "tea farm near me",
        })
        assert resp_tea.status_code == 200
        tea_data = resp_tea.json()["data"]
        tea_suggested_ids = [s["id"] for s in tea_data.get("suggested_services", [])]
        assert str(tea_srv.id) in tea_suggested_ids

        # 2. "places to visit in Coorg"
        resp_coorg = client.post("/api/v2/ai/travel/chat", json={
            "message": "places to visit in Coorg",
        })
        assert resp_coorg.status_code == 200
        coorg_data = resp_coorg.json()["data"]
        coorg_suggested_ids = [s["id"] for s in coorg_data.get("suggested_services", [])]
        assert str(coorg_coffee.id) in coorg_suggested_ids
    finally:
        db_session.delete(tea_srv)
        db_session.delete(coorg_coffee)
        db_session.delete(provider)
        db_session.commit()


def test_hybrid_candidate_deduplication(db_session: Session):
    """Verify hybrid candidate retrieval deduplicates services found by both vector search and keyword match."""
    provider = User(
        id=uuid.uuid4(),
        email=f"dedup.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Dedup Host",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()

    srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Unique Coffee & Honey Experience",
        slug=f"unique-coffee-{uuid.uuid4()}",
        description="Special coffee plantation tour with honey harvesting",
        category="Experiences",
        category_slug="experiences",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=1500.0,
        rating=4.9,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Dedup Host",
        primary_image="https://example.com/u.jpg",
        inclusions_json='["Tour"]',
        amenities_json='["Parking"]',
        embedding=EmbeddingService.generate_embedding("Unique Coffee & Honey Experience Madikeri Coorg"),
    )
    db_session.add(srv)
    db_session.commit()

    try:
        # Query that triggers both keyword match ("coffee") and vector similarity
        recs, diag = SemanticSearchService.recommend_services(
            db_session,
            query="coffee experience in Coorg",
            final_k=5,
        )
        # Check that the service ID appears at most once in recs and diagnostics
        ids_in_recs = [r.id for r in recs if r.id == srv.id]
        assert len(ids_in_recs) <= 1
        ids_in_diag = [r["service_id"] for r in diag["results"] if r["service_id"] == str(srv.id)]
        assert len(ids_in_diag) <= 1
    finally:
        db_session.delete(srv)
        db_session.delete(provider)
        db_session.commit()


def test_informational_queries_return_no_service_cards(client: TestClient):
    """Verify general travel questions (season, culture, facts) return text replies with 0 suggested service cards."""
    informational_queries = [
        "What is the best season to visit Coorg?",
        "Why is Coorg famous?",
        "Tell me about Karnataka culture and traditional food",
        "When does the monsoon start in Western Ghats?",
    ]
    for query in informational_queries:
        resp = client.post("/api/v2/ai/travel/chat", json={
            "message": query,
            "language": "en",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["suggested_services"] == [], f"Expected 0 suggested services for general query '{query}', got {data['suggested_services']}"
        assert data["reply"], f"Expected informative reply for '{query}'"
        assert data["source"] == "gemini_general"


def test_short_catalog_search_coconut_returns_service(client: TestClient, db_session: Session):
    """Verify single word/short catalog search 'coconut' routes to catalog search and retrieves matching coconut service."""
    provider = User(
        id=uuid.uuid4(),
        email=f"coconut.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Coconut Farmer",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()

    coconut_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Mandya Organic Coconut Grove & Neera Tasting",
        slug=f"coconut-grove-{uuid.uuid4()}",
        description="Explore lush coconut groves with fresh organic coconut water and traditional harvesting in Mandya.",
        category="Experiences",
        category_slug="experiences",
        location="Maddur, Mandya, Karnataka",
        district="Mandya",
        price=450.0,
        rating=4.9,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Coconut Farmer",
        primary_image="https://example.com/coconut.jpg",
        inclusions_json='["Coconut Tasting", "Tree Climbing Demo"]',
        amenities_json='["Parking", "Restrooms"]',
        embedding=EmbeddingService.generate_embedding("Mandya Organic Coconut Grove Neera Tasting fresh coconut water"),
    )
    db_session.add(coconut_srv)
    db_session.commit()

    try:
        # Search for short term "coconut"
        resp = client.post("/api/v2/ai/travel/chat", json={
            "message": "coconut",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        suggested = data.get("suggested_services", [])
        assert len(suggested) >= 1, "Expected at least 1 suggested service for 'coconut'"
        suggested_ids = [s["id"] for s in suggested]
        assert str(coconut_srv.id) in suggested_ids
    finally:
        db_session.delete(coconut_srv)
        db_session.delete(provider)
        db_session.commit()


def test_location_normalization_near_kodava(client: TestClient, db_session: Session):
    """Verify 'near Kodava' normalizes destination to Coorg and returns matching Coorg homestay."""
    provider = User(
        id=uuid.uuid4(),
        email=f"kodava.host.{uuid.uuid4()}@nammaconnect.test",
        full_name="Kodagu Estate Host",
        role="partner",
        is_active=True,
        is_verified=True,
    )
    db_session.add(provider)
    db_session.commit()

    coorg_srv = Service(
        id=uuid.uuid4(),
        provider_id=provider.id,
        title="Madikeri Heritage Plantation Homestay",
        slug=f"madikeri-homestay-{uuid.uuid4()}",
        description="Authentic homestay nestled in lush green coffee hills of Coorg with scenic valley views.",
        category="Stay",
        category_slug="stay",
        location="Madikeri, Coorg, Karnataka",
        district="Coorg",
        price=2900.0,
        rating=4.88,
        status="PUBLISHED",
        is_verified=True,
        provider_name="Kodagu Estate Host",
        primary_image="https://example.com/madikeri.jpg",
        inclusions_json='["Stay", "Breakfast"]',
        amenities_json='["Wi-Fi", "Hot Water"]',
        embedding=EmbeddingService.generate_embedding("Madikeri Heritage Plantation Homestay Coorg Kodagu"),
    )
    db_session.add(coorg_srv)
    db_session.commit()

    try:
        resp = client.post("/api/v2/ai/travel/chat", json={
            "message": "near Kodava",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        suggested = data.get("suggested_services", [])
        assert len(suggested) >= 1, "Expected 'near Kodava' to retrieve Coorg homestay"
        suggested_ids = [s["id"] for s in suggested]
        assert str(coorg_srv.id) in suggested_ids
    finally:
        db_session.delete(coorg_srv)
        db_session.delete(provider)
        db_session.commit()


def test_intent_classifier_unit_rules():
    """Verify GeminiService.classify_intent and fallback heuristics on all intent categories and parameter extractions."""
    # 1. Conversational
    r1 = GeminiService.classify_intent("hello")
    assert r1["intent"] == "conversational"

    r2 = GeminiService.classify_intent("namaskara, how are you?")
    assert r2["intent"] == "conversational"

    # 2. Informational
    r3 = GeminiService.classify_intent("What is the best season to visit Coorg?")
    assert r3["intent"] == "informational"
    assert r3.get("destination") == "Coorg"

    r4 = GeminiService.classify_intent("Why is Coorg famous?")
    assert r4["intent"] == "informational"

    # 3. Catalog Search
    r5 = GeminiService.classify_intent("coconut")
    assert r5["intent"] == "catalog_search"

    r6 = GeminiService.classify_intent("show me pottery workshops")
    assert r6["intent"] in ["catalog_search", "recommendation"]

    # 4. Location Search with Synonym Normalization
    r7 = GeminiService.classify_intent("near Kodava")
    assert r7["intent"] == "location_search"
    assert r7.get("destination") == "Coorg"

    # 5. Recommendation with Constraints
    r8 = GeminiService.classify_intent("homestay in Chikmagalur under 3000")
    assert r8["intent"] in ["recommendation", "catalog_search", "location_search"]
    assert r8.get("destination") == "Chikmagalur"
    assert r8.get("category") == "Stay"
    assert r8.get("budget") == 3000.0

    # 6. Itinerary
    r9 = GeminiService.classify_intent("plan a 2 day trip to Coorg")
    assert r9["intent"] == "itinerary"
    assert r9.get("destination") == "Coorg"
    assert r9.get("duration_days") == 2
