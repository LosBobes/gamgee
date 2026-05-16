"""In-process IP-based rate limiter.

Fixed-window-per-IP token bucket. Single-worker accurate; multi-worker
under-counts (acceptable for abuse mitigation, not for billing). Uses the
``X-Forwarded-For`` first hop when present so it works behind a reverse
proxy (Caddy / nginx) that sets that header. Configure with env:

    RATE_LIMIT_ENABLED=true|false    (default: true)
    RATE_LIMIT_DEFAULT=60/minute      (fallback for any limited route)

Routes opt in by depending on ``limit("10/minute")``.
"""
from __future__ import annotations

import os
import re
import threading
import time
from collections import defaultdict
from typing import Callable

from fastapi import HTTPException, Request, status

_ENABLED = os.environ.get("RATE_LIMIT_ENABLED", "true").lower() not in ("0", "false", "no")

# bucket -> (window_start_ts, count)
_buckets: dict[tuple[str, str], tuple[float, int]] = defaultdict(lambda: (0.0, 0))
_lock = threading.Lock()

_RATE_RE = re.compile(r"^\s*(\d+)\s*/\s*(second|minute|hour|day)\s*$")
_WINDOWS = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}


def _parse(rate: str) -> tuple[int, int]:
    m = _RATE_RE.match(rate)
    if not m:
        raise ValueError(f"Bad rate format: {rate!r} — use e.g. '10/minute'")
    return int(m.group(1)), _WINDOWS[m.group(2)]


def _client_key(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def limit(rate: str) -> Callable:
    """Return a FastAPI dependency that enforces *rate* on the calling IP."""
    cap, window = _parse(rate)

    def dep(request: Request) -> None:
        if not _ENABLED:
            return
        key = (_client_key(request), request.url.path)
        now = time.monotonic()
        with _lock:
            start, count = _buckets[key]
            if now - start >= window:
                _buckets[key] = (now, 1)
                return
            if count >= cap:
                retry_after = max(1, int(window - (now - start)))
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded ({cap}/{window}s)",
                    headers={"Retry-After": str(retry_after)},
                )
            _buckets[key] = (start, count + 1)
    return dep


def reset_for_tests() -> None:
    with _lock:
        _buckets.clear()
