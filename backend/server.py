from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from typing import Dict

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from past_papers.routes import router as past_papers_router

# Create the main app without a prefix
app = FastAPI(title="InfinitySheets API")

# Router with the /api prefix (k8s ingress routes /api to this backend)
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "InfinitySheets API (Supabase-backed)"}


@api_router.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


# Past-paper question bank + PDF extraction (admin tooling) — persisted to Supabase.
api_router.include_router(past_papers_router)

app.include_router(api_router)

# CORS — allow the preview domain pattern plus localhost for dev.
_cors_env = os.environ.get('CORS_ORIGINS', '').strip()
_frontend_url = os.environ.get('FRONTEND_URL', '').strip()
_explicit = [o.strip() for o in _cors_env.split(',') if o.strip() and o.strip() != '*']
if _frontend_url and _frontend_url not in _explicit:
    _explicit.append(_frontend_url)
if not _explicit:
    _explicit = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_explicit,
    allow_origin_regex=r"https://.*\.preview\.emergentagent\.com",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def _startup() -> None:
    missing = [k for k in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.environ.get(k)]
    if missing:
        logger.warning("Supabase env vars missing: %s — admin/past-paper writes will fail", missing)
    else:
        logger.info("InfinitySheets API ready (Supabase service-role configured)")
