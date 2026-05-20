# Session 9 Handoff

## What was built

Deterministic social-media fact detector + draft generation pipeline. Runs in production: produced 83 candidates across 5 rules and 5 verified draft posts with Anthropic-Haiku captions and Satori-rendered 1080×1080 PNGs.

## Key file paths

```
supabase/migrations/016_social_media.sql       3 tables (candidates, drafts, photo_usage)

src/lib/supabase/paginate.ts                   fetchAll() helper (NEW — fixes 1000-row cap)

src/lib/social/types.ts                         CandidateFact / SeriesIndex / ChartType
src/lib/social/rules/
  threshold-crossing.ts                         Maastricht 3/60, 100% debt, 150% debt, ECB 2%, 5% HICP
  multi-year-extreme.ts                         5/10/25-period highs/lows
  rank-change.ts                                top-3 / bottom-3 entries vs EU peers
  streak.ts                                     5+ consecutive monotonic moves
  anniversary.ts                                1/5/10/15/20/25-year anniversaries
src/lib/social/fact-detector.ts                 pulls data + events, runs rules, dedupes
src/lib/social/caption-generator.ts             Claude Haiku — polishes prose only
src/lib/social/chart-renderer.tsx               next/og ImageResponse 1080x1080 stat card

src/lib/runners/social-draft-runner.ts          insert candidates → top-N to drafts (uses cap from admin_settings)

src/app/api/admin/social-media/
  detect-now/route.ts                            POST trigger (admin-gated)
  candidates/[id]/route.ts                       PATCH promote|dismiss (promote auto-generates draft)
  drafts/[id]/route.ts                           PATCH/DELETE + post_now stub (Session 10 wires real publish)

src/app/admin/social-media/candidates/page.tsx   review + status filter
src/app/admin/social-media/drafts/page.tsx       edit + schedule
src/components/admin/social-candidates-table.tsx
src/components/admin/social-drafts-list.tsx

scripts/run-social-detect.ts                     out-of-band trigger
```

## Critical fix: PostgREST 1000-row cap

Supabase's PostgREST returns at most **1000 rows per query**, ignoring `.range(0, 99999)`. This silently truncated the 9 443-row dataset and caused fact-detection to only see 1999-2002 data, generating completely stale facts.

**Fix:** `src/lib/supabase/paginate.ts` provides `fetchAll(builderFactory, pageSize)`. The factory takes `(from, to)` and returns a fresh `.range()`-bound query; the helper iterates until a short page comes back. Refactored:
- `src/lib/social/fact-detector.ts`
- `src/lib/euro-page-data.ts` (was also affected — ECB daily series have ~6 800 rows)

The country / compare / homepage loaders work fine since their per-page row counts are well under 1 000.

## Google Drive integration

The brief lists hand-rolled JWT signing for Google Drive folder-per-country LRU photo rotation. **Deferred to Session 13.**
- `social_photo_usage` table created (migration 016).
- `post_type='photo_overlay'` reserved in `social_media_drafts.post_type`.
- For now, every draft is `post_type='chart'`.

## Satori chart-rendering gotchas

- **Every `<div>` with > 1 child MUST explicitly set `display`** — Satori errors out otherwise. Solution: set `display: 'flex'` on every container, even single-line ones.
- **No `transform: rotate()` or `position: absolute`** for chart bars. We use nested flex with explicit `width`/`height` pixel values for the bar chart visualisation.
- **No SVG paths**, no CSS gradients beyond solid colours. The brief noted this; the renderer adheres.
- `next/og` works on Cloudflare Workers via OpenNext — confirmed.

## Fact detection rules (logic summary)

| Rule | Logic | Priority | Chart |
|---|---|---|---|
| `threshold_crossing` | latest pair crosses a fixed threshold (Maastricht 3% deficit, 60/100/150% debt, ECB 2%, 5% HICP) | 80 | line |
| `multi_year_extreme` | latest value beats max/min of N-period window; pick biggest N (5/10/25) | 60 + min(20, N) | line |
| `rank_change` | country enters top-3 or bottom-3 of EU27 vs prior period | 70 | bar |
| `streak` | N consecutive monotonic moves (N ≥ 5) | 50 + min(20, 2N) | line |
| `anniversary` | today's month-day matches a `monetary_events.event_date` AND age is 1/5/10/15/20/25 yrs | 40 + min(30, age) | none |

## Priority scoring + dedup

- Priority is fixed per rule + a small "magnitude" bonus.
- Dedupe via a Postgres unique index on `(rule_name, country_iso, supporting_data->>'metric', supporting_data->>'period')`. Re-runs hit conflict-on-insert and are counted as `existing`.
- Draft generation picks top-N by priority from `candidates WHERE status='new'`. Default cap = 20 (from `admin_settings.social.weekly_draft_cap`).

## Caption-generation prompt

System prompt forbids inventing numbers — only polishes prose. Numbers come from `supporting_data`. Logged to `ai_usage_log` with `feature='social_caption'`, `model='claude-haiku-4-5'`.

Two output styles supported via the `platform` parameter:
- `instagram`: 2-4 sentences + up to 5 hashtags.
- `x`: max 240 characters, no hashtags.

Default is `instagram` in the runner.

## Weekly cron — DEFERRED

Brief calls for a weekly Mon 09:00 UTC cron. Cloudflare Workers free tier caps cron count at 5; we used the slot for `*/15 * * * *` blog publishing. **The runner is only triggered manually for now** — "Run detection now" button on `/admin/social-media/candidates`. To enable a cron in Session 13: bump to Workers paid plan ($5/month) or drop another existing cron.

## Production state after Session 9

| Table | Count |
|---|---|
| `social_media_candidates` | 83 (rule firings) |
| `social_media_drafts` | 5 (top-priority chart drafts) |
| `social-images` bucket | 5 PNGs (1080×1080) |

## Next actions for the user

1. Sign in at https://eurospending.org/admin/social-media/candidates — should show 78 `new` and 5 `promoted` candidates.
2. Try promoting one — auto-generates a chart PNG + AI caption draft.
3. Visit /admin/social-media/drafts — edit caption inline, schedule for later, or "Post now" (the stub will mark posted; Session 10 wires real Make.com webhook).

## What Session 10 will need

- Migration 017 (`social_media_posts`).
- `src/lib/runners/social-publish-runner.ts` — find scheduled drafts ≤ now, POST to Make.com webhook, parse response, write posts row.
- Extend `/api/cron/publish` to also call the social publish runner.
- `/admin/social-media/posts` — history with platform-status badges.
- `/admin/social-media/settings` — Make webhook URL, default platforms, draft cap toggle.
- Real implementation of `POST /api/admin/social-media/drafts/[id]` `action=post_now`.
