# Eurospending.com

Public site tracking EU economic data and the story of the euro currency.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind · Supabase · `@opennextjs/cloudflare` on Cloudflare Workers · Anthropic SDK · Resend.

## Development

```bash
npm run dev            # local Next.js dev
npm run build          # Next.js production build
npm run cf:build       # OpenNext Cloudflare build (outputs .open-next/)
npm run cf:preview     # local preview via Wrangler
npm run cf:deploy      # build + deploy to Cloudflare Workers
```

## Environment variables

Copy `.env.example` to `.env.local` for local development. For production, set the same names as secrets on the Cloudflare Worker:

```bash
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put INGEST_API_KEY
```

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are only needed locally, for `wrangler` itself.

## Database migrations

SQL files live in `supabase/migrations/`, numbered sequentially. **Run them manually in the Supabase SQL editor — never via the Supabase CLI.** Order matters: run 001 first, then 002, etc.

## Project layout

```
src/
  app/
    api/                   route handlers (thin)
    admin/                 /admin/* — auth-gated UI
    country/[slug]/        public country pages (Session 5)
    compare/               public comparison page (Session 7)
    euro/                  public euro timeline page (Session 7)
    blog/                  public blog (Session 8)
  components/{admin,ui,layout,charts,map}/
  lib/
    supabase/{server,client,admin}.ts   three Supabase clients
    extractors/                          per-source pure functions (Session 2+)
    runners/                             pure runner functions (Session 2+)
    seo/                                 SEO helpers (Session 12)
    ai-usage.ts                          log every Anthropic call
    email.ts                             Resend wrapper + {{var}} templating
supabase/migrations/       numbered SQL files (run manually)
wrangler.toml              Cloudflare Worker config
cf-worker.js               custom entrypoint wrapping OpenNext + scheduled handler
open-next.config.ts        OpenNext build config
```

## Architectural rules

1. **Two Supabase clients.** `server.ts` uses the anon key with the user's cookie — subject to RLS. `admin.ts` uses the service role — bypasses RLS. Pick deliberately per route.
2. **Middleware is the single auth gate.** `/admin/login` is public; all other `/admin/*` require `users.is_admin = true`. Everything else passes through.
3. **Pure runners + thin route handlers.** Every cron-style task lives as a function in `src/lib/runners/`. Both the cron and the admin "Run now" button call the same runner.
4. **Internal worker dispatch for cron.** `cf-worker.js`'s `scheduled` handler invokes the OpenNext worker directly via `openNextWorker.fetch(...)`. Never outbound `fetch()` to self.
5. **Never use AI to extract numeric data.** Deterministic extractors only against Eurostat/ECB/OECD/IMF.
6. **Log every Anthropic call** to `ai_usage_log` via `src/lib/ai-usage.ts`.
7. **Validate every numeric value** before insert — reject and surface anomalies; never silently corrupt the dataset.

## First-run setup checklist

1. Run all migrations `001`–`008` in the Supabase SQL editor in order.
2. Visit `/admin/login`, click "First time? Create the initial admin account", sign up with your email + password.
3. In Supabase SQL editor:
   ```sql
   update public.users set is_admin = true, is_superadmin = true where email = 'you@example.com';
   ```
4. Sign in again — `/admin` should load.
