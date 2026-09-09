"""FastAPI auth dependencies backed by Supabase Auth (GoTrue).

The project uses legacy HS256-signed JWTs, so instead of verifying against a
JWKS endpoint we validate the presented access token through GoTrue
(`GET /auth/v1/user`), which is authoritative. Admin gating reads
profiles.role using the service-role client.
"""
from fastapi import HTTPException, Request

from supabase_client import admin_client, get_user


def _extract_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.cookies.get("access_token")


async def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_user(token)
    if not user or not user.get("id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"id": user["id"], "email": user.get("email")}


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    try:
        res = (
            admin_client()
            .table("profiles")
            .select("role")
            .eq("id", user["id"])
            .single()
            .execute()
        )
        role = (res.data or {}).get("role") if isinstance(res.data, dict) else None
    except Exception:
        role = None
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
