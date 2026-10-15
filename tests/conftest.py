import os
import uuid

# Set before importing app modules; never load the original project's .env/database.
os.environ["SECRET_KEY"] = "lite-tests-only-signing-key-never-used-for-demo"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AUTO_CREATE_SCHEMA"] = "false"
os.environ["ENABLE_API_DOCS"] = "true"
os.environ["TRUSTED_HOSTS"] = "testserver,localhost,127.0.0.1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import CreateSchema, DropSchema

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_factory():
    postgres_url = os.getenv("LITE_TEST_DATABASE_URL")
    if postgres_url:
        if not postgres_url.startswith("postgresql+psycopg://"):
            raise ValueError("LITE_TEST_DATABASE_URL must point to a dedicated PostgreSQL test database")
        base_engine = create_engine(postgres_url)
        schema = "lite_test_" + uuid.uuid4().hex
        with base_engine.begin() as connection:
            connection.execute(CreateSchema(schema))
        engine = base_engine.execution_options(schema_translate_map={None: schema})
        try:
            Base.metadata.create_all(engine)
            yield sessionmaker(bind=engine)
        finally:
            with base_engine.begin() as connection:
                connection.execute(DropSchema(schema, cascade=True))
            base_engine.dispose()
        return
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    yield factory
    engine.dispose()


@pytest.fixture
def client(db_factory):
    def test_db():
        with db_factory() as db:
            yield db
    app.dependency_overrides[get_db] = test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def register_and_login(client, username="owner"):
    response = client.post("/api/auth/register", json={"username": username, "email": f"{username}@example.com", "password": "test-password-123"})
    assert response.status_code == 200, response.text
    response = client.post("/api/auth/login", data={"username": username, "password": "test-password-123"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
