#!/usr/bin/env python3
"""Turns the KEYSTORE_BASE64 secret into a real keystore file, whatever mangled it on the way
(Windows line endings, a UTF-8/UTF-16 BOM, spaces, a data: prefix, or base64 applied twice).

usage: decode-keystore.py <output-file>      (reads env KEYSTORE_BASE64)
"""
import base64, binascii, os, re, sys

JKS_MAGIC = bytes.fromhex("feedfeed")


def looks_like_keystore(b: bytes) -> bool:
    return b[:4] == JKS_MAGIC or (len(b) > 4 and b[0] == 0x30)  # 0x30 = DER SEQUENCE = PKCS#12


def as_text(b: bytes) -> str:
    if b[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return b.decode("utf-16", "ignore")
    return b.decode("utf-8-sig", "ignore")


def b64(text: str) -> bytes:
    text = text.split(",", 1)[1] if text.lstrip().startswith("data:") else text
    text = re.sub(r"[^A-Za-z0-9+/=_-]", "", text).replace("-", "+").replace("_", "/")  # also accepts URL-safe base64
    text = text.rstrip("=")
    text += "=" * (-len(text) % 4)
    return base64.b64decode(text)


def main() -> int:
    out = sys.argv[1]
    secret = os.environ.get("KEYSTORE_BASE64", "")
    if not secret.strip():
        print("ERROR: the KEYSTORE_BASE64 secret is empty or missing.", file=sys.stderr)
        return 1
    try:
        data = b64(secret)
        for _ in range(3):                      # unwrap accidental double encoding
            if looks_like_keystore(data):
                break
            data = b64(as_text(data))
    except (binascii.Error, ValueError) as e:
        print(f"ERROR: KEYSTORE_BASE64 is not valid base64 ({e}).", file=sys.stderr)
        return 1
    if not looks_like_keystore(data):
        print("ERROR: the decoded secret is not a keystore (first bytes: %s).\n"
              "Re-create the secret from the original .jks/.p12 file, see the README in android/." % data[:4].hex(), file=sys.stderr)
        return 1
    with open(out, "wb") as f:
        f.write(data)
    print(f"keystore decoded: {len(data)} bytes, {'JKS' if data[:4] == JKS_MAGIC else 'PKCS12'} format")
    return 0


if __name__ == "__main__":
    sys.exit(main())
