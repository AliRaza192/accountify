# AI Accounts System - Deployment Guide

## Overview

This guide covers deployment options for the AI Accounts system on various platforms.

## Prerequisites

- Supabase account with database set up
- Gemini API key for AI features
- Domain name (optional)

## Environment Variables

### Backend (.env)

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret
DATABASE_URL=your_database_url
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_secret_key_for_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment Options

### Option 1: Vercel (Frontend) + Render (Backend)

#### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Backend (Render)

1. Create new Web Service on Render
2. Connect GitHub repository
3. Set root directory to `backend`
4. Add environment variables
5. Deploy

```bash
# Or use Render CLI
render deploy
```

### Option 2: Docker Deployment

#### Build Images

```bash
# Backend
cd backend
docker build -t ai-accounts-backend .

# Frontend
cd frontend
docker build -t ai-accounts-frontend .
```

#### Run with Docker Compose

```bash
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Option 3: Railway

1. Connect GitHub to Railway
2. Create two services (frontend/backend)
3. Set environment variables
4. Deploy automatically on push

### Option 4: Self-Hosted (VPS)

#### Backend

```bash
# Install Python 3.12
sudo apt update
sudo apt install python3.12 python3.12-venv

# Set up virtual environment
cd /var/www/ai-accounts/backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Frontend

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Build and run
cd /var/www/ai-accounts/frontend
npm install
npm run build
pm2 start npm --name "ai-accounts-frontend" -- start
```

#### Nginx Configuration

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
```

## CI/CD with GitHub Actions

The included workflow (`.github/workflows/deploy.yml`) automatically:

1. Runs backend tests on push/PR
2. Builds frontend application
3. Deploys to Vercel (frontend)
4. Deploys to Render (backend)

### Required Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `SECRET_KEY`
- `NEXT_PUBLIC_API_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_SERVICE_ID`
- `RENDER_API_KEY`

## Database Setup

Run the SQL migration in Supabase SQL Editor:

```sql
-- See backend/database_setup.sql
```

## Monitoring

### Health Checks

- Backend: `GET /health`
- Frontend: `GET /health` (Next.js default)

### Logs

- Vercel: Dashboard → Logs
- Render: Dashboard → Logs
- Docker: `docker-compose logs -f`

## SSL/TLS

- Vercel: Automatic HTTPS
- Render: Automatic HTTPS
- Self-hosted: Use Let's Encrypt with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Scaling

### Horizontal Scaling

- Vercel: Automatic based on traffic
- Render: Upgrade plan or add instances
- Docker: Use Kubernetes or Docker Swarm

### Database

- Supabase: Upgrade plan for more connections
- Consider connection pooling with PgBouncer

## Backup

### Database

- Supabase: Automatic daily backups
- Manual: `pg_dump` command

### Files

- Supabase Storage: Automatic backups
- Configure S3 bucket for additional backup

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check `BACKEND_CORS_ORIGINS` in backend config
2. **Database Connection**: Verify `DATABASE_URL` and Supabase credentials
3. **Build Failures**: Check Node.js/Python versions match requirements

### Support

- GitHub Issues
- Documentation: `/docs` folder
- Email: support@ai-accounts.com
