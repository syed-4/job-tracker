import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

# A separate in-memory database, so tests never touch your real data
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def fresh_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def signup_and_login(client, email="test@example.com", password="secret123"):
    client.post("/signup", json={"email": email, "password": password})
    response = client.post("/login", data={"username": email, "password": password})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth tests ----------

def test_root(client):
    response = client.get("/")
    assert response.status_code == 200


def test_signup_success(client):
    response = client.post("/signup", json={"email": "a@example.com", "password": "secret123"})
    assert response.status_code == 200
    assert response.json()["email"] == "a@example.com"
    assert "password" not in response.json()


def test_signup_duplicate_email(client):
    client.post("/signup", json={"email": "a@example.com", "password": "secret123"})
    response = client.post("/signup", json={"email": "a@example.com", "password": "secret123"})
    assert response.status_code == 400


def test_login_wrong_password(client):
    client.post("/signup", json={"email": "a@example.com", "password": "secret123"})
    response = client.post("/login", data={"username": "a@example.com", "password": "wrong"})
    assert response.status_code == 401


def test_protected_route_needs_token(client):
    response = client.get("/applications")
    assert response.status_code == 401


# ---------- Application tests ----------

def test_create_and_list_application(client):
    headers = signup_and_login(client)
    created = client.post(
        "/applications",
        json={"company": "Google", "role": "Python Developer"},
        headers=headers,
    )
    assert created.status_code == 201
    assert created.json()["status"] == "Applied"

    listed = client.get("/applications", headers=headers)
    assert len(listed.json()) == 1
    assert listed.json()[0]["company"] == "Google"


def test_update_application_status(client):
    headers = signup_and_login(client)
    job = client.post(
        "/applications",
        json={"company": "Google", "role": "Developer"},
        headers=headers,
    ).json()

    response = client.patch(f"/applications/{job['id']}", json={"status": "Interview"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Interview"
    assert response.json()["company"] == "Google"  # other fields unchanged


def test_invalid_status_rejected(client):
    headers = signup_and_login(client)
    response = client.post(
        "/applications",
        json={"company": "Google", "role": "Developer", "status": "Banana"},
        headers=headers,
    )
    assert response.status_code == 422


def test_delete_application(client):
    headers = signup_and_login(client)
    job = client.post(
        "/applications",
        json={"company": "Google", "role": "Developer"},
        headers=headers,
    ).json()

    assert client.delete(f"/applications/{job['id']}", headers=headers).status_code == 204
    assert client.get(f"/applications/{job['id']}", headers=headers).status_code == 404


def test_users_cannot_see_each_others_applications(client):
    headers_1 = signup_and_login(client, "user1@example.com")
    headers_2 = signup_and_login(client, "user2@example.com")

    job = client.post(
        "/applications",
        json={"company": "Google", "role": "Developer"},
        headers=headers_1,
    ).json()

    assert client.get("/applications", headers=headers_2).json() == []
    assert client.get(f"/applications/{job['id']}", headers=headers_2).status_code == 404
    assert client.patch(f"/applications/{job['id']}", json={"status": "Offer"}, headers=headers_2).status_code == 404
    assert client.delete(f"/applications/{job['id']}", headers=headers_2).status_code == 404