import uuid

from fastapi.testclient import TestClient


def _session_payload(**overrides):
    payload = {
        "id": str(uuid.uuid4()),
        "date": "2026-05-11",
        "duration": 1_800_000,  # 30 minutes in ms
        "focus": "push",
        "exercises": [
            {
                "id": "bench",
                "name": "Bench Press",
                "type": "strength",
                "uid": "bench_1",
                "sets": [{"weight": "60", "reps": "8", "done": True}],
            }
        ],
    }
    payload.update(overrides)
    return payload


def test_list_workouts_requires_auth(client: TestClient):
    assert client.get("/api/workouts").status_code == 401


def test_create_and_list_workout(client: TestClient, auth_headers):
    payload = _session_payload()
    res = client.post("/api/workouts", json=payload, headers=auth_headers)
    assert res.status_code == 201
    body = res.json()
    assert body["id"] == payload["id"]
    assert body["focus"] == "push"
    assert body["exercises"][0]["id"] == "bench"

    listed = client.get("/api/workouts", headers=auth_headers)
    assert listed.status_code == 200
    sessions = listed.json()
    assert len(sessions) == 1
    assert sessions[0]["id"] == payload["id"]


def test_duplicate_workout_id_returns_409(client: TestClient, auth_headers):
    payload = _session_payload()
    assert client.post("/api/workouts", json=payload, headers=auth_headers).status_code == 201
    dupe = client.post("/api/workouts", json=payload, headers=auth_headers)
    assert dupe.status_code == 409


def test_workouts_are_scoped_per_user(client: TestClient, make_user):
    alice = make_user("alice_w")
    bob = make_user("bob_w")
    client.post("/api/workouts", json=_session_payload(), headers=alice)
    bob_list = client.get("/api/workouts", headers=bob).json()
    assert bob_list == []


def test_update_workout(client: TestClient, auth_headers):
    payload = _session_payload()
    client.post("/api/workouts", json=payload, headers=auth_headers)
    update = {**payload, "duration": 999, "focus": "pull"}
    res = client.put(f"/api/workouts/{payload['id']}", json=update, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["duration"] == 999
    assert res.json()["focus"] == "pull"


def test_update_missing_workout_returns_404(client: TestClient, auth_headers):
    res = client.put("/api/workouts/does-not-exist", json=_session_payload(id="does-not-exist"), headers=auth_headers)
    assert res.status_code == 404


def test_delete_workout(client: TestClient, auth_headers):
    payload = _session_payload()
    client.post("/api/workouts", json=payload, headers=auth_headers)
    res = client.delete(f"/api/workouts/{payload['id']}", headers=auth_headers)
    assert res.status_code == 204
    assert client.get("/api/workouts", headers=auth_headers).json() == []


def test_delete_missing_workout_returns_404(client: TestClient, auth_headers):
    res = client.delete("/api/workouts/nope", headers=auth_headers)
    assert res.status_code == 404
