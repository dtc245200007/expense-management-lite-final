import os

from dotenv import load_dotenv


load_dotenv()


def _as_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_list(name: str) -> list[str]:
    value = os.getenv(name, "")
    return [item.strip() for item in value.split(",") if item.strip()]


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"
AUTO_CREATE_SCHEMA = _as_bool("AUTO_CREATE_SCHEMA", not IS_PRODUCTION)
ENABLE_API_DOCS = _as_bool("ENABLE_API_DOCS", not IS_PRODUCTION)
CORS_ORIGINS = _as_list("CORS_ORIGINS")
TRUSTED_HOSTS = _as_list("TRUSTED_HOSTS")
RENDER_EXTERNAL_HOSTNAME = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in TRUSTED_HOSTS:
    TRUSTED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
