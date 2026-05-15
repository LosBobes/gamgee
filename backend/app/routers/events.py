"""Server-Sent Events stream for real-time notification / buddy / live updates.

The browser ``EventSource`` API can't send custom headers, so we accept the JWT
as a query-string ``token`` parameter. The endpoint streams ``message`` events
whose ``data`` field is a JSON payload like ``{"type": "notification", ...}``;
the client picks a refresh action based on the type. A 15 s heartbeat comment
keeps proxies and load balancers from closing idle connections.
"""
from __future__ import annotations

import asyncio
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt

from .. import models
from ..auth import ALGORITHM, SECRET_KEY
from ..database import SessionLocal
from ..events import subscribe, unsubscribe

router = APIRouter(prefix="/events", tags=["events"])

HEARTBEAT_INTERVAL = 15.0  # seconds


def _resolve_user_id(token: str) -> int:
    """Validate the JWT and look up the user. Opens its own short-lived DB
    session — the streaming response will outlive a normal request, so we
    don't want a pooled connection pinned for the lifetime of the connection.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
        return user.id
    finally:
        db.close()


@router.get("/stream")
async def stream(
    token: str = Query(..., description="JWT access token"),
):
    user_id = _resolve_user_id(token)

    async def event_gen() -> AsyncIterator[bytes]:
        queue = await subscribe(user_id)
        try:
            yield b": connected\n\n"
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_INTERVAL)
                    yield f"data: {payload}\n\n".encode("utf-8")
                except asyncio.TimeoutError:
                    yield b": keep-alive\n\n"
        finally:
            await unsubscribe(user_id, queue)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
