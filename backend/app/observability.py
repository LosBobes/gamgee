"""Sentry + Prometheus instrumentation. Both are optional and gated on env.

Sentry: set SENTRY_DSN. We init it on app startup; without the dep installed
or DSN unset, this module is a no-op.

Prometheus: when prometheus-fastapi-instrumentator is installed and
PROMETHEUS_ENABLED=true, we expose /metrics. We don't add the dep to
requirements.txt — install it in your prod image if you want metrics.
"""
from __future__ import annotations

import logging
import os
from typing import Any

log = logging.getLogger(__name__)


def init_sentry() -> bool:
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    try:
        import sentry_sdk  # type: ignore
        from sentry_sdk.integrations.fastapi import FastApiIntegration  # type: ignore
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration  # type: ignore
    except ImportError:
        log.warning("SENTRY_DSN set but `sentry-sdk` not installed; skipping")
        return False
    sentry_sdk.init(
        dsn=dsn,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.0")),
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        release=os.environ.get("SENTRY_RELEASE") or None,
    )
    log.info("Sentry initialized")
    return True


def init_prometheus(app: Any) -> bool:
    if os.environ.get("PROMETHEUS_ENABLED", "false").lower() not in ("1", "true", "yes"):
        return False
    try:
        from prometheus_fastapi_instrumentator import Instrumentator  # type: ignore
    except ImportError:
        log.warning("PROMETHEUS_ENABLED set but instrumentator not installed; skipping")
        return False
    Instrumentator(
        should_group_status_codes=False,
        excluded_handlers=["/metrics", "/health"],
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    log.info("Prometheus /metrics enabled")
    return True
