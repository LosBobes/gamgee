from fastapi.testclient import TestClient


def test_register_creates_user(client: TestClient):
    res = client.post("/api/auth/register", json={"username": "alice", "password": "secret123"})
    assert res.status_code == 201
    body = res.json()
    assert body["username"] == "alice"
    assert "id" in body
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_username_fails(client: TestClient):
    client.post("/api/auth/register", json={"username": "alice", "password": "secret123"})
    res = client.post("/api/auth/register", json={"username": "alice", "password": "other"})
    assert res.status_code == 400
    assert "taken" in res.json()["detail"].lower()


def test_login_returns_bearer_token(client: TestClient):
    client.post("/api/auth/register", json={"username": "bob", "password": "hunter22"})
    res = client.post(
        "/api/auth/login",
        data={"username": "bob", "password": "hunter22"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401(client: TestClient):
    client.post("/api/auth/register", json={"username": "carol", "password": "rightpass"})
    res = client.post(
        "/api/auth/login",
        data={"username": "carol", "password": "wrongpass"},
    )
    assert res.status_code == 401


def test_me_requires_auth(client: TestClient):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_me_returns_current_user(client: TestClient, auth_headers, auth_token):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert "username" in res.json()


def test_change_password_flow(client: TestClient):
    client.post("/api/auth/register", json={"username": "dave", "password": "oldpass12"})
    login = client.post("/api/auth/login", data={"username": "dave", "password": "oldpass12"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "wrong", "new_password": "newpass12"},
    )
    assert bad.status_code == 400

    short = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "oldpass12", "new_password": "short"},
    )
    assert short.status_code == 400

    ok = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "oldpass12", "new_password": "newpass12"},
    )
    assert ok.status_code == 204

    # Old password should no longer work; new one should.
    assert client.post("/api/auth/login", data={"username": "dave", "password": "oldpass12"}).status_code == 401
    assert client.post("/api/auth/login", data={"username": "dave", "password": "newpass12"}).status_code == 200


def test_invalid_token_returns_401(client: TestClient):
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401
