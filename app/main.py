from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app import models
from app.core.config import (
    AUTO_CREATE_SCHEMA,
    CORS_ORIGINS,
    ENABLE_API_DOCS,
    TRUSTED_HOSTS,
)
from app.core.schema_migrations import (
    ensure_category_icon_column,
    ensure_goal_completion_columns,
    ensure_user_profile_columns,
)
from app.database import Base, engine
from app.routers import auth, categories, dashboard, reports, transactions


if AUTO_CREATE_SCHEMA:
    Base.metadata.create_all(bind=engine)
    ensure_category_icon_column(engine)
    ensure_goal_completion_columns(engine)
    ensure_user_profile_columns(engine)

app = FastAPI(
    title="Expense Tracker Lite API",
    docs_url="/api/docs" if ENABLE_API_DOCS else None,
    redoc_url="/api/redoc" if ENABLE_API_DOCS else None,
    openapi_url="/api/openapi.json" if ENABLE_API_DOCS else None,
)

if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

if TRUSTED_HOSTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=TRUSTED_HOSTS)

API_PREFIX = "/api"
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(categories.router, prefix=API_PREFIX)
app.include_router(transactions.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", tags=["system"])
def healthcheck():
    return {"status": "ok"}


@app.get(f"{API_PREFIX}/ready", tags=["system"])
def readiness_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database is unavailable") from exc
    return {"status": "ready"}


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    """Serve the built React app and preserve client-side routes on port 8000."""
    if full_path == "api" or full_path.startswith("api/") or full_path == "uploads" or full_path.startswith("uploads/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    index_file = FRONTEND_DIST / "index.html"
    if not index_file.is_file():
        raise HTTPException(
            status_code=503,
            detail="Frontend has not been built. Run `npm.cmd run build` in the frontend directory.",
        )

    requested_file = (FRONTEND_DIST / full_path).resolve()
    try:
        requested_file.relative_to(FRONTEND_DIST.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="File not found") from exc

    if full_path and requested_file.is_file():
        return FileResponse(requested_file)

    return FileResponse(index_file, headers={"Cache-Control": "no-store"})
