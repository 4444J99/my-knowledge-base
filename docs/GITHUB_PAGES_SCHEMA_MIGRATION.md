# GitHub Pages Schema Migration: v2 -> v2.1

## Scope

This migration keeps backward compatibility while exposing sync reliability telemetry.

## What changed in v2.1

Top-level optional fields added:
- `syncStatus` (`ok` | `fallback`)
- `syncWarnings` (string array)
- `stats` (numeric sync/probe counters and durations)

Repo-level optional fields added:
- `probeMethod` (`head` | `get` | `null`)
- `probeLatencyMs` (number | `null`)
- `lastError` (string | `null`)

## Compatibility

- Existing `v2` consumers remain valid.
- Validators accept both `github-pages-index.v2` and `github-pages-index.v2.1`.
- `v2.1` fields are additive and optional.

## Rollout notes

- Deploy sync runs non-strict to preserve continuity during transient API outages.
- Validation budgets are policy-driven (`max-age-hours=72`, `max-errored=8`, `max-unreachable=5`).
- Alerting includes repeated fallback in 24h and errored budget breaches.
