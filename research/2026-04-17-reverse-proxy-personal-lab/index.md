---
title: Reverse proxy for a personal lab — Caddy vs Traefik vs nginx
date: 2026-04-17
depth: deep
format: md
topic: "Pick a single reverse proxy for a homelab fronting ~12 services across two NAS boxes — auto-TLS, easy per-service config, observable, low maintenance."
tags: [self-hosted, infra, reverse-proxy]
summary: Caddy wins on DX and auto-TLS; Traefik on label-driven Docker discovery; nginx only when you need its edge features.
citations: 41
reading_time_min: 18
cost_usd: 2.84
duration_sec: 3120
issue: 4
hue: 180
---

> **Pick:** Caddy with the `caddy-docker-proxy` plugin. ACME just works,
> Caddyfile is half the lines of an nginx equivalent, and the plugin
> covers Traefik's main draw (label-driven discovery) without Traefik's
> learning curve.

This is a sample single-angle expedition fixture (depth: deep, no
sub-topics) used for compass visual previews.
