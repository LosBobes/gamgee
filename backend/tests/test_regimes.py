"""Tests for the regime endpoints, focusing on the new mode + per-exercise config
fields added so users can pick between per-exercise RPE, general-RPE, and fully
manual scheduling."""


def _make_regime_payload(**overrides):
    body = {
        "name": "Test Plan",
        "description": None,
        "goal": "strength",
        "experience": "intermediate",
        "days_per_week": 3,
        "focus_areas": [],
        "avoid_muscles": [],
        "equipment": ["barbell"],
        "days": {
            "mon": {
                "focus": "push",
                "exerciseIds": ["bench", "ohp"],
                "enabled": True,
            },
        },
    }
    body.update(overrides)
    return body


def test_create_and_get_regime_persists_per_exercise_mode(client, auth_headers):
    body = _make_regime_payload(
        mode="per_exercise_rpe",
        days={
            "mon": {
                "focus": "push",
                "exerciseIds": ["bench", "ohp"],
                "enabled": True,
                "exerciseConfig": {
                    "bench": {"rpe": 8},
                    "ohp":   {"rpe": 6},
                },
            },
        },
    )
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 201, res.text
    out = res.json()
    assert out["mode"] == "per_exercise_rpe"
    assert out["general_rpe"] is None
    assert out["days"]["mon"]["exerciseConfig"]["bench"]["rpe"] == 8
    assert out["days"]["mon"]["exerciseConfig"]["ohp"]["rpe"] == 6

    # Round-trip via GET.
    rid = out["id"]
    got = client.get(f"/api/regimes/{rid}", headers=auth_headers).json()
    assert got["mode"] == "per_exercise_rpe"
    assert got["days"]["mon"]["exerciseConfig"]["bench"]["rpe"] == 8


def test_create_regime_general_rpe(client, auth_headers):
    body = _make_regime_payload(mode="general_rpe", general_rpe=7)
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 201, res.text
    out = res.json()
    assert out["mode"] == "general_rpe"
    assert out["general_rpe"] == 7


def test_create_regime_manual_with_sets_reps_weight(client, auth_headers):
    body = _make_regime_payload(
        mode="manual",
        days={
            "mon": {
                "focus": "push",
                "exerciseIds": ["bench"],
                "enabled": True,
                "exerciseConfig": {
                    "bench": {"sets": 5, "reps": 5, "weight": 80.0},
                },
            },
        },
    )
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 201, res.text
    out = res.json()
    assert out["mode"] == "manual"
    cfg = out["days"]["mon"]["exerciseConfig"]["bench"]
    # FastAPI serializes optional fields as null; we just care about the set values.
    assert cfg["sets"] == 5
    assert cfg["reps"] == 5
    assert cfg["weight"] == 80.0


def test_update_regime_switches_mode(client, auth_headers):
    create = client.post("/api/regimes", json=_make_regime_payload(mode="general_rpe", general_rpe=6),
                         headers=auth_headers).json()
    rid = create["id"]
    update_body = _make_regime_payload(
        mode="manual", general_rpe=None,
        days={
            "mon": {
                "focus": "push",
                "exerciseIds": ["bench"],
                "enabled": True,
                "exerciseConfig": {"bench": {"sets": 3, "reps": 8, "weight": 60.0}},
            },
        },
    )
    res = client.put(f"/api/regimes/{rid}", json=update_body, headers=auth_headers)
    assert res.status_code == 200, res.text
    out = res.json()
    assert out["mode"] == "manual"
    assert out["general_rpe"] is None
    assert out["days"]["mon"]["exerciseConfig"]["bench"]["sets"] == 3


def test_rpe_out_of_range_rejected(client, auth_headers):
    body = _make_regime_payload(mode="general_rpe", general_rpe=11)
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 422


def test_legacy_regime_without_mode_still_works(client, auth_headers):
    # Older clients post no mode/general_rpe and no exerciseConfig.
    body = _make_regime_payload()
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 201, res.text
    out = res.json()
    assert out["mode"] is None
    assert out["general_rpe"] is None
    assert "exerciseConfig" not in out["days"]["mon"] or out["days"]["mon"]["exerciseConfig"] is None
