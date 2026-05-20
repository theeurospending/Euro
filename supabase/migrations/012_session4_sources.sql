-- 012_session4_sources.sql
-- Sovereign 10Y bond yields per EU country + IMF WEO forecasts.

insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('sovereign_10y_yield',
     'Sovereign 10Y bond yield',
     '%',
     'monetary',
     'monthly',
     '{ecb}',
     'Benchmark 10-year government bond yield (ECB IRS, monthly average)',
     151),

  ('imf_gdp_growth_forecast_pct',
     'IMF WEO real GDP growth forecast',
     '%',
     'macro',
     'annual',
     '{imf}',
     'IMF World Economic Outlook real GDP growth forecast (April vintage)',
     200),

  ('imf_gross_debt_forecast_pct_gdp',
     'IMF WEO government debt forecast',
     '% of GDP',
     'fiscal_balance',
     'annual',
     '{imf}',
     'IMF WEO general government gross debt forecast, % of GDP',
     201),

  ('imf_net_lending_forecast_pct_gdp',
     'IMF WEO deficit/surplus forecast',
     '% of GDP',
     'fiscal_balance',
     'annual',
     '{imf}',
     'IMF WEO general government net lending/borrowing forecast, % of GDP',
     202),

  ('imf_inflation_forecast_pct',
     'IMF WEO inflation forecast',
     '%',
     'monetary',
     'annual',
     '{imf}',
     'IMF WEO average consumer prices, % change, forecast',
     203)
on conflict (key) do update set
  display_name = excluded.display_name, unit = excluded.unit, category = excluded.category,
  description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('ecb:irs_sovereign_yields',
     'ecb_irs_sovereign_yields',
     'ecb',
     '10Y benchmark government bond yield for all eurozone members (ECB IRS, monthly)',
     'monthly',
     '{sovereign_10y_yield}',
     '{"dataset":"IRS","countries":"all_eurozone"}'::jsonb),

  ('imf:weo_forecasts',
     'imf_weo_forecasts',
     'imf',
     'IMF World Economic Outlook forecasts: GDP growth, debt %, deficit %, inflation',
     'annual',
     '{imf_gdp_growth_forecast_pct,imf_gross_debt_forecast_pct_gdp,imf_net_lending_forecast_pct_gdp,imf_inflation_forecast_pct}',
     '{"dataset":"WEO"}'::jsonb)
on conflict (source_name) do nothing;

notify pgrst, 'reload schema';
