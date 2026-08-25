# Backend Documentation

The backend of **Namma Connect** is powered by a modular, production-ready FastAPI application. It is structured around the **Separation of Concerns (SoC)** principle, separating API routing from business logic and database persistence.

---

## 📁 Architecture Flow

Every HTTP request follows a strict layer sequence:

```
[ HTTP Request ] ──> [ Routes Layer ] ──> [ Services Layer ] ──> [ Models Layer ] ──> [ Database ]
```

1. **Routes Layer (`app/routes/`)**: Exposes the REST API endpoints, parses parameters, performs validation checks, checks rate limits, and delegates processing to the services layer.
2. **Services Layer (`app/services/`)**: Implements the actual business logic, calculations, date overlap checks, payments logging, and transactional notifications.
3. **Models Layer (`app/models/`)**: Manages the SQLAlchemy ORM declarations matching the database tables.

---

## 🔐 Security & JWT Authentication

- **Password Hashing**: Passwords are secure-hashed using `bcrypt` (configured via `passlib`) before storage.
- **JWT Verification**:
  - The JWT Token is signed with `HS256` and contains the user identity (`sub`) and user type (`role`).
  - Security helper `get_current_user` in `app/dependencies/auth.py` reads the token from the HTTP Authorization header (`Bearer <token>`), validates its signature, and resolves the database `Login` record.
  - Role-based restrictions are enforced by passing the `RoleChecker(["farmer"])` or `RoleChecker(["creator"])` dependency to specific endpoints.

---

## 🗄️ PostgreSQL + Alembic

We manage database schemas declaratively with SQLAlchemy and use Alembic to handle changes:

1. **Base Metadata**: Configured in `app/core/database.py`. All model declarations are registered in `app/models/__init__.py` to make them discoverable.
2. **Running Migrations**:
   ```bash
   # Upgrades database to the latest schema
   alembic upgrade head
   ```
3. **Creating Migrations**:
   ```bash
   # Generates a new migration revision automatically
   alembic revision --autogenerate -m "describe_change"
   ```
