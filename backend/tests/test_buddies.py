import uuid

from fastapi.testclient import TestClient


def _workout_payload(**overrides):
    payload = {
        "id": str(uuid.uuid4()),
        "date": "2026-05-12",
        "duration": 1_800_000,
        "focus": "push",
        "exercises": [
            {
                "id": "bench",
                "name": "Bench Press",
                "type": "strength",
                "uid": "bench_1",
                "sets": [{"weight": "80", "reps": "5", "done": True}],
            }
        ],
    }
    payload.update(overrides)
    return payload


def _register(client: TestClient, username: str) -> dict:
    pw = "Str0ng-Test-Pass!"
    client.post("/api/auth/register", json={
        "username": username, "password": pw, "name": username.title(),
        "email": f"{username}@example.com", "gender": "prefer_not_to_say",
    })
    tok = client.post("/api/auth/login",
                      data={"username": username, "password": pw},
                      headers={"Content-Type": "application/x-www-form-urlencoded"}).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


def test_buddy_request_accept_flow(client: TestClient):
    alice = _register(client, "alice_buddy")
    bob = _register(client, "bob_buddy")

    res = client.post("/api/buddies/requests", json={"username": "bob_buddy"}, headers=alice)
    assert res.status_code == 201
    assert res.json()["status"] == "pending_out"

    # Bob sees an incoming request and a notification
    notifs = client.get("/api/notifications", headers=bob).json()
    assert any(n["kind"] == "buddy_request" for n in notifs)

    bob_list = client.get("/api/buddies", headers=bob).json()
    incoming = [b for b in bob_list if b["status"] == "pending_in"]
    assert len(incoming) == 1
    bid = incoming[0]["id"]

    res = client.post(f"/api/buddies/requests/{bid}/accept", headers=bob)
    assert res.status_code == 200
    assert res.json()["status"] == "accepted"

    # Both sides accepted
    a_list = client.get("/api/buddies", headers=alice).json()
    assert a_list[0]["status"] == "accepted"

    # Alice gets a buddy_accepted notification
    a_notifs = client.get("/api/notifications", headers=alice).json()
    assert any(n["kind"] == "buddy_accepted" for n in a_notifs)


def test_self_request_rejected(client: TestClient):
    a = _register(client, "self_user")
    res = client.post("/api/buddies/requests", json={"username": "self_user"}, headers=a)
    assert res.status_code == 400


def test_workout_notifies_buddies(client: TestClient):
    alice = _register(client, "alice_w_n")
    bob = _register(client, "bob_w_n")

    # Establish buddy
    bid_row = client.post("/api/buddies/requests", json={"username": "bob_w_n"}, headers=alice).json()
    bid = [b for b in client.get("/api/buddies", headers=bob).json() if b["status"] == "pending_in"][0]["id"]
    client.post(f"/api/buddies/requests/{bid}/accept", headers=bob)

    # Alice logs a workout
    payload = _workout_payload()
    res = client.post("/api/workouts", json=payload, headers=alice)
    assert res.status_code == 201

    # Bob receives a workout_done notification
    bob_notifs = client.get("/api/notifications", headers=bob).json()
    workout_notifs = [n for n in bob_notifs if n["kind"] == "workout_done"]
    assert len(workout_notifs) == 1
    assert "push" in workout_notifs[0]["message"]

    # And Alice does not (only buddies notified, not self)
    a_notifs = client.get("/api/notifications", headers=alice).json()
    assert not any(n["kind"] == "workout_done" for n in a_notifs)
    # silence linting
    _ = bid_row


