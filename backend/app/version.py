"""Backend semantic version, derived from git at import time.

The base version below is the hand-maintained semver baseline; the actual
reported version appends the built commit so it always reflects reality:

    <base>+g<short-sha>[-dirty]      e.g. "1.0.0+g663e980"

Resolution order:
  1. ``GAMGEE_VERSION`` env var (lets CI/Docker pin an exact string).
  2. git short SHA (+ "-dirty" when the tree has uncommitted changes).
  3. the bare base version, when git isn't available (e.g. a prod image
     built without the .git directory).

Bump ``_BASE_VERSION`` on release. Follow SemVer:
  - MAJOR for breaking API changes
  - MINOR for new features that are backwards compatible
  - PATCH for backwards-compatible bug fixes
"""

import os
import subprocess
from pathlib import Path

_BASE_VERSION = "1.0.0"

_REPO_ROOT = Path(__file__).resolve().parents[2]


def _git(*args: str) -> str | None:
    try:
        out = subprocess.run(
            ["git", *args],
            cwd=_REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    return out.stdout.strip()


def _resolve_version() -> str:
    override = os.environ.get("GAMGEE_VERSION")
    if override:
        return override
    sha = _git("rev-parse", "--short", "HEAD")
    if not sha:
        return _BASE_VERSION
    dirty = "-dirty" if _git("status", "--porcelain") else ""
    return f"{_BASE_VERSION}+g{sha}{dirty}"


__version__ = _resolve_version()
