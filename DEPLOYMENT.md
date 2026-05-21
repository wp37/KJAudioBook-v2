# Deployment Guide: KJAudioBook

This is a full-stack application with:
- **Frontend**: React + Vite (Node.js)
- **Backend**: FastAPI + Python

## Deployment Strategy

You have two options:

### Option 1: Frontend on Vercel + Backend on Render (Recommended)
**Pros**: Easy, fast, clear separation of concerns.
**Cost**: Both free tier available.

### Option 2: Full-Stack on Railway or Render
**Pros**: Simpler to manage, one dashboard.
**Cost**: One platform to maintain.

---

## Option 1: Frontend (Vercel) + Backend (Render)

### Step 1: Prepare Backend for Deployment

1. Create a `.env` file in the root directory with:
```
FLOWKIT_BROWSER_API_KEY=your_api_key
DATABASE_URL=sqlite:///jobs.db
FRONTEND_URL=https://your-frontend-domain.vercel.app
PORT=8000
```

2. Ensure `Procfile` exists in the root:
```
web: cd audiobook_builder && uvicorn server:app --host 0.0.0.0 --port $PORT
```

3. The `requirements.txt` in `audiobook_builder/` must include:
   - `fastapi`
   - `uvicorn`
   - `python-dotenv`
   - All other dependencies

### Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up (free).
2. Click **New > Web Service**.
3. Connect your GitHub repository (or upload files manually).
4. Configure:
   - **Name**: `kjaudoiobook-api` (or any name)
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r audiobook_builder/requirements.txt`
   - **Start Command**: `cd audiobook_builder && uvicorn server:app --host 0.0.0.0 --port 8000`
   - **Environment Variables**:
     - `FLOWKIT_BROWSER_API_KEY`: your API key
     - `FRONTEND_URL`: your Vercel frontend domain
5. Click **Deploy**.
6. Once deployed, copy the **live URL** (e.g., `https://kjaudoiobook-api.onrender.com`).

### Step 3: Update Frontend Config

Edit `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

Create `.env.local` in the `frontend/` directory:
```
VITE_API_URL=https://kjaudoiobook-api.onrender.com
```

Update your API calls in the code to use:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

### Step 4: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free).
2. Click **Add New > Project**.
3. Select your GitHub repository.
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://kjaudoiobook-api.onrender.com`
5. Click **Deploy**.
6. Once done, you'll get a live URL (e.g., `https://kjaudoiobook-frontend.vercel.app`).

### Step 5: Update Backend CORS

Update `audiobook_builder/server.py` to include your Vercel domain in CORS:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local dev
        "https://your-vercel-app.vercel.app",  # Production Vercel
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Option 2: Full-Stack on Railway

### Step 1: Prepare Project Structure

Ensure your root has:
- `Procfile` (for web service)
- `requirements.txt` (for Python dependencies) **or** symlink to `audiobook_builder/requirements.txt`

Railway can handle monorepos. Create a root `requirements.txt` that includes all dependencies:

```bash
# From workspace root, copy backend dependencies
cp audiobook_builder/requirements.txt ./requirements.txt
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up (GitHub login recommended).
2. Click **New Project > GitHub Repo** (or paste repo link).
3. Select this repository.
4. Railway auto-detects:
   - **Python** environment
   - **Procfile** for start command
5. Add environment variables in Railway dashboard:
   - `FLOWKIT_BROWSER_API_KEY`: your API key
   - `NODE_ENV`: `production`
6. Add a **Node.js service** for the frontend:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd frontend && npm run preview` or use a static file server
7. Link both services.
8. Deploy.

---

## Important Notes

### OmniVoice Model & GPU
- **OmniVoice** requires:
  - Significant disk space (model weights ~3GB+)
  - CUDA-compatible GPU for performance
  - Free tier services may **not** have GPU
  
**Solution for Production**:
- Download and cache the model locally during build.
- Consider using a lighter TTS alternative for cloud deployment (e.g., Google Cloud Text-to-Speech, AWS Polly).
- Or use a dedicated GPU provider (Lambda Labs, Runwayml, etc.).

### Database
- Currently using SQLite (`jobs.db`).
- SQLite works on Render/Railway but files are not persisted after redeploy.
- **For production**: Use PostgreSQL (free tier on Render, Railway, or Heroku).

Example migration:
```python
# Replace in flow_service.py
import os
from sqlalchemy import create_engine

DB_URL = os.getenv("DATABASE_URL", "sqlite:///jobs.db")
engine = create_engine(DB_URL)
```

### Voice Cloning / Reference Files
- Voice reference files (`Voice_ref/*.wav`) are not in the repo.
- You must upload them or store in cloud storage (AWS S3, Google Cloud Storage).
- Update `audio_generator.py` to fetch from cloud storage.

---

## Quick Deployment Checklist

- [ ] Update `requirements.txt` with `fastapi`, `uvicorn`, `python-dotenv`
- [ ] Create `.env.example` file
- [ ] Ensure `Procfile` exists in root
- [ ] Update `frontend/vite.config.ts` with API proxy
- [ ] Create `frontend/.env.local` with `VITE_API_URL`
- [ ] Set CORS origins in `server.py` for your domain
- [ ] Deploy backend (Render/Railway)
- [ ] Deploy frontend (Vercel)
- [ ] Test API calls from frontend
- [ ] Monitor logs for errors

---

## Local Testing Before Deployment

```powershell
# Terminal 1: Backend
cd audiobook_builder
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` and verify API calls work.

---

## Support & Troubleshooting

- **Backend 500 errors**: Check Render/Railway logs for Python exceptions.
- **CORS errors**: Verify `FRONTEND_URL` env var and update `server.py` CORS origins.
- **Frontend blank page**: Check browser console for API errors.
- **GPU/Model issues**: Switch to lighter TTS or use a dedicated ML platform.

Good luck! 🚀
