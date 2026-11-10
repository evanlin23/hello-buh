"""Writes ops.json so the bot (offline-mode name) is op on the local server. Several names: "HelloBuh,Milo" (a story
stunt's `botName` logs the bot in as its hero, so the death screen and chat say Milo: owner 2026-11-10)."""
import hashlib, json, sys, uuid
names, out = sys.argv[1].split(","), sys.argv[2]


def op(name):
    h = bytearray(hashlib.md5(f"OfflinePlayer:{name}".encode()).digest())
    h[6] = (h[6] & 0x0F) | 0x30; h[8] = (h[8] & 0x3F) | 0x80
    return {"uuid": str(uuid.UUID(bytes=bytes(h))), "name": name, "level": 4, "bypassesPlayerLimit": False}


json.dump([op(n) for n in names if n], open(out, "w"), indent=2)
