# Namma Gig

A comprehensive platform connecting **Farmers**, **Tourists**, and **Content Creators** for agricultural tourism experiences.

## 📋 Table of Contents

- [About the Website](#about-the-website)
- [How It Works](#how-it-works)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [How to Contribute](#how-to-contribute)

---

## 🌾 About the Website

**Namma Gig** is an agricultural tourism platform that brings together three main user types:

- **Farmers**: Showcase their farms, offer experiences, and earn from tourism activities
- **Tourists**: Discover authentic farm experiences, book trips, and create unforgettable memories
- **Content Creators**: Collaborate with farmers, create content, and monetize their reach

The platform enables farmers to share their agricultural practices, offer farm stays, workshops, and guided tours. Tourists can explore various farming experiences and book their visits. Content creators can promote these experiences and earn referral commissions.

### Key Vision

To promote sustainable agriculture, rural tourism, and create economic opportunities for farming communities while providing authentic experiences to travelers.

---

## 🔄 How It Works

### For Farmers

1. **Register** as a farmer with your farm details
2. **Create Listings** of farm activities, accommodations, and experiences
3. **Manage Bookings** from tourists interested in your farm
4. **Collaborate** with content creators for promotion
5. **Earn Revenue** from bookings and collaborations

### For Tourists

1. **Register** and create a profile
2. **Browse** available farm experiences using search and filters
3. **View AI-Powered Trip Recommendations** based on preferences
4. **Book Experiences** directly from farmers
5. **Manage** your bookings and trips
6. **Leave Reviews** to help other travelers

### For Content Creators

1. **Register** as a content creator
2. **Discover** farm experiences to promote
3. **Create Content** about farms and experiences
4. **Share** with followers
5. **Earn Commissions** from bookings through your referral links

### Key Features

- 🤖 **Unified AI Chatbot**: Personalized trip recommendations and project assistance using advanced AI agents
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔐 **Secure Authentication**: User registration and login with JWT and role-based access
- 💬 **Contact System**: Direct communication between users and support
- 📊 **Advanced Booking Management**: Role-specific dashboards for managing both received bookings and personal travels
- 👤 **Customized Profiles**: Tailored dashboards for Farmers, Tourists, and Content Creators
- 📸 **Rich Media Support**: Showcase farms and creator portfolios with image uploads

---

## 🛠 Tech Stack

### Backend

- **Python 3.8+**
- **FastAPI** - Modern web framework
- **SQLAlchemy** - ORM for database
- **PostgreSQL/SQLite** - Database
- **Pydantic** - Data validation
- **Python-jose** - JWT authentication
- **AI Agent Framework** - For trip recommendations

### Frontend

- **React 18+**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **ESLint** - Code quality
- **Axios / Fetch API** - HTTP requests
- **PostCSS** - CSS processing

---

## 📋 Prerequisites

Before setting up the project, ensure you have:

- **Python 3.8 or higher** (for backend)
- **Node.js 14.0 or higher** (for frontend)
- **npm or yarn** (Node package manager)
- **Git** (for cloning the repository)
- **PostgreSQL or SQLite** (database)

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/priyanshu130018/Namma_Gig.git
cd Namma_Gig
```

### 2. Backend Setup

#### Step 1: Create Virtual Environment

```bash
cd Backend
python -m venv venv
```

**Activate Virtual Environment:**

- On Windows:
  ```bash
  venv\Scripts\activate
  ```
- On macOS/Linux:
  ```bash
  source venv/bin/activate
  ```

#### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

**Common Backend Dependencies:**

- FastAPI
- Uvicorn
- SQLAlchemy
- pydantic
- python-jose
- passlib
- python-multipart

#### Step 3: Database Configuration

Create a `.env` file in the `Backend/` directory:

```env
DATABASE_URL=sqlite:///./test.db
# or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/namma_gig

SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Step 4: Initialize Database

```bash
python main.py
```

The database tables will be created automatically on first run.

#### Step 5: Run Backend Server

```bash
uvicorn main:app --reload --port 8000
```

Backend will be available at: `http://localhost:8000`

**API Documentation:** `http://localhost:8000/docs` (Swagger UI)

---

### 3. Frontend Setup

#### Step 1: Install Dependencies

```bash
cd frontend
npm install
# or
yarn install
```

#### Step 2: Environment Configuration

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
```

#### Step 3: Run Development Server

```bash
npm run dev
# or
yarn dev
```

Frontend will be available at: `http://localhost:5173` (default Vite port)

#### Step 4: Build for Production

```bash
npm run build
# or
yarn build
```

---

## 📁 Project Structure

```
Namma_Gig/
├── README.md
├── .gitignore
│
├── Backend/
│   ├── .gitignore
│   ├── main.py              # Entry point
│   ├── requirements.txt      # Python dependencies
│   ├── ai_agent/            # AI recommendation engine
│   │   ├── recommendations.py
│   │   └── trip_planner.py
│   ├── api/                 # FastAPI application
│   │   ├── api.py
│   │   └── endpoints/       # API route handlers
│   │       ├── auth.py
│   │       ├── farmer.py
│   │       ├── tourist.py
│   │       ├── creator.py
│   │       ├── contact.py
│   │       └── config.py
│   ├── db/                  # Database layer
│   │   ├── database.py      # DB connection
│   │   ├── models.py        # SQLAlchemy models
│   │   └── schemas.py       # Pydantic schemas
│   └── tests/               # Unit tests
│
└── frontend/
    ├── .gitignore
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   ├── auth/            # Authentication pages
    │   │   ├── login.jsx
    │   │   ├── register.jsx
    │   │   └── changePassword.jsx
    │   ├── pages/           # Main pages
    │   │   ├── home.jsx
    │   │   ├── landing.jsx
    │   │   ├── about.jsx
    │   │   ├── contact.jsx
    │   │   └── AIChatbot.jsx
    │   ├── dashboard/       # User-specific dashboards
    │   │   ├── farmers/
    │   │   │   ├── FarmerHome.jsx
    │   │   │   ├── FarmerBookings.jsx
    │   │   │   └── FarmerListings.jsx
    │   │   ├── tourists/
    │   │   │   ├── TouristHome.jsx
    │   │   │   └── TouristBookings.jsx
    │   │   └── creators/
    │   │       ├── CreatorHome.jsx
    │   │       └── CreatorBookings.jsx
    │   ├── components/      # Reusable components
    │   │   ├── layout/      # Header, footer, navbar
    │   │   └── ui/          # Cards, profile, modals, etc.
    │   ├── routes/          # Route configuration
    │   │   └── AppRoutes.jsx
    │   ├── services/        # API service layer
    │   │   └── api.js
    │   └── assets/          # Images, icons
    └── public/              # Static files
```

---

## 📡 API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password (reset)
- `POST /api/auth/change-password/{userId}` - Update password (authenticated)
- `DELETE /api/auth/delete-account/{userId}` - Delete account
- `POST /api/auth/logout` - User logout

### Farmer Endpoints

- `GET /api/farmer/farm-listing` - List all farms
- `GET /api/farmer/listing/{id}` - Get farm details
- `POST /api/services/farmer/register/{id}` - Register as farmer
- `PUT /api/farmer/profile/{id}` - Update farmer profile
- `POST /api/farmer/list/{id}` - Create farm listing
- `GET /api/farmer/bookings/{id}` - Farmer's received and made bookings
- `PUT /api/farmer/booking/{id}/status/{user_id}` - Update booking status

### Tourist Endpoints

- `GET /api/tourists/profile/{id}` - Get tourist details
- `POST /api/services/tourist/register/{id}` - Register as tourist
- `PUT /api/tourists/profile/{id}` - Update tourist profile
- `GET /api/tourists/bookings/{id}` - Tourist's booking history
- `POST /api/tourist/booking/{id}` - Create new booking
- `DELETE /api/tourist/booking/{booking_id}/{user_id}` - Cancel booking

### Content Creator Endpoints

- `GET /api/creator/listing` - List all creators
- `GET /api/creator/{id}` - Get creator details
- `POST /api/services/creator/register/{user_id}` - Register as creator
- `GET /api/creator/profile/{user_id}` - Get creator profile
- `PUT /api/creator/profile/{user_id}` - Update creator profile
- `GET /api/creator/bookings/{user_id}` - Creator's collaborations and bookings
- `PUT /api/creator/booking/{booking_id}/status/{user_id}` - Update collaboration status

### Contact & Support

- `POST /api/contact` - Send contact message
- `GET /api/contact` - Get contact inquiries

### AI Trip Planner

- `POST /api/ai/chat` - Unified AI Chatbot (Farms & Creators)
- `GET /api/farmer/search/{userId}` - Search farms with AI recommendations
- `GET /api/creator/search/{userId}` - Search creators with AI recommendations

---

## 🧪 Testing

### Run Backend Tests

```bash
cd Backend
pytest
# or
python -m pytest -v
```

### Run Frontend Tests

```bash
cd frontend
npm test
```

---

## 🤝 How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** changes: `git commit -am 'Add your feature'`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Submit** a Pull Request

---

## 📝 Environment Variables

### Backend (.env)

```env
DATABASE_URL=sqlite:///./test.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env.local)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
```

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## ✉️ Contact & Support

For questions, suggestions, or support, please contact:

- **Email**: contact@nammgig.com
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for Q&A

---

## 🚀 Deployment

### Deploy Backend to Heroku/Render

```bash
# Create Procfile in Backend directory
echo "web: uvicorn api.api:app --host 0.0.0.0 --port $PORT" > Procfile
git push heroku main
```

### Deploy Frontend to Vercel/Netlify

```bash
cd frontend
npm run build
# Use Vercel/Netlify CLI for deployment
```

---

## 📈 Future Enhancements

- [ ] Multi-language support
- [ ] Payment integration (Stripe/Razorpay)
- [ ] Real-time notifications
- [ ] Video conferencing for consultations
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Weather-based recommendations
- [ ] Sustainability tracking

---

**Made with ❤️ for sustainable agriculture & rural tourism**
