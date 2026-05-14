"""Direct 1:1 chat (peer DMs and trainer-trainee coaching channels).

Real-time delivery is over a dedicated WebSocket (``/api/chat/ws``). The
frontend opens one socket per session; every new message, conversation, or
read receipt is fanned out to both peers' open sockets so threads update
without polling. REST endpoints still cover bootstrap (listing conversations,
fetching history, sending messages).
"""
from __future__ import annotations

import asyncio
from typing import List

from fastapi import (
    APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect,
    status,
)
from jose import JWTError, jwt
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import chat_ws, models, schemas
from ..auth import ALGORITHM, SECRET_KEY, get_current_user
from ..database import get_db
from ..notifications import (
    create_notification, now_ms, publish_chat_conversation, publish_chat_message,
    publish_chat_read, publish_notification_refresh,
)
from .trainers import is_trainer_of

router = APIRouter(prefix="/chat", tags=["chat"])


def _pair(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a < b else (b, a)


def _can_chat(db: Session, user_a: int, user_b: int) -> tuple[bool, str]:
    """Return (allowed, kind) — kind is "coach" if either side is a trainer of
    the other, "dm" if they're accepted buddies, else (False, "")."""
    if user_a == user_b:
        return False, ""
    if is_trainer_of(db, user_a, user_b) or is_trainer_of(db, user_b, user_a):
        return True, "coach"
    buddy = (
        db.query(models.Buddy)
        .filter(
            models.Buddy.user_id == user_a,
            models.Buddy.buddy_user_id == user_b,
            models.Buddy.status == "accepted",
        )
        .first()
    )
    if buddy:
        return True, "dm"
    return False, ""


def _other_user_id(conv: models.Conversation, viewer_id: int) -> int:
    return conv.user_high if conv.user_low == viewer_id else conv.user_low


def _conv_out(db: Session, conv: models.Conversation, viewer_id: int) -> schemas.ConversationOut:
    other_id = _other_user_id(conv, viewer_id)
    other = db.query(models.User).filter(models.User.id == other_id).first()
    last_msg = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conv.id)
        .order_by(models.Message.created_at.desc())
        .first()
    )
    read = (
        db.query(models.MessageRead)
        .filter(
            models.MessageRead.conversation_id == conv.id,
            models.MessageRead.user_id == viewer_id,
        )
        .first()
    )
    last_read_at = read.last_read_at if read else 0
    unread = (
        db.query(func.count(models.Message.id))
        .filter(
            models.Message.conversation_id == conv.id,
            models.Message.sender_id != viewer_id,
            models.Message.created_at > last_read_at,
        )
        .scalar() or 0
    )
    preview = (last_msg.body[:120] if last_msg else None)
    return schemas.ConversationOut(
        id=conv.id, kind=conv.kind,
        other_user_id=other.id if other else 0,
        other_username=other.username if other else "",
        other_name=other.name if other else None,
        other_primary_color=other.primary_color if other else None,
        other_is_trainer=bool(other.is_trainer) if other else False,
        last_message_at=conv.last_message_at,
        last_message_preview=preview,
        unread_count=int(unread),
        created_at=conv.created_at,
    )


def _msg_out(db: Session, m: models.Message) -> schemas.MessageOut:
    sender = db.query(models.User).filter(models.User.id == m.sender_id).first()
    return schemas.MessageOut(
        id=m.id, conversation_id=m.conversation_id, sender_id=m.sender_id,
        sender_username=sender.username if sender else "",
        sender_name=sender.name if sender else None,
        body=m.body, created_at=m.created_at,
    )


# ── Conversations ────────────────────────────────────────────────────────────

@router.get("/conversations", response_model=List[schemas.ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Conversation)
        .filter(or_(
            models.Conversation.user_low == current_user.id,
            models.Conversation.user_high == current_user.id,
        ))
        .order_by(models.Conversation.last_message_at.desc())
        .all()
    )
    return [_conv_out(db, c, current_user.id) for c in rows]


