from fastapi.testclient import TestClient


def _metric(**overrides):
    payload = {
        "metric_type": "weight",
        "value": 80.5,
        "unit": "kg",
        "date": "2026-05-11",
        "note": None,
    }
    payload.update(overrides)
    return payload


def test_create_and_list_metric(client: TestClient, auth_headers):
    res = client.post("/api/health", json=_metric(), headers=auth_headers)
    assert res.status_code == 201
    body = res.json()
    assert body["metric_type"] == "weight"
    assert body["value"] == 80.5
    assert body["id"]

    listed = client.get("/api/health", headers=auth_headers).json()
    assert len(listed) == 1


def test_list_metrics_filter_by_type_and_date(client: TestClient, auth_headers):
    client.post("/api/health", json=_metric(date="2026-05-01"), headers=auth_headers)
    client.post("/api/health", json=_metric(date="2026-05-10"), headers=auth_headers)
    client.post(
        "/api/health",
        json=_metric(metric_type="body_fat", value=18.0, unit="pct", date="2026-05-10"),
        headers=auth_headers,
    )

    weights = client.get("/api/health?metric_type=weight", headers=auth_headers).json()
    assert len(weights) == 2
    assert {m["date"] for m in weights} == {"2026-05-01", "2026-05-10"}

    in_range = client.get(
        "/api/health?metric_type=weight&from=2026-05-05&to=2026-05-15",
        headers=auth_headers,
    ).json()
    assert [m["date"] for m in in_range] == ["2026-05-10"]


def test_metrics_are_scoped_per_user(client: TestClient, make_user):
    alice = make_user("alice_h")
    bob = make_user("bob_h")
    client.post("/api/health", json=_metric(), headers=alice)
    assert client.get("/api/health", headers=bob).json() == []


def test_delete_metric(client: TestClient, auth_headers):
    created = client.post("/api/health", json=_metric(), headers=auth_headers).json()
    res = client.delete(f"/api/health/{created['id']}", headers=auth_headers)
    assert res.status_code == 204
    assert client.get("/api/health", headers=auth_headers).json() == []


def test_delete_missing_metric_returns_404(client: TestClient, auth_headers):
    res = client.delete("/api/health/99999", headers=auth_headers)
    assert res.status_code == 404
