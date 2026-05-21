# --- Fix for Windows ConnectionResetError in asyncio ---
import sys
if sys.platform == "win32":
    import asyncio
    from functools import wraps
    try:
        from asyncio.proactor_events import _ProactorBasePipeTransport
        _orig = _ProactorBasePipeTransport._call_connection_lost

        @wraps(_orig)
        def _silence(self, *args, **kwargs):
            try:
                return _orig(self, *args, **kwargs)
            except (ConnectionResetError, RuntimeError):
                pass

        _ProactorBasePipeTransport._call_connection_lost = _silence
    except ImportError:
        pass
# -------------------------------------------------------

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from routers import audio, video, script, assets, export, project, flowkit

# Get environment variables
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    FRONTEND_URL,
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Khởi chạy hệ thống Background Job Polling cho FlowKit...")
    asyncio.create_task(flowkit.poll_jobs_loop())
    yield


app = FastAPI(title="Audiobook Factory Studio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio.router)
app.include_router(video.router)
app.include_router(script.router)
app.include_router(assets.router)
app.include_router(export.router)
app.include_router(project.router)
app.include_router(flowkit.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
