# AI Recommendation System

Namma Connect implements an intelligent matching engine that helps creators and tourists discover the best farm listings tailored to their preferences, interests, and profile bios.

---

## 🧠 Semantic Embeddings

Rather than relying purely on keyword matches (e.g. searching "organic"), the recommender system uses semantic search:

- **Library**: `sentence-transformers`
- **Model**: Generates high-dimensional vector representations (embeddings) of text profiles, search queries, and farm descriptions.
- **Matching Metric**: Measures the cosine similarity between user preferences (or search input) and farm listing profiles.
- **Fallback**: If the machine learning packages are not fully loaded in the current runtime environment, the engine uses a robust keyword-frequency lexical fallback to ensure recommendations are always returned without crashing the request.

---

## 🚀 Future Roadmap: vector database (`pgvector`)

As the number of listings grows, computing cosine similarities in-memory for every query becomes slow. The next phase of production upgrades will move embeddings into the database:

1. **pgvector extension**: Enable `pgvector` in PostgreSQL to store embeddings in a native `vector` data type column.
2. **Database Indices**: Create IVFFlat or HNSW indices directly on the vector column.
3. **Optimized Queries**: Query similar items using standard SQL:
   ```sql
   SELECT * FROM farm_listing ORDER BY description_embedding <=> :query_embedding LIMIT 5;
   ```