def test_pr_notifies_buddies_only_when_improved(client: TestClient):
    alice = _register(client, "alice_pr_n")
    bob = _register(client, "bob_pr_n")
    bid = client.post("/api/buddies/requests", json={"username": "bob_pr_n"}, headers=alice).json()["id"]
    bob_bid = [b for b in client.get("/api/buddies", headers=bob).json() if b["status"] == "pending_in"][0]["id"]
    client.post(f"/api/buddies/requests/{bob_bid}/accept", headers=bob)
    _ = bid

    pr1 = {"exercise_id": "bench", "name": "Bench", "weight": 100.0, "reps": 5, "date": "2026-05-10", "isCardio": False}
    client.put("/api/prs/bench", json=pr1, headers=alice)
    notifs = [n for n in client.get("/api/notifications", headers=bob).json() if n["kind"] == "pr_set"]
    assert len(notifs) == 1

    # Re-upsert with same weight, lower reps — should NOT create a 2nd notification
    pr2 = {**pr1, "reps": 3}
    client.put("/api/prs/bench", json=pr2, headers=alice)
    notifs = [n for n in client.get("/api/notifications", headers=bob).json() if n["kind"] == "pr_set"]
    assert len(notifs) == 1

    # Improved weight — should fire
    pr3 = {**pr1, "weight": 110.0}
    client.put("/api/prs/bench", json=pr3, headers=alice)
    notifs = [n for n in client.get("/api/notifications", headers=bob).json() if n["kind"] == "pr_set"]
    assert len(notifs) == 2


def test_notification_prefs_respected(client: TestClient):
    alice = _register(client, "alice_pref")
    bob = _register(client, "bob_pref")
    client.post("/api/buddies/requests", json={"username": "bob_pref"}, headers=alice)
    bob_bid = [b for b in client.get("/api/buddies", headers=bob).json() if b["status"] == "pending_in"][0]["id"]
    client.post(f"/api/buddies/requests/{bob_bid}/accept", headers=bob)

    # Bob disables workout notifications from Alice
    client.patch(f"/api/buddies/{bob_bid}/preferences", json={"notify_workout": False}, headers=bob)

    client.post("/api/workouts", json=_workout_payload(), headers=alice)
    workout_notifs = [n for n in client.get("/api/notifications", headers=bob).json() if n["kind"] == "workout_done"]
    assert workout_notifs == []


def test_motivate_sends_notification(client: TestClient):
    alice = _register(client, "alice_mot")
    bob = _register(client, "bob_mot")
    client.post("/api/buddies/requests", json={"username": "bob_mot"}, headers=alice)
    bob_bid = [b for b in client.get("/api/buddies", headers=bob).json() if b["status"] == "pending_in"][0]["id"]
    client.post(f"/api/buddies/requests/{bob_bid}/accept", headers=bob)

    alice_bid = client.get("/api/buddies", headers=alice).json()[0]["id"]
    res = client.post(
        f"/api/buddies/{alice_bid}/motivate",
        json={"message": "You got this, champ!", "preset": None},
        headers=alice,
    )
    assert res.status_code == 201

    notifs = [n for n in client.get("/api/notifications", headers=bob).json() if n["kind"] == "motivate"]
    assert len(notifs) == 1
    assert "champ" in notifs[0]["message"]


def test_scoreboard_lists_self_and_buddies(client: TestClient):
    alice = _register(client, "alice_sb")
    bob = _register(client, "bob_sb")
    client.post("/api/buddies/requests", json={"username": "bob_sb"}, headers=alice)
    bob_bid = [b for b in client.get("/api/buddies", headers=bob).json() if b["status"] == "pending_in"][0]["id"]
    client.post(f"/api/buddies/requests/{bob_bid}/accept", headers=bob)

    client.post("/api/workouts", json=_workout_payload(), headers=alice)
    client.post("/api/workouts", json=_workout_payload(), headers=bob)
    client.post("/api/workouts", json=_workout_payload(), headers=bob)

    rows = client.get("/api/buddies/scoreboard", headers=alice).json()
    assert len(rows) == 2
    usernames = {r["username"]: r for r in rows}
    assert usernames["alice_sb"]["workouts_total"] == 1
    assert usernames["bob_sb"]["workouts_total"] == 2


