# Project Folder Structure

This document outlines the directory structure of the **Namma Connect** repository.

---

## 📁 Repository Layout

```
namma_connect/
│
├── docs/                             # Detailed module documentation
│   ├── backend.md                    # Backend guides
│   ├── frontend.md                   # Frontend architecture
│   ├── ai.md                         # Recommender systems details
│   ├── payment.md                    # Razorpay payment flow
│   ├── media.md                      # Cloudinary media uploads
│   ├── email.md                      # Transactional email guides
│   └── structure.md                  # This file
│
├── frontend/                         # Frontend client workspace
│   ├── v1/                           # Legacy design views
│   └── v2/                           # React (Vite) + Tailwind CSS application
│
└── backend/                          # FastAPI server workspace
    ├── alembic/                      # Alembic migrations scripts
    │   └── versions/                 # Individual migration revisions
    │
    ├── app/                          # Main application code
    │   ├── core/                     # Core configs (database, settings, logger)
    │   ├── models/                   # SQLAlchemy database schemas/models
    │   ├── schemas/                  # Pydantic serialization schemas
    │   ├── routes/                   # Route handlers / controllers
    │   ├── services/                 # Business logic / transaction layers
    │   ├── dependencies/             # JWT auth validation & rate limiters
    │   └── ai/                       # recommendation & chatbot engines
    │
    ├── tests/                        # Test suite files
    │   ├── test_flows.py             # User registration and login tests
    │   ├── test_new_features.py      # Cloudinary and Resend mock tests
    │   └── test_production_upgrades.py # Webhooks, exception formats, & rate limit tests
    │
    ├── alembic.ini                   # Alembic configuration file
    ├── main.py                       # Root startup executable file (starts app/main.py)
    ├── requirements.txt              # Backend python package dependencies
    └── .env                          # Local credentials file (ignored by Git)
```
