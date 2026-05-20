// Country-specific OG image. Pulls snapshot stats from the country-page loader
// and renders a 1200x630 stat card.

import { ImageResponse } from 'next/og';
import { loadCountryPageData } from '@/lib/country-page-data';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadCountryPageData(slug);
  if (!data) return new Response('not found', { status: 404 });
  const c = data.country;
  const debt = data.snapshot['gov_debt_pct_gdp']?.latest;
  const deficit = data.snapshot['gov_deficit_pct_gdp']?.latest;
  const hicp = data.snapshot['hicp_annual_pct']?.latest;

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        background: '#fafafa', color: '#0f172a', padding: 80, fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#71717a' }}>eurospending.org</div>
          <div style={{ display: 'flex', fontSize: 32, color: '#71717a' }}>since 1999</div>
        </div>

        <div style={{ display: 'flex', marginTop: 30, alignItems: 'baseline', gap: 24 }}>
          <span style={{ display: 'flex', fontSize: 120 }}>{c.flag_emoji}</span>
          <span style={{ display: 'flex', fontSize: 96, fontWeight: 800 }}>{c.name}</span>
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', width: '100%', justifyContent: 'space-between' }}>
          <Stat label="Debt"     value={debt    ? `${debt.value.toFixed(0)}%`    : '—'} />
          <Stat label="Deficit"  value={deficit ? `${deficit.value.toFixed(1)}%` : '—'} />
          <Stat label="Inflation" value={hicp    ? `${hicp.value.toFixed(1)}%`    : '—'} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', fontSize: 28, color: '#71717a' }}>{label}</div>
      <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: '#0f766e' }}>{value}</div>
    </div>
  );
}
