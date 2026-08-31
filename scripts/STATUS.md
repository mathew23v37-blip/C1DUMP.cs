# CPM Frida scripts

Repo: mathew23v37-blip/C1DUMP.cs
Process: CarParking
Attach: frida -H PHONE_IP:27042 -n CarParking -l cpm-tunes.js
Do not Interceptor.detachAll() while driving.

## Files
- cpm-tunes.js — current STACK menu (d1-d10, s1-s10, slam/stance/smoke/fws/launch). Hydro 0x18C does not bounce.
- cpm-director.js — ARCHIVE. Ice/4WS worked. Do not merge throttle 0x168 or LaunchControlActive 0x43.
- PLUMBING.md — object tree and proven offsets
- PREP-VINYL-HUD.md — wrap + HUD color research, not built yet

Grok GitHub connector is read-only (403 on push). This folder is updated by a write-capable connector or git push.

---
Last verified (Perplexity read/write check): 2026-08-31 18:05 EDT
