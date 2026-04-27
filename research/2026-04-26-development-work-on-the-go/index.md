---
layout: expedition
title: Development work on the go
date: 2026-04-26
topic: Design and implement an end-to-end workflow that lets the user chat with Claude Code on Slack to spec, build, and review a feature, then auto-deploy each branch to a per-feature subdomain on Synology.
format: auto
synthesis: true
citations: 87
reading_time_min: 42
hue: 270
children:
  - slug: slack-claude-code-remote-control
    title: Slack ↔ Claude Code remote control
    depth: deep
    status: success
    summary: GitHub App vs Agent SDK vs self-hosted bot — survey of mobile-friendly approval flows.
    citations: 32
    reading_time_min: 12
  - slug: branch-and-pr-automation
    title: Branch and PR automation
    depth: standard
    status: success
    summary: How a "go" message produces a branch and PR without a local checkout.
    citations: 18
    reading_time_min: 7
  - slug: synology-preview-deployments
    title: Synology preview deployments
    depth: standard
    status: success
    summary: Container Manager / Docker Compose lifecycle per branch.
    citations: 21
    reading_time_min: 9
---

The five angles split cleanly along a routing-vs-orchestration axis, with one cross-cutting concern (auth) appearing in three of them. The Slack remote-control angle is the gating decision: every other choice depends on whether triggers come through a GitHub App or a self-hosted bot.

This is a sample expedition page used for local compass previews.
