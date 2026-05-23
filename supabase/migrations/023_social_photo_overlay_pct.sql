-- 023_social_photo_overlay_pct.sql
-- Share of auto-generated drafts that use a Google Drive photo overlay rather
-- than an on-brand infographic template. The rest rotate across the
-- stat-spotlight / trend-line / bar-trend / comparison templates.

insert into public.admin_settings (key, value, description) values
  ('social.photo_overlay_pct', '20'::jsonb, 'Approx percent of auto-generated drafts that use a Drive photo overlay (0-100); rest use infographic templates')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
