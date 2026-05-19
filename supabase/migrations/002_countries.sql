-- 002_countries.sql
-- EU27 + EZ aggregate + EU27 aggregate + comparison non-EU peers.

create table if not exists public.countries (
  iso_code text primary key,            -- ISO 3166-1 alpha-2 (or special: EZ, EU)
  name text not null,
  slug text not null unique,
  flag_emoji text,
  joined_eurozone date,                 -- null for non-eurozone
  joined_eu date,                       -- null for non-EU
  capital text,
  population_baseline bigint,           -- approx, for display only
  is_aggregate boolean not null default false,
  is_eu_member boolean not null default false,
  is_eurozone_member boolean not null default false,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists countries_display_order_idx on public.countries (display_order);
create index if not exists countries_slug_idx on public.countries (slug);

alter table public.countries enable row level security;

drop policy if exists "countries public read" on public.countries;
create policy "countries public read" on public.countries
  for select using (true);

-- ============================================================
-- Seed: EU27 + eurozone + EU aggregates + non-EU comparators.
-- ============================================================
insert into public.countries
  (iso_code, name, slug, flag_emoji, joined_eu, joined_eurozone, capital, population_baseline, is_eu_member, is_eurozone_member, display_order)
values
  ('AT', 'Austria',        'austria',        '🇦🇹', '1995-01-01', '1999-01-01', 'Vienna',       9000000,  true,  true,  10),
  ('BE', 'Belgium',        'belgium',        '🇧🇪', '1958-01-01', '1999-01-01', 'Brussels',    11600000,  true,  true,  11),
  ('BG', 'Bulgaria',       'bulgaria',       '🇧🇬', '2007-01-01', null,         'Sofia',        6800000,  true,  false, 12),
  ('HR', 'Croatia',        'croatia',        '🇭🇷', '2013-07-01', '2023-01-01', 'Zagreb',       3850000,  true,  true,  13),
  ('CY', 'Cyprus',         'cyprus',         '🇨🇾', '2004-05-01', '2008-01-01', 'Nicosia',       900000,  true,  true,  14),
  ('CZ', 'Czech Republic', 'czech-republic', '🇨🇿', '2004-05-01', null,         'Prague',      10500000,  true,  false, 15),
  ('DK', 'Denmark',        'denmark',        '🇩🇰', '1973-01-01', null,         'Copenhagen',   5900000,  true,  false, 16),
  ('EE', 'Estonia',        'estonia',        '🇪🇪', '2004-05-01', '2011-01-01', 'Tallinn',      1330000,  true,  true,  17),
  ('FI', 'Finland',        'finland',        '🇫🇮', '1995-01-01', '1999-01-01', 'Helsinki',     5550000,  true,  true,  18),
  ('FR', 'France',         'france',         '🇫🇷', '1958-01-01', '1999-01-01', 'Paris',       68000000,  true,  true,  19),
  ('DE', 'Germany',        'germany',        '🇩🇪', '1958-01-01', '1999-01-01', 'Berlin',      84000000,  true,  true,  20),
  ('GR', 'Greece',         'greece',         '🇬🇷', '1981-01-01', '2001-01-01', 'Athens',      10400000,  true,  true,  21),
  ('HU', 'Hungary',        'hungary',        '🇭🇺', '2004-05-01', null,         'Budapest',     9600000,  true,  false, 22),
  ('IE', 'Ireland',        'ireland',        '🇮🇪', '1973-01-01', '1999-01-01', 'Dublin',       5100000,  true,  true,  23),
  ('IT', 'Italy',          'italy',          '🇮🇹', '1958-01-01', '1999-01-01', 'Rome',        59000000,  true,  true,  24),
  ('LV', 'Latvia',         'latvia',         '🇱🇻', '2004-05-01', '2014-01-01', 'Riga',         1880000,  true,  true,  25),
  ('LT', 'Lithuania',      'lithuania',      '🇱🇹', '2004-05-01', '2015-01-01', 'Vilnius',      2800000,  true,  true,  26),
  ('LU', 'Luxembourg',     'luxembourg',     '🇱🇺', '1958-01-01', '1999-01-01', 'Luxembourg',    660000,  true,  true,  27),
  ('MT', 'Malta',          'malta',          '🇲🇹', '2004-05-01', '2008-01-01', 'Valletta',      540000,  true,  true,  28),
  ('NL', 'Netherlands',    'netherlands',    '🇳🇱', '1958-01-01', '1999-01-01', 'Amsterdam',   17800000,  true,  true,  29),
  ('PL', 'Poland',         'poland',         '🇵🇱', '2004-05-01', null,         'Warsaw',      37700000,  true,  false, 30),
  ('PT', 'Portugal',       'portugal',       '🇵🇹', '1986-01-01', '1999-01-01', 'Lisbon',      10400000,  true,  true,  31),
  ('RO', 'Romania',        'romania',        '🇷🇴', '2007-01-01', null,         'Bucharest',   19000000,  true,  false, 32),
  ('SK', 'Slovakia',       'slovakia',       '🇸🇰', '2004-05-01', '2009-01-01', 'Bratislava',   5450000,  true,  true,  33),
  ('SI', 'Slovenia',       'slovenia',       '🇸🇮', '2004-05-01', '2007-01-01', 'Ljubljana',    2100000,  true,  true,  34),
  ('ES', 'Spain',          'spain',          '🇪🇸', '1986-01-01', '1999-01-01', 'Madrid',      48000000,  true,  true,  35),
  ('SE', 'Sweden',         'sweden',         '🇸🇪', '1995-01-01', null,         'Stockholm',   10500000,  true,  false, 36)
on conflict (iso_code) do nothing;

-- Aggregates
insert into public.countries
  (iso_code, name, slug, flag_emoji, capital, population_baseline, is_aggregate, is_eu_member, is_eurozone_member, display_order)
values
  ('EZ', 'Eurozone (EA19/EA20)', 'eurozone', '🇪🇺', null, 350000000, true, false, false, 1),
  ('EU', 'European Union (EU27)', 'eu27',    '🇪🇺', null, 448000000, true, false, false, 2)
on conflict (iso_code) do nothing;

-- Comparison peers (non-EU)
insert into public.countries
  (iso_code, name, slug, flag_emoji, capital, population_baseline, is_eu_member, is_eurozone_member, display_order)
values
  ('GB', 'United Kingdom', 'united-kingdom', '🇬🇧', 'London',     67000000, false, false, 90),
  ('US', 'United States',  'united-states',  '🇺🇸', 'Washington', 332000000, false, false, 91),
  ('CH', 'Switzerland',    'switzerland',    '🇨🇭', 'Bern',        8700000, false, false, 92),
  ('NO', 'Norway',         'norway',         '🇳🇴', 'Oslo',        5500000, false, false, 93)
on conflict (iso_code) do nothing;
