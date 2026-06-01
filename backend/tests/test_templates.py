"""Tests for the workout-template endpoints.

A template is a lightweight, reusable workout blueprint: a named focus plus an
ordered exercise list with optional per-exercise targets. It's owned by the
user who created it and is private to them.
"""


def _payload(**overrides):
    body = {
        "name": "Push Day",
        "focus": "push",
        "exercise_ids": ["bench", "ohp", "tri_push"],
        "exercise_config": {
            "bench": {"rpe": 8, "max_weight": 100.0, "max_reps": 5, "working_sets": 3, "working_reps": 5},
        },
    }
    body.update(overrides)
    return body


def test_create_and_list_template(client, auth_headers):
    res = client.post("/api/templates", json=_payload(), headers=auth_headers)
    assert res.status_code == 201, res.text
    tpl = res.json()
    assert tpl["name"] == "Push Day"
    assert tpl["focus"] == "push"
    assert tpl["exercise_ids"] == ["bench", "ohp", "tri_push"]
    assert tpl["exercise_config"]["bench"]["rpe"] == 8
    assert tpl["id"] > 0

    listed = client.get("/api/templates", headers=auth_headers)
    assert listed.status_code == 200
    rows = listed.json()
    assert len(rows) == 1
    assert rows[0]["id"] == tpl["id"]


def test_create_requires_a_name(client, auth_headers):
    res = client.post("/api/templates", json=_payload(name=""), headers=auth_headers)
    assert res.status_code == 422


def test_template_with_no_config_is_allowed(client, auth_headers):
    res = client.post(
        "/api/templates",
        json={"name": "Bare", "focus": "pull", "exercise_ids": ["bb_row"], "exercise_config": {}},
        headers=auth_headers,
    )
    assert res.status_code == 201, res.text
    assert res.json()["exercise_config"] == {}


def test_update_template(client, auth_headers):
    created = client.post("/api/templates", json=_payload(), headers=auth_headers).json()
    res = client.put(
        f"/api/templates/{created['id']}",
        json=_payload(name="Push Day v2", exercise_ids=["bench"]),
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Push Day v2"
    assert res.json()["exercise_ids"] == ["bench"]


def test_delete_template(client, auth_headers):
    created = client.post("/api/templates", json=_payload(), headers=auth_headers).json()
    res = client.delete(f"/api/templates/{created['id']}", headers=auth_headers)
    assert res.status_code == 204
    assert client.get("/api/templates", headers=auth_headers).json() == []


def test_templates_are_private_to_their_owner(client, auth_headers, make_user):
    created = client.post("/api/templates", json=_payload(), headers=auth_headers).json()
    other = make_user()

    # The other user sees none of the first user's templates...
    assert client.get("/api/templates", headers=other).json() == []
    # ...and can neither edit nor delete them.
    assert client.put(f"/api/templates/{created['id']}", json=_payload(), headers=other).status_code == 403
    assert client.delete(f"/api/templates/{created['id']}", headers=other).status_code == 403


def test_requires_auth(client):
    assert client.get("/api/templates").status_code == 401
    assert client.post("/api/templates", json=_payload()).status_code == 401
