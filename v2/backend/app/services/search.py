"""Unified Semantic Search Service using pgvector and Gemini Embeddings."""

import math
from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func
from app.models.service import Service
from app.models.user import User
from app.services.embedding import EmbeddingService
from app.core.logging import logger


def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


class SemanticSearchService:
    """Authoritative domain service providing unified semantic vector retrieval and ranking."""

    @classmethod
    def semantic_search(
        cls,
        db: Session,
        query: str = "",
        category: Optional[str] = None,
        location: Optional[str] = None,
        district: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        page: int = 1,
        limit: int = 12,
        status: str = "PUBLISHED",
    ) -> Tuple[List[Service], int]:
        """Perform semantic search across marketplace services combining vector distance with relational filters."""
        # 1. Base query with status filter
        q = db.query(Service).filter(Service.status == status)

        # 2. Relational filters
        if category and category.lower() != "all":
            clean_cat = category.lower().strip()
            if clean_cat in ["farms", "farm"]:
                q = q.filter(
                    or_(
                        Service.category_slug.in_(["stay", "experiences"]),
                        Service.category.ilike("%farm%"),
                        Service.title.ilike("%farm%"),
                    )
                )
            elif clean_cat in ["activities", "activity"]:
                q = q.filter(
                    or_(
                        Service.category_slug.in_(["experiences", "guides-tours", "adventure"]),
                        Service.category.ilike("%activit%"),
                        Service.category.ilike("%tour%"),
                        Service.category.ilike("%adventure%"),
                    )
                )
            elif clean_cat in ["stays", "stay", "homestay", "farmstay"]:
                q = q.filter(
                    or_(
                        Service.category_slug == "stay",
                        Service.category.ilike("%stay%"),
                        Service.category.ilike("%homestay%"),
                    )
                )
            elif clean_cat in ["tours", "guides", "guides & tours", "guides-tours"]:
                q = q.filter(
                    or_(
                        Service.category_slug.in_(["guides-tours", "tours"]),
                        Service.category.ilike("%tour%"),
                        Service.category.ilike("%guide%"),
                    )
                )
            elif clean_cat in ["food", "dining", "culinary"]:
                q = q.filter(
                    or_(
                        Service.category_slug == "food",
                        Service.category.ilike("%food%"),
                        Service.category.ilike("%dining%"),
                    )
                )
            elif clean_cat in ["events", "event", "harvest"]:
                q = q.filter(
                    or_(
                        Service.category_slug == "events",
                        Service.category.ilike("%event%"),
                        Service.category.ilike("%harvest%"),
                    )
                )
            else:
                q = q.filter(
                    or_(
                        Service.category_slug == clean_cat,
                        Service.category.ilike(f"%{clean_cat}%"),
                    )
                )

        if location:
            q = q.filter(
                or_(
                    Service.location.ilike(f"%{location}%"),
                    Service.district.ilike(f"%{location}%"),
                    Service.state.ilike(f"%{location}%"),
                )
            )

        if district:
            q = q.filter(Service.district.ilike(f"%{district}%"))

        if min_price is not None:
            q = q.filter(Service.price >= min_price)

        if max_price is not None:
            q = q.filter(Service.price <= max_price)

        if min_rating is not None:
            q = q.filter(Service.rating >= min_rating)

        # 3. Handle query retrieval
        clean_query = (query or "").strip()
        offset = (page - 1) * limit

        if clean_query:
            query_vector = EmbeddingService.generate_embedding(clean_query)
            bind = db.get_bind()
            is_postgres = bind.dialect.name == "postgresql"

            if is_postgres:
                # Direct pgvector cosine distance ordering
                vector_q = q.filter(Service.embedding.isnot(None))
                total = vector_q.count()
                items = (
                    vector_q.order_by(Service.embedding.cosine_distance(query_vector))
                    .offset(offset)
                    .limit(limit)
                    .all()
                )
                if items:
                    return items, total

            # In-memory / SQLite / Hybrid Fallback:
            all_matching = q.all()
            total = len(all_matching)

            # Score each candidate
            scored_items = []
            for s in all_matching:
                score = 0.0
                if s.embedding is not None:
                    score = _cosine_similarity(query_vector, list(s.embedding))
                else:
                    # Text match fallback weight
                    q_lower = clean_query.lower()
                    if q_lower in s.title.lower():
                        score += 0.5
                    if q_lower in s.description.lower():
                        score += 0.3
                    if q_lower in s.location.lower() or q_lower in s.district.lower():
                        score += 0.4
                scored_items.append((score, s))

            # Rank by score descending, then rating
            scored_items.sort(key=lambda x: (x[0], x[1].rating or 0), reverse=True)
            paginated = [item for _, item in scored_items[offset : offset + limit]]
            return paginated, total

        # Empty query: standard rating/recency sort
        total = q.count()
        items = q.order_by(desc(Service.rating), desc(Service.created_at)).offset(offset).limit(limit).all()
        return items, total

    @classmethod
    def get_recommendations(
        cls,
        db: Session,
        user_id: Optional[str] = None,
        service_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 6,
    ) -> List[Service]:
        """Fetch recommended services based on content similarity, user preferences, or target service."""
        # Case 1: Similar to specific service
        if service_id:
            target = db.query(Service).filter(Service.id == service_id).first()
            if target and target.embedding is not None:
                bind = db.get_bind()
                if bind.dialect.name == "postgresql":
                    return (
                        db.query(Service)
                        .filter(Service.status == "PUBLISHED", Service.id != target.id, Service.embedding.isnot(None))
                        .order_by(Service.embedding.cosine_distance(target.embedding))
                        .limit(limit)
                        .all()
                    )
                else:
                    candidates = db.query(Service).filter(Service.status == "PUBLISHED", Service.id != target.id).all()
                    target_vec = list(target.embedding)
                    scored = [
                        (_cosine_similarity(target_vec, list(s.embedding)) if s.embedding is not None else 0.0, s)
                        for s in candidates
                    ]
                    scored.sort(key=lambda x: x[0], reverse=True)
                    return [s for _, s in scored[:limit]]

        # Case 2: Recommendations based on user profile/preferences
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.location:
                items, _ = cls.semantic_search(db, query=f"Experiences and stays near {user.location}", limit=limit)
                if items:
                    return items

        # Case 3: Top-rated default published catalog
        return (
            db.query(Service)
            .filter(Service.status == "PUBLISHED")
            .order_by(desc(Service.rating), desc(Service.reviews_count))
            .limit(limit)
            .all()
        )
