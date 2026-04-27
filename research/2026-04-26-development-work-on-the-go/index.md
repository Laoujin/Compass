---
layout: expedition
title: Development work on the go
date: 2026-04-26
topic: Design and implement an end-to-end workflow that lets the user chat with Claude Code on Slack to spec, build, and review a feature, then auto-deploy each branch to a per-feature subdomain on Synology.
format: auto
cover: cover.svg
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

> **Decision:** Build the Slack ↔ Claude Code bridge as a small Cloudflare Worker
> in front of a self-hosted bot, automate branches and PRs through the existing
> GitHub App, and run preview deployments as ephemeral Docker Compose stacks
> on the NAS behind a Caddy wildcard.

## Why these three angles, in this order

The angles split cleanly along a **routing-vs-orchestration axis**, with one
cross-cutting concern — **auth** — appearing in all three. The Slack
remote-control angle is the gating decision: every other choice depends on
whether triggers arrive through a GitHub App webhook or a self-hosted bot.
Once that's settled the branch/PR automation drops out almost trivially, and
preview deployments become a question of *where to put the container*, not
*how to know about it*.

## The shape of the recommendation

| Layer            | Pick                                | Why over alternatives                              |
|------------------|--------------------------------------|----------------------------------------------------|
| Chat surface     | Slack DM (no channel)                | Mobile push, threaded approvals, no audience tax  |
| Inbound bridge   | Cloudflare Worker → self-hosted bot  | TLS-terminated, no public NAS port                |
| Code execution   | Claude Code via Agent SDK            | Mobile-friendly approval flow                     |
| Branch + PR      | GitHub App (existing Atlas auth)     | One bot identity, no new secrets                  |
| Preview deploy   | Docker Compose per branch            | Reuses NAS Container Manager                      |
| Routing          | Caddy wildcard `*.preview.sangu.be`  | Auto-TLS, zero per-branch config                  |

## What's still open

Two items the children couldn't fully resolve, both downstream of the
deployment angle: **(a)** whether to garbage-collect preview stacks on PR close
or on a TTL (the auth survey suggests TTL is safer when bots can't observe PR
events reliably); **(b)** how to surface deploy failures back into Slack
without re-implementing a job runner. Both belong in a follow-up expedition,
not a patch on this one.

This is a sample expedition page used for local compass previews.
