# Session 1 Handoff

## What was built

A deployable Next.js 16 + OpenNext Cloudflare project with Supabase wired in, an admin auth gate, and base schema (8 numbered SQL migrations) ready to run.

## Repository layout (delivered)

```
.env.example                       # template — committed
.env.local                         # real secrets — gitignored
.gitignore                         # extended for .env, .wrangler, .open-next
README.md
SESSION_1_HANDOFF.md               # this file
cf-worker.js                       # custom CF entrypoint + scheduled handler
open-next.config.ts
wrangler.toml                      # name=eurospending, nodejs_compat, observability on, self-reference service binding
package.json                       # cf:build, cf:preview, cf:deploy scripts added
src/
  app/
    page.tsx                       # placeholder homepage
    layout.tsx                     # (default from create-next-app)
    admin/
      page.tsx                     # admin dashboard placeholder w/ link cards
      login/page.tsx               # email+password sign-in / first-admin sign-up
    api/auth/signout/route.ts      # POST handler clearing session
    {country/[slug],compare,euro,blog}/  # empty dirs, filled later
  components/{admin,ui,layout,charts,map}/  # empty, filled later
  lib/
    supabase/server.ts             # SSR client w/ cookie store (RLS-gated)
    supabase/client.ts             # browser client (RLS-gated)
    supabase/admin.ts              # service role (bypasses RLS)
    ai-usage.ts                    # logAiUsage() — writes to ai_usage_log
    email.ts                       # getResend() + applyTemplate({{var}})
    {extractors,runners,seo}/      # empty, filled later
  middleware.ts                    # auth gate — see below
supabase/migrations/
  001_users_and_admin.sql
  002_countries.sql                # EU27 + EZ + EU + GB/US/CH/NO seeds
  003_metrics.sql
  004_economic_data_points.sql     # compound PK (country_iso, metric_key, period_start)
  005_data_revisions.sql           # append-only audit log
  006_ingest_run_log.sql
  007_ai_usage_log.sql
  008_admin_settings.sql           # seeds with social.* defaults
```

## Environment variables — exact names

Both `.env.local` (local) and Cloudflare Worker secrets (production) use these names:

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key (RLS-gated) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (bypass RLS) — server-only |
| `ANTHROPIC_API_KEY` | Anthropic SDK |
| `CLOUDFLARE_ACCOUNT_ID` | wrangler.toml has it; also kept in .env for tooling |
| `CLOUDFLARE_API_TOKEN` | wrangler deploys — local only, never deployed |
| `INGEST_API_KEY` | cron → /api/cron/* shared secret |
| `RESEND_API_KEY` | (added later) email sending |

## Supabase client pattern (deliberate per-route)

- `createSupabaseServerClient()` — `src/lib/supabase/server.ts`. Server Components + route handlers that want RLS in effect. Reads the user's auth cookie.
- `createSupabaseBrowserClient()` — `src/lib/supabase/client.ts`. Client components only.
- `createSupabaseAdminClient()` — `src/lib/supabase/admin.ts`. Server-only, bypasses RLS. Use for ingest writes, admin-gated route handlers, cron.

## Middleware (`src/middleware.ts`)

- Matcher: `'/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'`.
- Public bypass: `/admin/login` and any path NOT under `/admin`.
- `/admin/*`: requires signed-in user **AND** `public.users.is_admin = true AND deleted_at IS NULL`. On failure redirects to `/admin/login?next=…` (or `?error=not_admin`).

### Next.js 16 deprecation note
Next 16 renames `middleware` to `proxy`. Build still works; logs print a warning ("The 'middleware' file convention is deprecated. Please use 'proxy' instead."). When convenient, rename `src/middleware.ts` → `src/proxy.ts` and the exported function from `middleware` → `proxy`. Not blocking.

## Cron internal-dispatch pattern (`cf-worker.js`)

```js
import openNextWorker from './.open-next/worker.js';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

export default {
  fetch: (req, env, ctx) => openNextWorker.fetch(req, env, ctx),
  scheduled: (event, env, ctx) => {
    const target = cronToTarget[event.cron];
    const req = new Request(`https://internal.invalid${target.path}?cron=${target.cron}`, {
      method: 'POST',
      headers: { 'x-ingest-api-key': env.INGEST_API_KEY ?? '' },
    });
    ctx.waitUntil(openNextWorker.fetch(req, env, ctx));
  },
};
```

Cron triggers in `wrangler.toml` are **commented out** for Session 1 — uncomment in Session 4 once the `/api/cron/*` routes exist. The DO re-exports are mandatory: Cloudflare requires every DO class binding to be exported from the entrypoint.

## Migrations to run (in order, in Supabase SQL editor)

001 → 002 → 003 → 004 → 005 → 006 → 007 → 008.

After running them, sign up at `/admin/login` and then in SQL editor:
```sql
update public.users set is_admin = true, is_superadmin = true where email = 'you@example.com';
```

## Deviations from the plan

- **wrangler.toml uses TOML** (not jsonc). Either works; TOML kept to match plan text.
- **Added a `WORKER_SELF_REFERENCE` service binding** in wrangler.toml (required by OpenNext for ISR revalidation). The plan didn't mention it; it's mandatory.
- **`global_fetch_strictly_public` compat flag added.** OpenNext template requires it.
- **Did not add R2 incremental cache binding.** Optional; will add in Session 12 if caching needs it.
- **Did not add `images` binding.** Optional; not needed yet.
- **Did not deploy to Cloudflare yet.** Deploy is the very last step of Session 1 — see "Next actions" below. Doing the deploy from this container requires `wrangler` to authenticate with the Cloudflare API token, then `wrangler secret put` for each secret.

## Open / deferred items

- Deploy to Cloudflare Workers (last step of Session 1).
- Email confirmation in Supabase: user should confirm whether "Confirm email" is disabled in Authentication settings before signing up, OR they'll need to click an email link to activate the first admin.
- Rename `middleware.ts` → `proxy.ts` (cosmetic, Next 16).

## Next actions for the user

1. **Run migrations 001–008** in the Supabase SQL editor.
2. **Confirm** Supabase Auth → Sign In/Up has "Confirm email" toggled OFF so first signup is immediate.
3. Once Session 1 is deployed, **sign up** at `https://<worker-url>/admin/login` and **promote yourself**:
   ```sql
   update public.users set is_admin = true, is_superadmin = true where email = 'you@example.com';
   ```
4. Sign in — `/admin` should load with a "Signed in as …" message.

## Files Session 2 will need to reference

- `src/lib/supabase/admin.ts` — for ingest writes.
- `src/lib/ai-usage.ts` — pattern for the upcoming runner-pattern files.
- `supabase/migrations/004_economic_data_points.sql` — target table for extractors.
- `wrangler.toml` cron block (still commented) — Session 4 will uncomment.
