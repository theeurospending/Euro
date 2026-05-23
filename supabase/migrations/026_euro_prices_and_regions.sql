-- 026_euro_prices_and_regions.sql
-- Powers the /euro page additions:
--   * gold + Bitcoin euro prices (Stooq daily) for the "euro vs gold/BTC" charts
--   * China, India, Japan as comparison economies for the regions tab (IMF WEO)
-- Requires ingest runs for prices:stooq and imf:weo_forecasts to populate.

-- Asset-price metrics (euro-denominated reference prices, stored against EZ).
insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('gold_eur', 'Gold price (EUR/oz)', 'EUR per troy ounce', 'monetary', 'daily', '{stooq}', 'Gold spot price in euro per troy ounce (Stooq, daily close)', 160),
  ('btc_eur',  'Bitcoin price (EUR)',  'EUR',                'monetary', 'daily', '{stooq}', 'Bitcoin price in euro (Stooq, daily close)',                  161)
on conflict (key) do update set
  display_name = excluded.display_name, unit = excluded.unit, category = excluded.category,
  frequency = excluded.frequency, source_priority = excluded.source_priority,
  description = excluded.description, display_order = excluded.display_order,
  is_active = true, updated_at = now();

-- Comparison economies for the regions tab (non-EU, non-aggregate).
insert into public.countries
  (iso_code, name, slug, flag_emoji, capital, population_baseline, is_eu_member, is_eurozone_member, display_order)
values
  ('CN', 'China', 'china', '🇨🇳', 'Beijing',  1410000000, false, false, 94),
  ('IN', 'India', 'india', '🇮🇳', 'New Delhi', 1430000000, false, false, 95),
  ('JP', 'Japan', 'japan', '🇯🇵', 'Tokyo',      124000000, false, false, 96)
on conflict (iso_code) do nothing;

-- Price data source.
insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('prices:stooq', 'prices_stooq', 'prices', 'Gold and Bitcoin euro prices (Stooq daily close)', 'daily',
     '{gold_eur,btc_eur}', '{"symbols":["xaueur","btceur"]}'::jsonb)
on conflict (source_name) do nothing;

notify pgrst, 'reload schema';
