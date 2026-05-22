// Default Open Graph image for the homepage. 1200x630, brand navy.

import { ImageResponse } from 'next/og';
import { loadArchivoNarrow } from '@/lib/og-fonts';

export const runtime = 'nodejs';

const NAVY = '#1B2A4A';
const LAV = '#C5CBF0';
const GOLD = '#FFCC00';

export async function GET() {
  const fontData = await loadArchivoNarrow();
  const fonts = fontData ? [{ name: 'Archivo Narrow', data: fontData, weight: 700 as const, style: 'normal' as const }] : undefined;
  const display = fontData ? 'Archivo Narrow' : 'sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          display: 'flex', flexDirection: 'column',
          background: NAVY, color: '#fafafa',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 14, background: '#15203C',
              border: `2px solid ${GOLD}`,
              fontSize: 40, fontWeight: 900, color: '#fff',
            }}>€</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, letterSpacing: 4, fontFamily: display }}>EUROSPENDING</div>
              <div style={{ display: 'flex', marginTop: 4, fontSize: 12, letterSpacing: 4, color: 'rgba(255,255,255,0.55)' }}>EURO ECONOMICS</div>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>SINCE 1999</div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 18, color: LAV, letterSpacing: 3 }}>EU 27 · ECB · IMF</div>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: 2, fontFamily: display }}>
            HOW EUROPE SPENDS,
          </div>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: 2, fontFamily: display }}>
            BORROWS, AND INFLATES.
          </div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 26, color: 'rgba(255,255,255,0.6)' }}>
            Live tracker · every EU country
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
