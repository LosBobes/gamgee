"""Tests for the regime endpoints.

Regimes are now multi-week — each regime carries a `weeks` list where every
week has its own day-by-day plan with per-exercise prescription (target RPE,
reference max, warmup/working set counts). The legacy single-week `days`
field is still accepted on input and is mirrored from week 1 on output for
backward compat."""


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
        "weeks": [
            {
                "label": "Week 1",
                "days": {
                    "mon": {
                        "focus": "push",
                        "exerciseIds": ["bench", "ohp"],
                        "enabled": True,
                    },
                },
            },
        ],
    }
    body.update(overrides)
    return body


def test_create_and_get_regime_persists_per_exercise_config(client, auth_headers):
    body = _make_regime_payload(
        weeks=[{
            "label": "Week 1",
            "days": {
                "mon": {
                    "focus": "push",
                    "exerciseIds": ["bench", "ohp"],
                    "enabled": True,
                    "exerciseConfig": {
                        "bench": {
                            "rpe": 8, "max_weight": 100.0, "max_reps": 5,
                            "warmup_sets": 2, "working_sets": 3, "working_reps": 5,
                        },
                        "ohp": {
                            "rpe": 7, "max_weight": 60.0, "max_reps": 8,
                            "warmup_sets": 2, "working_sets": 3, "working_reps": 8,
                        },
                    },
                },
            },
        }],
    )
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 201, res.text
    out = res.json()
    assert len(out["weeks"]) == 1
    bench_cfg = out["weeks"][0]["days"]["mon"]["exerciseConfig"]["bench"]
    assert bench_cfg["rpe"] == 8
    assert bench_cfg["max_weight"] == 100.0
    assert bench_cfg["max_reps"] == 5
    assert bench_cfg["working_sets"] == 3
    # Legacy `days` mirror is populated from week 1.
    assert out["days"]["mon"]["exerciseConfig"]["bench"]["rpe"] == 8

    # Round-trip via GET.
    rid = out["id"]
    got = client.get(f"/api/regimes/{rid}", headers=auth_headers).json()
    assert got["weeks"][0]["days"]["mon"]["exerciseConfig"]["bench"]["rpe"] == 8
    assert got["weeks"][0]["days"]["mon"]["exerciseConfig"]["bench"]["max_weight"] == 100.0


def test_multi_week_regime_has_per_week_configs(client, auth_headers):
    body = _make_regime_payload(
        weeks=[
            {
                "label": "Week 1 (Hypertrophy)",
                "days": {
                    "mon": {
                        "focus": "push",
                        "exerciseIds": ["bench"],
                        "enabled": True,
                        "exerciseConfig": {"bench": {"rpe": 7, "working_reps": 10}},
                    },
                },
            },
            {
                "label": "Week 2 (Strength)",
                "days": {
                    "mon": {
                        "focus": "push",
                        "exerciseIds": ["bench", "ohp"],
                        "enabled": True,
                        "exerciseConfig": {"bench": {"rpe": 9, "working_reps": 4}},
                    },
                },
            },
        ],
    )
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 201, res.text
    out = res.json()
    assert len(out["weeks"]) == 2
    assert out["weeks"][0]["label"] == "Week 1 (Hypertrophy)"
    assert out["weeks"][1]["label"] == "Week 2 (Strength)"
    w1_bench = out["weeks"][0]["days"]["mon"]["exerciseConfig"]["bench"]
    w2_bench = out["weeks"][1]["days"]["mon"]["exerciseConfig"]["bench"]
    assert w1_bench["rpe"] == 7
    assert w1_bench["working_reps"] == 10
    assert w2_bench["rpe"] == 9
    assert w2_bench["working_reps"] == 4
    # Week 2 has different exercises than week 1.
    assert out["weeks"][1]["days"]["mon"]["exerciseIds"] == ["bench", "ohp"]


def test_update_regime_replaces_weeks(client, auth_headers):
    create = client.post("/api/regimes", json=_make_regime_payload(),
                         headers=auth_headers).json()
    rid = create["id"]
    update_body = _make_regime_payload(
        weeks=[
            {
                "label": "New Week",
                "days": {
                    "mon": {
                        "focus": "push",
                        "exerciseIds": ["bench"],
                        "enabled": True,
                        "exerciseConfig": {
                            "bench": {
                                "rpe": 9, "max_weight": 120.0, "max_reps": 3,
                                "warmup_sets": 3, "working_sets": 5, "working_reps": 3,
                            },
                        },
                    },
                },
            },
        ],
    )
    res = client.put(f"/api/regimes/{rid}", json=update_body, headers=auth_headers)
    assert res.status_code == 200, res.text
    out = res.json()
    assert out["weeks"][0]["label"] == "New Week"
    bench = out["weeks"][0]["days"]["mon"]["exerciseConfig"]["bench"]
    assert bench["working_sets"] == 5
    assert bench["working_reps"] == 3


def test_rpe_out_of_range_rejected(client, auth_headers):
    body = _make_regime_payload(
        weeks=[{
            "label": "W1",
            "days": {
                "mon": {
                    "focus": "push",
                    "exerciseIds": ["bench"],
                    "enabled": True,
                    "exerciseConfig": {"bench": {"rpe": 11}},
                },
            },
        }],
    )
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 422


def test_legacy_days_payload_still_works(client, auth_headers):
    # Older clients post the single-week `days` field with no `weeks` wrapper.
    # The server should wrap it into a one-week regime transparently.
    body = {
        "name": "Legacy Plan",
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
                "exerciseIds": ["bench"],
                "enabled": True,
            },
        },
    }
    res = client.post("/api/regimes", json=body, headers=auth_headers)
    assert res.status_code == 201, res.text
    out = res.json()
    assert len(out["weeks"]) == 1
    assert out["weeks"][0]["days"]["mon"]["exerciseIds"] == ["bench"]
    # Legacy `days` mirror still works.
    assert out["days"]["mon"]["exerciseIds"] == ["bench"]
