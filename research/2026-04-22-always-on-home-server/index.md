---
layout: expedition
title: Always-on home server to replace Synology
date: 2026-04-22
topic: "Synology DSM is showing its age (CPU lacks AVX2, RAM is capped, kernel is old). I need a replacement always-on box that gives me more headroom for containers and ML workloads, without locking me into a custom OS."
format: auto
synthesis: true
citations: 64
reading_time_min: 28
hue: 200
children:
  - slug: cpu-and-avx2-baseline
    title: CPU and AVX2 baseline
    depth: standard
    status: success
    summary: Why AVX2 is now table stakes — llama.cpp, ffmpeg, modern Docker bases all assume it.
    citations: 14
    reading_time_min: 5
  - slug: vendor-vs-diy
    title: Vendor NAS vs DIY mini-PC
    depth: deep
    status: success
    summary: Synology / QNAP / UGREEN versus a Beelink / Minisforum mini-PC running Debian or Proxmox.
    citations: 27
    reading_time_min: 11
  - slug: storage-and-replication
    title: Storage layout and offsite replication
    depth: standard
    status: success
    summary: ZFS mirror vs btrfs raid1 vs mdraid + ext4, plus rclone/restic to a remote.
    citations: 18
    reading_time_min: 8
  - slug: power-and-acoustics
    title: Power draw and acoustics in a living space
    depth: ceo
    status: success
    summary: Idle wattage and dBA at 1m for the realistic shortlist — what's tolerable in a shared room.
    citations: 5
    reading_time_min: 4
---

The four angles cluster cleanly: hardware (CPU, vendor-vs-DIY) sets the ceiling, storage decides the recoverability story, and power/acoustics gates whether the box can live where you actually work. The DIY path wins on flexibility and longevity but adds an OS-maintenance tax the vendor boxes hide. If you'd rather spend evenings on Scout than on apt upgrades, a UGREEN with TrueNAS Scale is the path of least surprise.

This is a sample expedition fixture used for compass visual previews.
