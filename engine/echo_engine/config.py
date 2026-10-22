"""Settings loaded from the repo-root .env file (never committed)."""

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
HACKATHON_BASE_URL = "https://hackathon.api.qloo.com"


class Settings:
    def __init__(self) -> None:
        load_dotenv(REPO_ROOT / ".env")
        self.qloo_api_key = os.environ.get("QLOO_API_KEY", "").strip()
        self.qloo_base_url = os.environ.get("QLOO_BASE_URL", HACKATHON_BASE_URL).rstrip("/")
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        self.cache_dir = Path(os.environ.get("ECHO_CACHE_DIR", REPO_ROOT / ".cache"))
        self.cache_ttl_days = float(os.environ.get("ECHO_CACHE_TTL_DAYS", "7"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
