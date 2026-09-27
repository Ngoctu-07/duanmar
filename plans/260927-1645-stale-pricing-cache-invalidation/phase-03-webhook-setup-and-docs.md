# Phase 03 — Webhook setup + docs (user action required)

Context: `plan.md` constraints — no Studio login/write token, webhook must be created by user.
Priority: P1 · Status: **done** (approved 2026-09-27)

## Overview

Ship everything *we* can ship (env template + runbook), and hand the user a 5-minute Studio task.

## Requirements

- FR1: `.env.example` gains `SANITY_REVALIDATE_SECRET=` (template only — **do not touch `.env.local`**).
- FR2: `docs/cms-cache-revalidation.md` runbook (Vietnamese, matches existing docs style):
  - how the 3 layers now work (origin reads → tagged cache → webhook invalidation)
  - create webhook in Sanity Manage: Project → API → Webhooks → **Create**:
    - URL: `https://<public-origin>/api/revalidate` (localhost via curl for dev test)
    - Trigger: **Create**, **Update**, **Delete** · Dataset: `production`
    - Optional filter: `!(_id in path("drafts.**"))` (only published docs)
    - Secret: same random value as `SANITY_REVALIDATE_SECRET` (how to generate:
      `openssl rand -hex 32`)
    - Content type: `application/json`
  - curl smoke test (valid/invalid signature) with expected status codes
  - troubleshooting: 503 = env missing · 401 = secret mismatch · still stale =
    check `useCdn` is false / webhook not created / viewing build-time `.next` output
  - note: `SANITY_API_READ_TOKEN` unchanged (draft-mode uses it)
- FR3: changelog entry (docs/project-changelog.md, new bugfix block under 2026-09-27).

## Related code files

- `.env.example` (1 line)
- `docs/cms-cache-revalidation.md` (**create**)
- `docs/project-changelog.md` (append)

## Success criteria

- Fresh clone + `.env.example` → runbook alone is enough to go live.
- No secrets committed (`.env.example` placeholder only).