def test_search_users(client: TestClient):
    a = _register(client, "alice_search")
    _register(client, "alice_two")
    _register(client, "bob_search")
    rows = client.get("/api/buddies/search", params={"q": "alice"}, headers=a).json()
    usernames = {r["username"] for r in rows}
    assert "alice_search" in usernames
    assert "alice_two" in usernames
    self_row = next(r for r in rows if r["username"] == "alice_search")
    assert self_row["relationship"] == "self"


def test_live_session_join_and_progress(client: TestClient):
    alice = _register(client, "alice_live")
    bob = _register(client, "bob_live")
    client.post("/api/buddies/requests", json={"username": "bob_live"}, headers=alice)
    bob_bid = [b for b in client.get("/api/buddies", headers=bob).json() if b["status"] == "pending_in"][0]["id"]
    client.post(f"/api/buddies/requests/{bob_bid}/accept", headers=bob)

    sid = str(uuid.uuid4())
    res = client.post("/api/live-sessions", json={"id": sid, "focus": "push", "note": "join me"}, headers=alice)
    assert res.status_code == 201

    # Bob sees it via buddy access
    rows = client.get("/api/live-sessions", headers=bob).json()
    assert any(r["id"] == sid for r in rows)

    # Bob joins
    res = client.post(f"/api/live-sessions/{sid}/join", headers=bob)
    assert res.status_code == 200
    assert len(res.json()["participants"]) == 1

    # Bob updates progress
    res = client.post(f"/api/live-sessions/{sid}/progress", json={"sets_done": 4}, headers=bob)
    assert res.status_code == 200
    parts = {p["username"]: p for p in res.json()["participants"]}
    assert parts["bob_live"]["sets_done"] == 4

    # Owner updates own progress
    res = client.post(f"/api/live-sessions/{sid}/progress", json={"sets_done": 9}, headers=alice)
    assert res.json()["owner_sets_done"] == 9

    # Alice ends — Bob receives a live_ended notification
    res = client.post(f"/api/live-sessions/{sid}/end", headers=alice)
    assert res.status_code == 200
    assert res.json()["status"] == "ended"
    notifs = [n for n in client.get("/api/notifications", headers=bob).json() if n["kind"] == "live_ended"]
    assert len(notifs) == 1


def test_live_session_non_buddy_cannot_join(client: TestClient):
    alice = _register(client, "alice_nb")
    stranger = _register(client, "stranger_nb")
    sid = str(uuid.uuid4())
    client.post("/api/live-sessions", json={"id": sid, "focus": "push"}, headers=alice)
    res = client.post(f"/api/live-sessions/{sid}/join", headers=stranger)
    assert res.status_code == 403


def test_notifications_mark_read(client: TestClient):
    alice = _register(client, "alice_nr")
    bob = _register(client, "bob_nr")
    client.post("/api/buddies/requests", json={"username": "bob_nr"}, headers=alice)
    notifs = client.get("/api/notifications", headers=bob).json()
    assert any(not n["read"] for n in notifs)
    nid = notifs[0]["id"]
    res = client.post(f"/api/notifications/{nid}/read", headers=bob)
    assert res.status_code == 200
    assert res.json()["read"] is True
    count = client.get("/api/notifications/unread-count", headers=bob).json()["count"]
    assert count == 0


def test_remove_buddy_clears_both_sides(client: TestClient):
    alice = _register(client, "alice_rm")
    bob = _register(client, "bob_rm")
    client.post("/api/buddies/requests", json={"username": "bob_rm"}, headers=alice)
    bob_bid = [b for b in client.get("/api/buddies", headers=bob).json() if b["status"] == "pending_in"][0]["id"]
    client.post(f"/api/buddies/requests/{bob_bid}/accept", headers=bob)

    alice_bid = client.get("/api/buddies", headers=alice).json()[0]["id"]
    res = client.delete(f"/api/buddies/{alice_bid}", headers=alice)
    assert res.status_code == 204
    assert client.get("/api/buddies", headers=alice).json() == []
    assert client.get("/api/buddies", headers=bob).json() == []
