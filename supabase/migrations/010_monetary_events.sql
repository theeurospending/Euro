-- 010_monetary_events.sql
-- Editorial timeline of monetary events (rate changes, crises, milestones).

create table if not exists public.monetary_events (
  id bigserial primary key,
  event_date date not null,
  category text not null,                  -- 'rate_change'|'qe'|'crisis'|'milestone'|'treaty'
  title text not null,
  description text,                        -- markdown / plain text
  impact_summary text,                     -- short one-paragraph editorial summary
  related_metric_keys text[] not null default '{}',
  source_url text,
  created_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists monetary_events_date_idx on public.monetary_events (event_date desc);
create index if not exists monetary_events_category_idx on public.monetary_events (category);

alter table public.monetary_events enable row level security;

drop policy if exists "monetary_events public read" on public.monetary_events;
create policy "monetary_events public read" on public.monetary_events
  for select using (true);

grant select on public.monetary_events to anon, authenticated;
grant all    on public.monetary_events to service_role;
grant usage, select on sequence monetary_events_id_seq to service_role;

-- ============================================================
-- Seed: foundational events.
-- ============================================================
insert into public.monetary_events
  (event_date, category, title, description, impact_summary, related_metric_keys, source_url)
values
  ('1999-01-01', 'milestone',  'Euro launched',
    'The euro is introduced as an accounting currency for 11 founding member states (AT, BE, DE, ES, FI, FR, IE, IT, LU, NL, PT). Exchange rates are irrevocably fixed.',
    'Single currency goes live in non-cash form. National currencies remain in circulation until 2002.',
    '{eur_usd_rate,eur_gbp_rate}', 'https://www.ecb.europa.eu/ecb/history/emu/html/index.en.html'),

  ('2001-01-01', 'milestone',  'Greece joins the eurozone',
    'Greece becomes the 12th member of the euro area.',
    'Eurozone expands to 12 members.',
    '{}', null),

  ('2002-01-01', 'milestone',  'Euro banknotes and coins enter circulation',
    'Physical euro cash replaces 12 national currencies on 1 January 2002.',
    'Single currency becomes tangible for ~300m citizens.',
    '{}', null),

  ('2008-09-15', 'crisis',     'Lehman Brothers collapse — Global Financial Crisis begins',
    'Lehman bankruptcy triggers the most severe global financial crisis since 1929. ECB responds with emergency liquidity operations and rate cuts.',
    'ECB cuts main refi from 4.25% to 1.0% over the following year. Public deficits spike across the bloc.',
    '{ecb_main_refi_rate,gov_deficit_pct_gdp}', null),

  ('2010-05-02', 'crisis',     'First Greek bailout',
    'EU + IMF agree €110bn rescue package for Greece, triggering the sovereign debt crisis phase that engulfs Ireland, Portugal, Spain, Italy.',
    'Peripheral bond spreads widen dramatically. Bund yields fall as flight-to-safety dominates.',
    '{gov_debt_pct_gdp,bund_10y_yield}', null),

  ('2012-07-26', 'milestone',  'Draghi: "Whatever it takes"',
    'ECB President Mario Draghi pledges in London: "Within our mandate, the ECB is ready to do whatever it takes to preserve the euro. And believe me, it will be enough."',
    'Peripheral spreads collapse over the following months. Considered the turning point of the sovereign debt crisis.',
    '{bund_10y_yield}', 'https://www.ecb.europa.eu/press/key/date/2012/html/sp120726.en.html'),

  ('2014-06-05', 'rate_change','ECB cuts deposit rate to -0.10% (negative rates begin)',
    'First major central bank in a developed economy to push policy rates below zero.',
    'Deposit rate goes from 0.00% to -0.10%. Falls further to -0.50% by 2019.',
    '{ecb_deposit_facility_rate}', null),

  ('2015-03-09', 'qe',         'ECB launches asset-purchase programme (APP / "QE")',
    '€60bn/month sovereign bond purchases begin under the Public Sector Purchase Programme. Balance sheet expands sharply.',
    'Balance sheet expands from ~€2.2T toward ~€4.7T over the next 4 years.',
    '{ecb_balance_sheet_total,bund_10y_yield}', null),

  ('2020-03-18', 'qe',         'PEPP launched (COVID emergency)',
    'ECB announces €750bn Pandemic Emergency Purchase Programme, later expanded to €1.85T. Cuts off the spike in peripheral spreads at the onset of COVID.',
    'Balance sheet roughly doubles by end-2021.',
    '{ecb_balance_sheet_total,bund_10y_yield,gov_deficit_pct_gdp}', null),

  ('2022-07-21', 'rate_change','ECB ends negative-rate era — first hike in 11 years',
    'Deposit facility lifted from -0.50% to 0.00%; main refi from 0.00% to 0.50%. Begins the most aggressive tightening cycle in ECB history.',
    'Triggered by post-pandemic inflation surge; eurozone HICP peaks at 10.6% in Oct 2022.',
    '{ecb_main_refi_rate,ecb_deposit_facility_rate,eurozone_hicp_headline}', null),

  ('2023-01-01', 'milestone',  'Croatia joins the eurozone',
    'Croatia becomes the 20th eurozone member.',
    'Eurozone expands to 20 members. EA19 → EA20.',
    '{}', null),

  ('2023-09-14', 'rate_change','ECB main refi peaks at 4.50%',
    'After 10 consecutive hikes, the main refinancing rate reaches its cycle peak at 4.50% (deposit facility 4.00%).',
    'Marks end of the hiking phase. Held at peak until June 2024.',
    '{ecb_main_refi_rate,ecb_deposit_facility_rate}', null)
on conflict do nothing;
