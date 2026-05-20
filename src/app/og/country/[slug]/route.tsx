// Country-specific OG image. 1200x630, brand navy + live snapshot stats.

import { ImageResponse } from 'next/og';
import { loadCountryPageData } from '@/lib/country-page-data';

export const runtime = 'nodejs';

const NAVY = '#1B2A4A';
const LAV = '#C5CBF0';
const GOLD = '#FFCC00';
const TEAL = '#5eead4';

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
        background: NAVY, color: '#fafafa', padding: 80,
        fontFamily: 'sans-serif',
      }}>
        {/* Brand strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 48, height: 48, borderRadius: 10, background: '#15203C',
              border: `2px solid ${GOLD}`,
              fontSize: 30, fontWeight: 900, color: '#fff',
            }}>€</div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>EUROSPENDING</div>
          </div>
          <div style={{ display: 'flex', fontSize: 16, letterSpacing: 2, color: 'rgba(255,255,255,0.45)' }}>
            EUROSPENDING.ORG
          </div>
        </div>

        {/* Country name */}
        <div style={{ display: 'flex', marginTop: 50, alignItems: 'baseline', gap: 24 }}>
          <span style={{ display: 'flex', fontSize: 110 }}>{c.flag_emoji}</span>
          <span style={{ display: 'flex', fontSize: 96, fontWeight: 800, letterSpacing: 2, lineHeight: 1 }}>{c.name.toUpperCase()}</span>
        </div>

        <div style={{ display: 'flex', marginTop: 20, fontSize: 18, letterSpacing: 4, color: LAV }}>
          {c.is_eurozone_member ? 'EUROZONE MEMBER' : c.is_eu_member ? 'EU MEMBER' : 'COMPARATOR'}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', marginTop: 'auto', width: '100%', justifyContent: 'space-between', gap: 20 }}>
          <Stat label="DEBT"      value={debt    ? `${debt.value.toFixed(0)}%`    : '—'} unit="% GDP"  accent={GOLD} />
          <Stat label="DEFICIT"   value={deficit ? `${deficit.value.toFixed(1)}%` : '—'} unit="% GDP"  accent={LAV} />
          <Stat label="INFLATION" value={hicp    ? `${hicp.value.toFixed(1)}%`    : '—'} unit="HICP"   accent={TEAL} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <div style={{ display: 'flex', fontSize: 16, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ display: 'flex', fontSize: 78, fontWeight: 800, lineHeight: 1, color: accent }}>{value}</div>
        <div style={{ display: 'flex', fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>{unit}</div>
      </div>
    </div>
  );
}
