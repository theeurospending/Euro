# Session 8 Handoff

## What was built

Full blog system: admin Tiptap CRUD with image uploads, scheduled publishing via cron, public `/blog` + `/blog/[slug]` + `/blog/tag/[tag]` + `/blog/feed.xml`, JSON-LD Article schema.

## Key file paths

```
supabase/migrations/014_blog_articles.sql               table + indexes + RLS
supabase/migrations/015_email_templates.sql             keyed templates with {{var}}

src/lib/blog-data.ts                                    list / get / tags helpers
src/lib/runners/scheduled-publish-runner.ts             promotes scheduled → published

src/app/api/cron/publish/route.ts                       INGEST_API_KEY-auth'd cron entrypoint
src/app/api/admin/blog/route.ts                         POST (create)
src/app/api/admin/blog/[id]/route.ts                    PATCH (update) / DELETE
src/app/api/admin/blog/upload-image/route.ts            uploads to Supabase 'blog-images' bucket

src/app/admin/blog/page.tsx                             admin list
src/app/admin/blog/new/page.tsx                         create
src/app/admin/blog/[id]/page.tsx                        edit
src/components/admin/blog-article-editor.tsx            form
src/components/admin/tiptap-blog-editor.tsx             Tiptap StarterKit + Image + Link + Placeholder

src/app/blog/page.tsx                                   public index + tag chips
src/app/blog/[slug]/page.tsx                            article + Article JSON-LD
src/app/blog/tag/[tag]/page.tsx                         tag filter
src/app/blog/feed.xml/route.ts                          RSS 2.0
```

## Tiptap config (blog body editor)

- Extensions: `StarterKit`, `Link.configure({ openOnClick: false })`, `Image.configure({ inline: false })`, `Placeholder`.
- Dynamic-imported with `ssr: false` to dodge hydration mismatches.
- Toolbar: H2 / H3 / B / I / S / bullet / ordered / blockquote / codeBlock / link / image / hr.
- Image picker: hidden `<input type="file">`, posts to `/api/admin/blog/upload-image`, server returns `{ url, key }`, editor inserts `<img>` via `setImage({ src: url, alt: filename })`.

## Image upload flow

1. Editor opens file picker via temporary `<input>` element.
2. FormData POST → `/api/admin/blog/upload-image` with `requireAdmin()` guard.
3. Server validates: `< 8MB`, `image/*` MIME.
4. Generates key `YYYY-MM-DD/<uuid>.<ext>` and uploads to `blog-images` bucket (private bucket made public by the user in dashboard for served images to work).
5. Returns `getPublicUrl(key).publicUrl`.
6. Editor inserts `<img src="...">` into the post body.

## Scheduled-publish runner location

`src/lib/runners/scheduled-publish-runner.ts` — pure function. Hit by `/api/cron/publish/route.ts` every 15 minutes via the new `*/15 * * * *` Worker cron.

Promotes blog rows where `status='scheduled' AND scheduled_at <= now()` to `status='published'` with `published_at = now()`. Session 10's social publishing pipeline will extend this same runner (or share the cron entrypoint).

### Cron slot accounting

Cloudflare Workers free plan caps the cron count. Previous slate was 5; adding a 6th for publish broke the deploy. Resolution: dropped the no-op quarterly slot (`0 9 1 */3 *`) — re-add in Session 13 when Eurostat quarterly extractors land. Net: still 5 active crons.

Active crons:
```
0 6 * * *       daily 06:00 UTC — ECB rates, FX
0 7 * * 1       weekly Mon 07:00 UTC — ECB balance sheet
0 8 1 * *       monthly 1st 08:00 UTC — money supply, HICP, sovereign yields
0 10 1 3 *      annual 1 March 10:00 UTC — Eurostat + IMF WEO
*/15 * * * *    every 15 min — scheduled publish
```

## Email templates

`015_email_templates.sql` seeds `admin_test` template only. Session 10 will add: `social_post_success`, `social_post_failure`, etc.

`src/lib/email.ts` (Session 1) already has `applyTemplate(text, { name, timestamp })` that replaces `{{var}}` placeholders.

## SEO

- `/blog`: `title="Blog"` (template → "Blog · Eurospending").
- `/blog/[slug]`: per-article `generateMetadata` with `openGraph.type='article'`, `publishedTime`, `tags`, `images` if cover set. JSON-LD Article schema embedded.
- `/blog/tag/[tag]`: per-tag title (decoded).
- `/blog/feed.xml`: RSS 2.0 with up to 50 most recent published articles.

Sitemap already covers `/blog` (Session 6); individual article URLs are NOT yet auto-added to sitemap.xml — Session 12 task.

## Deviations from the plan

- **Quarterly cron slot dropped** to fit the */15 publish cron under the free-tier limit. Session 13 will restore when quarterly Eurostat extractors land.
- **Image uploads require the `blog-images` bucket to be public** (the user toggled this in the dashboard). Alternative for Session 12: switch to signed URLs and serve through a /img/ proxy route.
- **No per-post `view_count` increment yet** — column exists; will surface in Session 12 with analytics.
- **No author display on public article pages** — column tracked, not shown. Easy add later.

## Next actions for the user

1. Visit https://eurospending.org/admin/blog → "New article" → write a test article in Tiptap (try the image upload button), Publish now.
2. Confirm it appears at https://eurospending.org/blog and the slug renders correctly at https://eurospending.org/blog/<your-slug>.
3. Try creating a draft scheduled for 5 minutes in the future and watch it auto-publish.

## What Session 9 will need

- `social_media_candidates` + `social_media_drafts` + `social_photo_usage` tables.
- `src/lib/social/rules/*.ts` — deterministic fact-detection rules.
- `src/lib/social/caption-generator.ts` — Anthropic Haiku for caption prose (numbers come from supporting_data).
- `src/lib/social/chart-renderer.ts` — `next/og` (Satori) for 1080×1080 PNG.
- Manual "Run detection now" admin button (free-tier cron count means we lean on manual triggering; the weekly cron from the brief is deferred).
- `/admin/social-media/candidates` (review/promote/dismiss) and `/admin/social-media/drafts` (edit caption, reschedule, approve).
- Google Drive integration is **deferred to Session 13** — photo-overlay drafts skipped for now; chart drafts only.
