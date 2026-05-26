-- 024_social_photo_overlay_pct_75.sql
-- Raise the photo-overlay share to ~75%: most auto-generated drafts now use a
-- Google Drive country photo background; the rest rotate the infographic
-- templates. Overrides the 20% seeded in 023.

update public.admin_settings
  set value = '75'::jsonb
  where key = 'social.photo_overlay_pct';

insert into public.admin_settings (key, value, description) values
  ('social.photo_overlay_pct', '75'::jsonb, 'Approx percent of auto-generated drafts that use a Drive photo overlay (0-100); rest use infographic templates')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
