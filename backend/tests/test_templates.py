def _create_payload(name: str = "Push A"):
    return {
        "name": name,
        "focus": "push",
        "description": "Sample",
        "exercises": [
            {"id": "bench", "uid": "u1", "name": "Bench", "type": "strength",
             "sets": [{"weight": "60", "reps": "5", "done": False}]}
        ],
    }


def test_template_crud_round_trip(client, auth_headers):
    res = client.post("/api/templates", json=_create_payload(), headers=auth_headers)
    assert res.status_code == 201
    tid = res.json()["id"]

    res = client.get("/api/templates", headers=auth_headers)
    assert res.status_code == 200
    assert any(t["id"] == tid for t in res.json())

    res = client.put(f"/api/templates/{tid}", json={"name": "Push B"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Push B"

    res = client.post(f"/api/templates/{tid}/use", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["last_used_at"] is not None

    res = client.delete(f"/api/templates/{tid}", headers=auth_headers)
    assert res.status_code == 204

    res = client.get("/api/templates", headers=auth_headers)
    assert all(t["id"] != tid for t in res.json())


def test_templates_isolated_per_user(client, make_user):
    a = make_user()
    b = make_user()
    res = client.post("/api/templates", json=_create_payload("A's"), headers=a)
    tid = res.json()["id"]
    res = client.get("/api/templates", headers=b)
    assert res.status_code == 200
    assert all(t["id"] != tid for t in res.json())
    res = client.put(f"/api/templates/{tid}", json={"name": "hijack"}, headers=b)
    assert res.status_code == 404
