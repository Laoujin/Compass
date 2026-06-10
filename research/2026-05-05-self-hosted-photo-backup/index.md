---
title: Self-hosted photo backup that won't bite me in 5 years
date: 2026-05-05
depth: standard
format: md
cover: cover.svg
topic: "Compare Immich, PhotoPrism and Nextcloud for durable self-hosted photo backup."
topic_raw: |
  I want to get my photos off Google Photos and self-host. Care about: reliable
  mobile auto-upload, face/object search, an export path that won't trap me, and
  something I can still run in 5 years. Immich vs PhotoPrism vs Nextcloud Memories?
tags: [self-hosting, privacy, photos]
summary: Immich wins on UX and mobile upload; keep originals on a plain filesystem so any tool can take over later.
citations: 19
reading_time_min: 6
cost_usd: 0.69
duration_sec: 900
issue: 9
hue: 150
---

> **Decision:** Immich for the day-to-day app, but store originals in a flat,
> dated folder tree on disk — the app is replaceable, the files are forever.

## The three contenders

| Tool                | Strength                          | Watch out for                  |
|---------------------|-----------------------------------|--------------------------------|
| Immich              | Best mobile app + fast ML search  | Young; schema still moving      |
| PhotoPrism          | Rock-solid indexing, read-only friendly | Upload UX is weaker      |
| Nextcloud Memories  | Lives inside an existing Nextcloud | Heavier stack to maintain      |

Whatever you pick, the durable layer is the **filesystem**, not the database.
