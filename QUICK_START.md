# Quick Start: Deploy KJAudioBook

This guide walks you through deploying the KJAudioBook app in **5 minutes**.

## Pre-Deployment Checklist

- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] Render account (free) OR Railway account (free)
- [ ] Your repository pushed to GitHub

---

## 🚀 Option A: Fastest Setup (Vercel + Render)

### 1. Deploy Backend to Render (2 min)

1. Go to [render.com](https://render.com) and sign up
2. Click **New > Web Service**
3. Connect your GitHub repo (or paste the repo URL)
4. Fill in:
   - **Name**: `kjaudoiobook-api`
   - **Runtime**: `Python 3.11`
   - **Build Command**: `pip install -r audiobook_builder/requirements.txt`
   - **Start Command**: `cd audiobook_builder && uvicorn server:app --host 0.0.0.0 --port 8000`
5. Scroll down to **Environment Variables** and add:
   ```
   FLOWKIT_BROWSER_API_KEY = your_api_key_here
   ```
6. Click **Deploy** and wait ~2-3 minutes

**Note your Backend URL** (e.g., `https://kjaudoiobook-api.onrender.com`)

---

### 2. Deploy Frontend to Vercel (2 min)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **Add New > Project**
3. Select your GitHub repository
4. Vercel auto-detects:
   - **Framework**: Vite ✓
   - **Root Directory**: `frontend` ✓
   - **Build Command**: `npm run build` ✓
   - **Output Directory**: `dist` ✓
5. Add **Environment Variable**:
   ```
   VITE_API_URL = https://kjaudoiobook-api.onrender.com
   ```
   (Replace with your Render backend URL from step 1)
6. Click **Deploy** and wait ~1 minute

**Your app is now live!** 🎉

---

## 📝 Update Backend CORS (Important!)

1. In your code editor, open `audiobook_builder/server.py`
2. Find the `ALLOWED_ORIGINS` list (around line 30)
3. Replace the `FRONTEND_URL` variable with your Vercel domain:
   ```python
   FRONTEND_URL = "https://your-app-name.vercel.app"
   ```
4. **Commit and push** the change to GitHub:
   ```bash
   git add audiobook_builder/server.py
   git commit -m "Update CORS for production domain"
   git push
   ```
5. Render will auto-redeploy. Wait ~1-2 minutes.

---

## � Setup Gemini API (Required)

### Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click **Create API Key**
3. Copy the key
4. Add to Render environment variables:
   ```
   GEMINI_API_KEY = your_copied_api_key
   ```

The app uses Gemini to generate audiobook scripts with emotion detection and character voices.

---

## 🧪 Test Your Deployment

1. Open your Vercel frontend URL
2. Open **browser console** (F12 > Console tab)
3. Try a feature that calls the backend (e.g., generate audio)
4. Check for errors:
   - ❌ **CORS error**: Update `FRONTEND_URL` in `server.py` (see above)
   - ❌ **Network 404**: Backend service may be offline (check Render logs)
   - ❌ **Gemini error**: Verify `GEMINI_API_KEY` is set correctly in Render
   - ✅ **Success**: Audio/video generates successfully

---

## ⚙️ Advanced: Persistent Database (Optional)

By default, the app uses SQLite which resets after each Render redeploy.

To persist data, upgrade to PostgreSQL:

1. On Render, go to **Dashboard > New > PostgreSQL**
2. Create a free database
3. Copy the **Internal Database URL**
4. Go back to your web service > **Environment > Add Variable**:
   ```
   DATABASE_URL = your_postgres_url_here
   ```
5. In `audiobook_builder/flow_service.py`, update the DB connection to use the env var

---

## 🎤 Voice Cloning Setup (Optional)

By default, the backend uses random voices. To add custom voices:

1. Create a `Voice_ref/` folder in `audiobook_builder/`
2. Add `.wav` files with names like:
   - `character_name_voice.wav` (real voice clone)
   - `character_name_synthetic.wav` (synthetic variation)
3. Commit and push to GitHub
4. Render auto-redeploys

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| Frontend loads but buttons don't work | Check browser console for API errors. Update `FRONTEND_URL` in `server.py` |
| Backend returns 500 error | Check Render logs. May need more resources or fix Python dependency |
| Database resets after deploy | Switch to PostgreSQL (see above) |
| Slow audio generation | OmniVoice requires GPU. Consider using Google Cloud TTS instead |

---

## 📚 Full Deployment Guide

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Questions?** Check the logs:
- **Frontend logs**: Vercel Dashboard > Deployments > Logs
- **Backend logs**: Render Dashboard > Web Service > Logs

Good luck! 🚀
