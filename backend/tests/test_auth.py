from fastapi.testclient import TestClient

# Strong password matching the policy: 12+ chars, lower/upper/digit/symbol,
# not in the common-passwords blocklist and not containing the username.
STRONG_PW = "Str0ng-Test-Pass!"


def _new_user(username: str, password: str = STRONG_PW, **overrides):
    payload = {
        "username": username,
        "password": password,
        "name": "Test User",
        "email": f"{username}@example.com",
        "gender": "prefer_not_to_say",
    }
    payload.update(overrides)
    return payload


def test_register_creates_user(client: TestClient):
    res = client.post("/api/auth/register", json=_new_user("alice"))
    assert res.status_code == 201
    body = res.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "id" in body
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_username_fails(client: TestClient):
    client.post("/api/auth/register", json=_new_user("alice"))
    res = client.post("/api/auth/register", json=_new_user("alice", email="other@example.com"))
    assert res.status_code == 400
    assert "taken" in res.json()["detail"].lower()


def test_register_rejects_weak_password(client: TestClient):
    res = client.post("/api/auth/register", json=_new_user("weakguy", password="password"))
    # Pydantic validation surfaces as 422 with details from password_policy.
    assert res.status_code == 422


def test_login_returns_bearer_token(client: TestClient):
    client.post("/api/auth/register", json=_new_user("bob"))
    res = client.post(
        "/api/auth/login",
        data={"username": "bob", "password": STRONG_PW},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401(client: TestClient):
    client.post("/api/auth/register", json=_new_user("carol"))
    res = client.post(
        "/api/auth/login",
        data={"username": "carol", "password": "Wrong-Pass-12345!"},
    )
    assert res.status_code == 401


def test_login_username_is_case_insensitive(client: TestClient):
    # Registered with mixed case; a different-case attempt must still log in,
    # otherwise users get locked out of their own accounts after re-typing.
    client.post("/api/auth/register", json=_new_user("Marko"))
    res = client.post("/api/auth/login", data={"username": "marko", "password": STRONG_PW})
    assert res.status_code == 200
    res = client.post("/api/auth/login", data={"username": "MARKO", "password": STRONG_PW})
    assert res.status_code == 200


def test_login_strips_whitespace(client: TestClient):
    client.post("/api/auth/register", json=_new_user("eve"))
    res = client.post("/api/auth/login", data={"username": "  eve  ", "password": STRONG_PW})
    assert res.status_code == 200


def test_login_with_email_works(client: TestClient):
    client.post("/api/auth/register", json=_new_user("frank"))
    res = client.post(
        "/api/auth/login",
        data={"username": "frank@example.com", "password": STRONG_PW},
    )
    assert res.status_code == 200
    # Email matching should also be case-insensitive.
    res = client.post(
        "/api/auth/login",
        data={"username": "FRANK@Example.com", "password": STRONG_PW},
    )
    assert res.status_code == 200


def test_register_duplicate_username_is_case_insensitive(client: TestClient):
    client.post("/api/auth/register", json=_new_user("Greta"))
    res = client.post(
        "/api/auth/register",
        json=_new_user("greta", email="greta2@example.com"),
    )
    assert res.status_code == 400
    assert "taken" in res.json()["detail"].lower()


def test_me_requires_auth(client: TestClient):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_me_returns_current_user(client: TestClient, auth_headers, auth_token):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert "username" in res.json()


def test_change_password_flow(client: TestClient):
    old_pw = STRONG_PW
    new_pw = "An0ther-Strong-Pass!"
    client.post("/api/auth/register", json=_new_user("dave", password=old_pw))
    login = client.post("/api/auth/login", data={"username": "dave", "password": old_pw})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    bad = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "Wrong-Pass-12345!", "new_password": new_pw},
    )
    assert bad.status_code == 400

    weak = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": old_pw, "new_password": "short"},
    )
    assert weak.status_code == 422

    ok = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": old_pw, "new_password": new_pw},
    )
    assert ok.status_code == 204

    # Old password should no longer work; new one should.
    assert client.post("/api/auth/login", data={"username": "dave", "password": old_pw}).status_code == 401
    assert client.post("/api/auth/login", data={"username": "dave", "password": new_pw}).status_code == 200


def test_invalid_token_returns_401(client: TestClient):
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401
