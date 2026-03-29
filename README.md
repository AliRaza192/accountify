# AI Accounts

AI-Native Accounting System for Pakistani Businesses

## Tech Stack

### Frontend
- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Zustand
- Recharts
- Supabase

### Backend
- FastAPI
- SQLAlchemy
- Pydantic v2
- Google Gemini 2.0 Flash API
- Google ADK (AI Agents)

### Database
- Supabase (PostgreSQL)

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Google Gemini API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env .env.local
# Edit .env.local with your actual values
```

5. Run the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your actual values
```

4. Run the frontend:
```bash
npm run dev
```

## Environment Variables

### Backend (.env)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `GEMINI_API_KEY`: Your Google Gemini API key
- `SECRET_KEY`: Secret key for JWT token generation
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time (default: 1440)
- `BACKEND_CORS_ORIGINS`: Allowed CORS origins

### Frontend (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8000)
- `NEXT_PUBLIC_APP_NAME`: Application name (default: AI Accounts)

## Docker Setup

Build and run with Docker Compose:
```bash
docker-compose up --build
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Development

Using Make (optional):
```bash
make install    # Install all dependencies
make dev        # Run both frontend and backend
make build      # Build frontend for production
```

## License

MIT
