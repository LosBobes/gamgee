"""End-to-end coverage for the chat WebSocket migration.

These tests boot the real FastAPI app (with a SQLite test DB) and use Starlette's
``websocket_connect`` to verify that messages and read receipts are pushed to
both peers' open sockets without polling.
"""
from __future__ import annotations

import json

from fastapi.testclient import TestClient


def _register(client: TestClient, username: str) -> tuple[str, dict[str, str]]:
    pw = "Str0ng-Test-Pass!"
    client.post("/api/auth/register", json={
        "username": username, "password": pw, "name": username.title(),
        "email": f"{username}@example.com", "gender": "prefer_not_to_say",
    })
    tok = client.post(
        "/api/auth/login",
        data={"username": username, "password": pw},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    ).json()["access_token"]
    return tok, {"Authorization": f"Bearer {tok}"}


def _link_buddies(client: TestClient, a_hdr: dict[str, str], b_username: str, b_hdr: dict[str, str]) -> None:
    res = client.post("/api/buddies/requests", json={"username": b_username}, headers=a_hdr)
    assert res.status_code == 201, res.text
    incoming = [b for b in client.get("/api/buddies", headers=b_hdr).json() if b["status"] == "pending_in"]
    assert incoming, "Buddy request did not reach the recipient"
    res = client.post(f"/api/buddies/requests/{incoming[0]['id']}/accept", headers=b_hdr)
    assert res.status_code == 200


def test_chat_ws_rejects_bad_token(client: TestClient):
    # Starlette raises WebSocketDisconnect when the server closes pre-accept.
    from starlette.websockets import WebSocketDisconnect

    try:
        with client.websocket_connect("/api/chat/ws?token=not-a-jwt"):
            pass
    except WebSocketDisconnect as exc:
        assert exc.code == 1008
    else:  # pragma: no cover - reaching here means the close was not signalled
        raise AssertionError("Expected WS to be rejected with policy violation")


def test_chat_ws_pushes_message_to_both_peers(client: TestClient):
    alice_tok, alice = _register(client, "alice_ws")
    bob_tok, bob = _register(client, "bob_ws")
    _link_buddies(client, alice, "bob_ws", bob)

    conv = client.post("/api/chat/conversations", json={"username": "bob_ws"}, headers=alice).json()
    conv_id = conv["id"]

    with client.websocket_connect(f"/api/chat/ws?token={alice_tok}") as a_ws, \
         client.websocket_connect(f"/api/chat/ws?token={bob_tok}") as b_ws:
        res = client.post(
            f"/api/chat/conversations/{conv_id}/messages",
            json={"body": "hello via websocket"},
            headers=alice,
        )
        assert res.status_code == 201
        sent = res.json()

        # Both sockets should now see a ``message`` event with the full payload.
        def _next_message(ws):
            # Skip any heartbeats or non-message events (a fresh socket gets
            # ``conversation`` before ``message`` because we publish both).
            for _ in range(8):
                ev = json.loads(ws.receive_text())
                if ev["type"] == "message":
                    return ev
            raise AssertionError("Did not receive a message event in time")

        a_event = _next_message(a_ws)
        b_event = _next_message(b_ws)
        assert a_event["data"]["id"] == sent["id"]
        assert a_event["data"]["body"] == "hello via websocket"
        assert b_event["data"]["id"] == sent["id"]
        assert b_event["data"]["sender_id"] == sent["sender_id"]


def test_chat_ws_pushes_read_receipt(client: TestClient):
    alice_tok, alice = _register(client, "alice_read")
    _bob_tok, bob = _register(client, "bob_read")
    _link_buddies(client, alice, "bob_read", bob)

    conv_id = client.post(
        "/api/chat/conversations", json={"username": "bob_read"}, headers=alice,
    ).json()["id"]

    with client.websocket_connect(f"/api/chat/ws?token={alice_tok}") as a_ws:
        # Bob sends one so Alice has something to mark as read.
        client.post(
            f"/api/chat/conversations/{conv_id}/messages",
            json={"body": "ping"}, headers=bob,
        )
        # Drain the inbound message + conversation events.
        for _ in range(4):
            ev = json.loads(a_ws.receive_text())
            if ev["type"] == "message":
                break

        client.post(f"/api/chat/conversations/{conv_id}/read", headers=alice)
        for _ in range(4):
            ev = json.loads(a_ws.receive_text())
            if ev["type"] == "read":
                assert ev["data"]["conversation_id"] == conv_id
                return
        raise AssertionError("Did not receive a read event")
