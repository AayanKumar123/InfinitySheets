"""Server-side Supabase access via REST (PostgREST + GoTrue).

Uses the SERVICE_ROLE key, which bypasses Row Level Security. This must NEVER
be exposed to the browser. Implemented with `requests` (already a dependency)
to avoid pulling in the heavy supabase-py SDK and its version constraints.

Exposes a tiny chainable query builder so call sites read like the supabase
SDK: admin_client().table("past_papers").select("*").eq(...).execute().data
"""
import os
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def _require_config() -> None:
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env")


class _Query:
    def __init__(self, table: str):
        _require_config()
        self.url = f"{SUPABASE_URL}/rest/v1/{table}"
        self.headers = {
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }
        self.params: Dict[str, str] = {}
        self._method = "GET"
        self._body: Any = None
        self._single = False

    def select(self, cols: str = "*") -> "_Query":
        self.params["select"] = cols
        self._method = "GET"
        return self

    def insert(self, rows) -> "_Query":
        self._method = "POST"
        self._body = rows
        self.headers["Prefer"] = "return=representation"
        return self

    def update(self, patch: Dict[str, Any]) -> "_Query":
        self._method = "PATCH"
        self._body = patch
        self.headers["Prefer"] = "return=representation"
        return self

    def delete(self) -> "_Query":
        self._method = "DELETE"
        self.headers["Prefer"] = "return=representation"
        return self

    def eq(self, col: str, val: Any) -> "_Query":
        self.params[col] = f"eq.{val}"
        return self

    def order(self, col: str, desc: bool = False) -> "_Query":
        self.params["order"] = f"{col}.{'desc' if desc else 'asc'}"
        return self

    def limit(self, n: int) -> "_Query":
        self.params["limit"] = str(n)
        return self

    def single(self) -> "_Query":
        self.headers["Accept"] = "application/vnd.pgrst.object+json"
        self._single = True
        return self

    def execute(self) -> SimpleNamespace:
        resp = requests.request(
            self._method, self.url, headers=self.headers, params=self.params, json=self._body, timeout=30
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase REST {resp.status_code}: {resp.text}")
        data = None
        if resp.text:
            try:
                data = resp.json()
            except ValueError:
                data = None
        return SimpleNamespace(data=data)


class _Client:
    def table(self, name: str) -> _Query:
        return _Query(name)


_CLIENT = _Client()


def admin_client() -> _Client:
    _require_config()
    return _CLIENT


def get_user(token: str) -> Optional[Dict[str, Any]]:
    """Validate a user access token via GoTrue and return the user dict."""
    _require_config()
    resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if resp.status_code != 200:
        return None
    try:
        return resp.json()
    except ValueError:
        return None
