"""Generate Gemini Vector Embeddings for Services in NammaConnect V2."""

import sys
import os
import time

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.service import Service
from app.services.embedding import EmbeddingService


def generate_service_embeddings(db: Session, batch_size: int = 50):
    """Generate and store 768-dimensional Gemini embeddings for all services missing vectors."""
    print("\n========================================================")
    print("  NAMMA CONNECT V2 — GEMINI EMBEDDING GENERATOR")
    print("========================================================")

    services_to_embed = db.query(Service).filter(Service.embedding.is_(None)).all()
    total_to_embed = len(services_to_embed)
    total_services = db.query(Service).count()

    print(f"  Total Services in Database:    {total_services}")
    print(f"  Services Needing Embeddings:   {total_to_embed}")

    if total_to_embed == 0:
        print("[INFO] All services already have embeddings generated.")
        print("========================================================\n")
        return

    generated_count = 0
    failed_count = 0
    start_time = time.time()

    for i in range(0, total_to_embed, batch_size):
        batch = services_to_embed[i : i + batch_size]
        texts = [EmbeddingService.build_searchable_text(s) for s in batch]
        
        try:
            embeddings = EmbeddingService.batch_generate_embeddings(texts, batch_size=batch_size)
            for srv, vec in zip(batch, embeddings):
                if len(vec) == EmbeddingService.VECTOR_DIMENSION:
                    srv.embedding = vec
                    generated_count += 1
                else:
                    failed_count += 1
            db.commit()
            print(f"  Progress: {min(i + batch_size, total_to_embed)}/{total_to_embed} embeddings processed...")
        except Exception as e:
            print(f"  [ERROR] Batch processing error: {e}")
            for srv in batch:
                try:
                    txt = EmbeddingService.build_searchable_text(srv)
                    vec = EmbeddingService.generate_embedding(txt)
                    srv.embedding = vec
                    db.commit()
                    generated_count += 1
                except Exception as s_err:
                    failed_count += 1
                    print(f"    Failed for service '{srv.title}': {s_err}")

    elapsed = time.time() - start_time
    print("\n========================================================")
    print("  EMBEDDING GENERATION COMPLETE")
    print("========================================================")
    print(f"  Total Processed:       {total_to_embed}")
    print(f"  Successfully Stored:   {generated_count}")
    print(f"  Failed:                {failed_count}")
    print(f"  Time Elapsed:          {elapsed:.2f} seconds")
    if generated_count > 0:
        print(f"  Average Rate:          {generated_count / elapsed:.1f} embeddings/sec")
    print("========================================================\n")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        generate_service_embeddings(db)
    finally:
        db.close()
