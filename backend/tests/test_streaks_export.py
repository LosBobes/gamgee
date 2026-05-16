import io


def _log_workout(client, headers, sid: str, date: str, exid: str = "bench"):
    return client.post(
        "/api/workouts",
        json={
            "id": sid, "date": date, "duration": 60_000,
            "focus": "push",
            "exercises": [{
                "id": exid, "uid": "u1", "name": "Bench", "type": "strength",
                "sets": [{"weight": "100", "reps": "5", "done": True}]
            }],
        },
        headers=headers,
    )


def test_streaks_summary_awards_first_workout(client, auth_headers):
    import uuid
    res = _log_workout(client, auth_headers, str(uuid.uuid4()), "2024-01-01")
    assert res.status_code == 201
    res = client.get("/api/streaks", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["sessions_total"] >= 1
    assert any(b["badge_id"] == "first_workout" for b in body["earned_badges"])


def test_export_includes_user_and_workouts(client, auth_headers):
    import uuid
    _log_workout(client, auth_headers, str(uuid.uuid4()), "2024-02-02")
    res = client.get("/api/account/export", headers=auth_headers)
    assert res.status_code == 200
    body = res.content.decode()
    import json
    data = json.loads(body)
    assert "user" in data
    assert "workouts" in data
    assert isinstance(data["workouts"], list)
    assert any(w["date"] == "2024-02-02" for w in data["workouts"])


def test_csv_import_strong_layout(client, auth_headers):
    csv_text = (
        "Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Notes\n"
        "2024-03-01,Push,Bench Press,1,80,5,\n"
        "2024-03-01,Push,Bench Press,2,80,5,\n"
        "2024-03-01,Push,Overhead Press,1,50,8,\n"
    )
    files = {"file": ("strong.csv", io.BytesIO(csv_text.encode()), "text/csv")}
    res = client.post("/api/import/csv", files=files, headers=auth_headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["layout"] == "strong"
    assert body["imported_sessions"] == 1


def test_account_delete_requires_password_and_confirm(client, make_user):
    headers = make_user()
    res = client.request(
        "DELETE", "/api/account",
        json={"password": "wrong", "confirm": "DELETE"},
        headers=headers,
    )
    assert res.status_code == 403
    res = client.request(
        "DELETE", "/api/account",
        json={"password": "Str0ng-Test-Pass!", "confirm": "NOPE"},
        headers=headers,
    )
    assert res.status_code in (400, 422)
    res = client.request(
        "DELETE", "/api/account",
        json={"password": "Str0ng-Test-Pass!", "confirm": "DELETE"},
        headers=headers,
    )
    assert res.status_code == 204
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401
