"""Generate a VAPID keypair for Web Push.

Run with::

    python -m app.gen_vapid

Outputs three lines suitable for pasting into ``.env``::

    VAPID_PUBLIC_KEY=...
    VAPID_PRIVATE_KEY=...
    VAPID_SUBJECT=mailto:you@example.com
"""
from __future__ import annotations

import base64

from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    pub_nums = private_key.public_key().public_numbers()
    raw_public = b"\x04" + pub_nums.x.to_bytes(32, "big") + pub_nums.y.to_bytes(32, "big")
    raw_private = private_key.private_numbers().private_value.to_bytes(32, "big")

    print(f"VAPID_PUBLIC_KEY={_b64url(raw_public)}")
    print(f"VAPID_PRIVATE_KEY={_b64url(raw_private)}")
    print("VAPID_SUBJECT=mailto:you@example.com")


if __name__ == "__main__":
    main()