@router.post("/conversations", response_model=schemas.ConversationOut, status_code=201)
def open_conversation(
    body: schemas.ConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get or create a conversation with the named user. Both peers must be
    connected (buddies or trainer↔trainee) before chatting."""
    other = (
        db.query(models.User)
        .filter(func.lower(models.User.username) == body.username.strip().lower())
        .first()
    )
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    allowed, kind = _can_chat(db, current_user.id, other.id)
    if not allowed:
        raise HTTPException(status_code=403, detail="You must be buddies or trainer/trainee to chat")

    lo, hi = _pair(current_user.id, other.id)
    conv = (
        db.query(models.Conversation)
        .filter(
            models.Conversation.user_low == lo,
            models.Conversation.user_high == hi,
            models.Conversation.kind == kind,
        )
        .first()
    )
    if conv:
        return _conv_out(db, conv, current_user.id)

    conv = models.Conversation(
        user_low=lo, user_high=hi, kind=kind,
        created_at=now_ms(), last_message_at=now_ms(),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    publish_chat_conversation(db, [current_user.id, other.id], conversation_id=conv.id)
    db.commit()
    return _conv_out(db, conv, current_user.id)


# ── Messages ─────────────────────────────────────────────────────────────────

def _ensure_participant(conv: models.Conversation, user_id: int) -> None:
    if user_id not in (conv.user_low, conv.user_high):
        raise HTTPException(status_code=403, detail="Not your conversation")


@router.get("/conversations/{conv_id}/messages", response_model=List[schemas.MessageOut])
def list_messages(
    conv_id: int,
    before_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _ensure_participant(conv, current_user.id)
    q = db.query(models.Message).filter(models.Message.conversation_id == conv_id)
    if before_id:
        q = q.filter(models.Message.id < before_id)
    rows = q.order_by(models.Message.id.desc()).limit(limit).all()
    rows.reverse()
    return [_msg_out(db, m) for m in rows]


@router.post("/conversations/{conv_id}/messages", response_model=schemas.MessageOut, status_code=201)
def send_message(
    conv_id: int,
    body: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _ensure_participant(conv, current_user.id)
    # Make sure the relationship is still valid (buddy / trainer link may have ended).
    other_id = _other_user_id(conv, current_user.id)
    allowed, _ = _can_chat(db, current_user.id, other_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="You're no longer connected to this user")

    ts = now_ms()
    msg = models.Message(
        conversation_id=conv_id, sender_id=current_user.id,
        body=body.body, created_at=ts,
    )
    db.add(msg)
    db.flush()  # assign msg.id so the WS payload can reference it
    conv.last_message_at = ts
    # Notify recipient (counts as a notification + chat event so they see a badge
    # even when the chat tab isn't open).
    preview = body.body if len(body.body) <= 140 else body.body[:137] + "…"
    create_notification(
        db, user_id=other_id, kind="chat_message",
        sender_user_id=current_user.id,
        message=f"{current_user.name or current_user.username}: {preview}",
        payload={"conversation_id": conv_id},
        # Deep-link the system push so tapping it opens the conversation
        # rather than landing on the notifications tab.
        push_url=f"/?tab=chat&conv={conv_id}",
    )
    out = _msg_out(db, msg)
    publish_chat_message(db, [current_user.id, other_id], out.model_dump())
    publish_chat_conversation(db, [current_user.id, other_id], conversation_id=conv_id)
    db.commit()
    return out


@router.post("/conversations/{conv_id}/read", status_code=204)
def mark_read(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    _ensure_participant(conv, current_user.id)
    row = (
        db.query(models.MessageRead)
        .filter(
            models.MessageRead.conversation_id == conv_id,
            models.MessageRead.user_id == current_user.id,
        )
        .first()
    )
    if row:
        row.last_read_at = now_ms()
    else:
        db.add(models.MessageRead(
            conversation_id=conv_id, user_id=current_user.id, last_read_at=now_ms(),
        ))
    # Clear any unread chat_message notifications that point at this
    # conversation so the bell stays in sync with the thread. Filter the
    # JSON payload in Python — `payload["conversation_id"]` operators are
    # Postgres-only, and the tests run on SQLite.
    unread = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.kind == "chat_message",
            models.Notification.read.is_(False),
        )
        .all()
    )
    changed = False
    for n in unread:
        if isinstance(n.payload, dict) and n.payload.get("conversation_id") == conv_id:
            n.read = True
            changed = True
    if changed:
        publish_notification_refresh(db, current_user.id, kind="chat_message")
    publish_chat_read(db, [current_user.id], conversation_id=conv_id, reader_user_id=current_user.id)
    db.commit()


# ── WebSocket ────────────────────────────────────────────────────────────────

WS_HEARTBEAT_INTERVAL = 25.0  # seconds — keep proxies / load balancers from idle-closing


def _resolve_user_id(token: str, db: Session) -> int | None:
    """Decode a JWT query-param token and return the user id, or ``None`` if
    the token is missing / invalid / unknown."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None
    except JWTError:
        return None
    user = db.query(models.User).filter(models.User.username == username).first()
    return user.id if user else None


@router.websocket("/ws")
async def chat_socket(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
    db: Session = Depends(get_db),
):
    user_id = _resolve_user_id(token, db)
    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    queue = await chat_ws.subscribe(user_id)

    async def send_loop() -> None:
        # Forward every queued chat event to the client. A heartbeat ping keeps
        # the connection alive through proxies that drop idle TCP after ~60 s.
        while True:
            try:
                payload = await asyncio.wait_for(queue.get(), timeout=WS_HEARTBEAT_INTERVAL)
                await websocket.send_text(payload)
            except asyncio.TimeoutError:
                await websocket.send_text('{"type":"ping","data":{}}')

    async def recv_loop() -> None:
        # We don't accept inbound traffic — the client still POSTs messages
        # over REST. Reading anyway lets us notice disconnects promptly and
        # gives the client a place to send keep-alive frames if needed.
        while True:
            await websocket.receive_text()

    send_task = asyncio.create_task(send_loop())
    recv_task = asyncio.create_task(recv_loop())
    try:
        done, pending = await asyncio.wait(
            {send_task, recv_task}, return_when=asyncio.FIRST_COMPLETED,
        )
        for t in pending:
            t.cancel()
    except WebSocketDisconnect:
        pass
    finally:
        send_task.cancel()
        recv_task.cancel()
        await chat_ws.unsubscribe(user_id, queue)
        try:
            await websocket.close()
        except RuntimeError:
            # already closed by the peer
            pass
