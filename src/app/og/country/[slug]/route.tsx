// Country-specific OG image with live snapshot stats and Archivo Narrow.

import { ImageResponse } from 'next/og';
import { loadCountryPageData } from '@/lib/country-page-data';
import { loadArchivoNarrow } from '@/lib/og-fonts';

export const runtime = 'nodejs';

const NAVY = '#1B2A4A';
const LAV = '#C5CBF0';
const GOLD = '#FFCC00';
const TEAL = '#5eead4';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, fontData] = await Promise.all([
    loadCountryPageData(slug),
    loadArchivoNarrow(),
  ]);
  if (!data) return new Response('not found', { status: 404 });
  const c = data.country;
  const debt = data.snapshot['gov_debt_pct_gdp']?.latest;
  const deficit = data.snapshot['gov_deficit_pct_gdp']?.latest;
  const hicp = data.snapshot['hicp_annual_pct']?.latest;

  const fonts = fontData ? [{ name: 'Archivo Narrow', data: fontData, weight: 700 as const, style: 'normal' as const }] : undefined;
  const display = fontData ? 'Archivo Narrow' : 'sans-serif';

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        background: NAVY, color: '#fafafa', padding: 80,
        fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 48, height: 48, borderRadius: 10, background: '#15203C',
              border: `2px solid ${GOLD}`,
              fontSize: 30, fontWeight: 900, color: '#fff',
            }}>€</div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, letterSpacing: 3, fontFamily: display }}>EUROSPENDING</div>
          </div>
          <div style={{ display: 'flex', fontSize: 16, letterSpacing: 2, color: 'rgba(255,255,255,0.45)' }}>
            EUROSPENDING.ORG
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 50, alignItems: 'baseline', gap: 24 }}>
          <span style={{ display: 'flex', fontSize: 110 }}>{c.flag_emoji}</span>
          <span style={{ display: 'flex', fontSize: 96, fontWeight: 700, letterSpacing: 2, lineHeight: 1, fontFamily: display }}>{c.name.toUpperCase()}</span>
        </div>

        <div style={{ display: 'flex', marginTop: 20, fontSize: 18, letterSpacing: 4, color: LAV }}>
          {c.is_eurozone_member ? 'EUROZONE MEMBER' : c.is_eu_member ? 'EU MEMBER' : 'COMPARATOR'}
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', width: '100%', justifyContent: 'space-between', gap: 20 }}>
          <Stat label="DEBT"      value={debt    ? `${debt.value.toFixed(0)}%`    : '—'} unit="% GDP"  accent={GOLD} font={display} />
          <Stat label="DEFICIT"   value={deficit ? `${deficit.value.toFixed(1)}%` : '—'} unit="% GDP"  accent={LAV}  font={display} />
          <Stat label="INFLATION" value={hicp    ? `${hicp.value.toFixed(1)}%`    : '—'} unit="HICP"   accent={TEAL} font={display} />
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}

function Stat({ label, value, unit, accent, font }: { label: string; value: string; unit: string; accent: string; font: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <div style={{ display: 'flex', fontSize: 16, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, lineHeight: 1, color: accent, fontFamily: font }}>{value}</div>
        <div style={{ display: 'flex', fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>{unit}</div>
      </div>
    </div>
  );
}
