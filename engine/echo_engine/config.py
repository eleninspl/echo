"""Settings loaded from the repo-root .env file (never committed)."""

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
HACKATHON_BASE_URL = "https://hackathon.api.qloo.com"
LLM_BACKENDS = ("openrouter", "claude-cli")
DEFAULT_LLM_MODELS = {"openrouter": "openai/gpt-oss-120b", "claude-cli": "claude-sonnet-5-5"}


def env(*names: str) -> str:
    """The first of `names` that is set."""
    for name in names:
        if value := os.environ.get(name, "").strip():
            return value
    return ""


def with_scheme(url: str) -> str:
    """Upstash's console copies the REST URL without https://, which httpx can't use."""
    return url if not url or "://" in url else f"https://{url}"


class Settings:
    def __init__(self) -> None:
        load_dotenv(REPO_ROOT / ".env")
        self.qloo_api_key = os.environ.get("QLOO_API_KEY", "").strip()
        self.qloo_base_url = os.environ.get("QLOO_BASE_URL", HACKATHON_BASE_URL).rstrip("/")
        self.llm_backend = os.environ.get("ECHO_LLM", "").strip() or "openrouter"
        self.openrouter_api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        self.llm_url = os.environ.get("ECHO_LLM_URL", "").strip().rstrip("/")
        self.cache_dir = Path(os.environ.get("ECHO_CACHE_DIR", REPO_ROOT / ".cache"))
        self.cache_ttl_days = float(os.environ.get("ECHO_CACHE_TTL_DAYS", "7"))
        self.database_url = os.environ.get("DATABASE_URL", "").strip()
        # Upstash's own names, or the ones Vercel's Marketplace integration may set instead.
        self.upstash_url = with_scheme(env("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"))
        self.upstash_token = env("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN")
        self.mock = os.environ.get("ECHO_MOCK", "").strip() == "1"
        self.web_origins = [
            origin.strip()
            for origin in os.environ.get("ECHO_WEB_ORIGINS", "http://localhost:3000").split(",")
            if origin.strip()
        ]
        self.llm_model = os.environ.get("ECHO_LLM_MODEL", "").strip() or DEFAULT_LLM_MODELS.get(self.llm_backend, "")
        self.daily_qloo_calls = int(os.environ.get("ECHO_DAILY_QLOO_CALLS", "3000"))
        self.featured = [show.strip() for show in os.environ.get("ECHO_FEATURED", "").split(",") if show.strip()]
        self.on_vercel = os.environ.get("VERCEL") == "1"

    def missing_on_vercel(self) -> list[str]:
        """What a deployed engine can't run without: an instance there has no disk to fall back to."""
        needed = {
            "QLOO_API_KEY": self.qloo_api_key,
            "DATABASE_URL": self.database_url,
            "UPSTASH_REDIS_REST_URL": self.upstash_url,
            "UPSTASH_REDIS_REST_TOKEN": self.upstash_token,
        }
        return [name for name, value in needed.items() if not value]


@lru_cache
def get_settings() -> Settings:
    return Settings()
