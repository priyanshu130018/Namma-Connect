# Namma Connect

Namma Connect is a modern agritourism platform that bridges the gap between rural farmers, creative content creators, and urban tourists. By fostering an ecosystem of farm stays, rural experiences, and creative collaborations, Namma Connect empowers local farming communities while providing immersive travel experiences.

---

## 🌟 Overview

The platform supports three distinct user roles interacting in a unified market:
1. **Farmers**: Offer farm stays, rural workshops, and agricultural experiences.
2. **Tourists**: Browse, filter, and book farm stays or local activities.
3. **Creators**: Partner with farmers to co-create marketing content, book collaborations, and promote rural tourism.

---

## 🛠️ Tech Stack

### Frontend
- **React (Vite)**: Quick and responsive user interfaces.
- **TailwindCSS**: Modern utility-first styling.

### Backend
- **FastAPI**: Asynchronous, high-performance Python web framework.
- **PostgreSQL**: Production-grade relational database.
- **SQLAlchemy ORM**: Database object-relational mapping.
- **Alembic**: Database schema migration lifecycle management.

### Third-Party Services
- **Cloudinary**: Cloud-based storage and optimization for images/videos.
- **Razorpay**: Safe digital payments and signature verification.
- **Resend Email**: Transactional and welcome email notifications.

### Artificial Intelligence
- **Sentence Transformers**: Generates embeddings for semantic farm recommendations.
- **AI Recommendation Engine**: Recommends properties to creators and tourists based on preference matches.

---

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate   # On Windows
source venv/bin/activate # On Unix/macOS

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start the FastAPI development server
uvicorn main:app --reload
```
The API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Setup

```bash
# Navigate to the React v2 frontend directory
cd frontend/v2

# Install dependencies
npm install

# Start the local development server
npm run dev
```
The React application will be active at [http://localhost:5173](http://localhost:5173).

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/<db_name>

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay Credentials
RAZORPAY_KEY=
RAZORPAY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Resend Email Credentials
RESEND_API_KEY=
```

---

## 📁 Project Documentation

Detailed guides for specific modules are located in the `docs/` folder:
- [Backend Guide](docs/backend.md)
- [Frontend Guide](docs/frontend.md)
- [AI Recommender System](docs/ai.md)
- [Razorpay Payments](docs/payment.md)
- [Cloudinary Media Upload](docs/media.md)
- [Resend Email Notifications](docs/email.md)
- [Full Project Folder Structure](docs/structure.md)
