from fastapi.testclient import TestClient


def _pr_payload(**overrides):
    payload = {
        "exercise_id": "bench",
        "name": "Bench Press",
        "weight": 100.0,
        "reps": 5,
        "date": "2026-05-11",
        "isCardio": False,
    }
    payload.update(overrides)
    return payload


def test_list_prs_requires_auth(client: TestClient):
    assert client.get("/api/prs").status_code == 401


def test_upsert_creates_new_pr(client: TestClient, auth_headers):
    res = client.put("/api/prs/bench", json=_pr_payload(), headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["exercise_id"] == "bench"
    assert body["weight"] == 100.0
    assert body["reps"] == 5
    assert body["isCardio"] is False


def test_upsert_updates_existing_pr(client: TestClient, auth_headers):
    client.put("/api/prs/bench", json=_pr_payload(), headers=auth_headers)
    res = client.put(
        "/api/prs/bench",
        json=_pr_payload(weight=110.0, reps=3, date="2026-05-12"),
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["weight"] == 110.0
    assert res.json()["reps"] == 3

    listed = client.get("/api/prs", headers=auth_headers).json()
    assert len(listed) == 1


def test_upsert_mismatched_exercise_id_returns_422(client: TestClient, auth_headers):
    res = client.put(
        "/api/prs/bench",
        json=_pr_payload(exercise_id="squat"),
        headers=auth_headers,
    )
    assert res.status_code == 422


def test_prs_are_scoped_per_user(client: TestClient, make_user):
    alice = make_user("alice_pr")
    bob = make_user("bob_pr")
    client.put("/api/prs/bench", json=_pr_payload(), headers=alice)
    assert client.get("/api/prs", headers=bob).json() == []


def test_delete_pr(client: TestClient, auth_headers):
    client.put("/api/prs/bench", json=_pr_payload(), headers=auth_headers)
    res = client.delete("/api/prs/bench", headers=auth_headers)
    assert res.status_code == 204
    assert client.get("/api/prs", headers=auth_headers).json() == []


def test_delete_missing_pr_returns_404(client: TestClient, auth_headers):
    res = client.delete("/api/prs/nothing", headers=auth_headers)
    assert res.status_code == 404
