"""In-process pub/sub for pushing real-time chat events to WebSocket clients.

Mirrors the SSE bus in :mod:`events` but is dedicated to chat traffic so the
payloads can carry full ``MessageOut`` JSON instead of just refresh signals.
Single-process only — swap in Redis pub/sub later if we ever run more than one
Uvicorn worker.
"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any, Iterable


# user_id -> list of per-connection queues
_subscribers: dict[int, list[asyncio.Queue[str]]] = defaultdict(list)
_lock = asyncio.Lock()


async def subscribe(user_id: int) -> asyncio.Queue[str]:
    q: asyncio.Queue[str] = asyncio.Queue(maxsize=128)
    async with _lock:
        _subscribers[user_id].append(q)
    return q


async def unsubscribe(user_id: int, queue: asyncio.Queue[str]) -> None:
    async with _lock:
        if queue in _subscribers.get(user_id, []):
            _subscribers[user_id].remove(queue)
        if not _subscribers.get(user_id):
            _subscribers.pop(user_id, None)


def publish(user_ids: Iterable[int], event_type: str, data: dict[str, Any]) -> None:
    """Fan out a chat event to every connection of every listed user.

    Safe to call from sync code (the routers): we only touch in-memory queues,
    no awaits required. Drops the event for a connection whose queue is full
    rather than blocking the request.
    """
    payload = json.dumps({"type": event_type, "data": data})
    seen: set[int] = set()
    for uid in user_ids:
        if uid in seen:
            continue
        seen.add(uid)
        for q in _subscribers.get(uid, []):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass
