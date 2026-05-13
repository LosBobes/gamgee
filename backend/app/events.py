"""In-process pub/sub for pushing real-time events to connected SSE clients.

Each subscribed user has one or more ``asyncio.Queue`` instances (one per open
browser tab). Routers call :func:`publish` after committing a change; the SSE
endpoint forwards queued events to its EventSource. The bus is single-process
only — fine for a single Uvicorn worker; swap in Redis pub/sub later if we
scale horizontally.
"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Iterable


# user_id -> list of queues (one per open connection)
_subscribers: dict[int, list[asyncio.Queue[str]]] = defaultdict(list)
_lock = asyncio.Lock()


async def subscribe(user_id: int) -> asyncio.Queue[str]:
    q: asyncio.Queue[str] = asyncio.Queue(maxsize=64)
    async with _lock:
        _subscribers[user_id].append(q)
    return q


async def unsubscribe(user_id: int, queue: asyncio.Queue[str]) -> None:
    async with _lock:
        if queue in _subscribers.get(user_id, []):
            _subscribers[user_id].remove(queue)
        if not _subscribers.get(user_id):
            _subscribers.pop(user_id, None)


def publish(user_ids: Iterable[int], event_type: str, data: dict | None = None) -> None:
    """Fan out an event to every connection of every listed user.

    Safe to call from sync code (the routers): we only touch in-memory queues,
    no awaits required. Drops the event for a connection whose queue is full
    rather than blocking the request.
    """
    payload = json.dumps({"type": event_type, "data": data or {}})
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


def publish_one(user_id: int, event_type: str, data: dict | None = None) -> None:
    publish([user_id], event_type, data)
