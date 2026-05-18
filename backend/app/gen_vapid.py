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

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    # Use the library's SEC1 X9.62 uncompressed-point encoding rather than
    # rolling our own ``0x04 || X || Y`` concatenation. Functionally identical
    # but eliminates the risk of length surprises from ``int.to_bytes`` if a
    # future cryptography release changes how ``public_numbers()`` is shaped.
    raw_public = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    raw_private = private_key.private_numbers().private_value.to_bytes(32, "big")

    # Belt-and-braces: refuse to print a key that wouldn't pass the validator
    # in ``app.push._validate_vapid_keys`` — surfaces breakage at generation
    # time instead of at first browser subscribe.
    assert len(raw_public) == 65 and raw_public[0] == 0x04, raw_public
    assert len(raw_private) == 32, raw_private

    print(f"VAPID_PUBLIC_KEY={_b64url(raw_public)}")
    print(f"VAPID_PRIVATE_KEY={_b64url(raw_private)}")
    print("VAPID_SUBJECT=mailto:you@example.com")


if __name__ == "__main__":
    main()
