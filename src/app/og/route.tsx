// Default Open Graph image for the homepage and any page without a custom OG.
// 1200x630, brand wordmark + tagline.

import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        background: '#0f172a', color: '#fafafa', padding: 80, fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#94a3b8' }}>eurospending.org</div>
        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 88, fontWeight: 800, lineHeight: 1 }}>How Europe spends</div>
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 800, lineHeight: 1 }}>borrows, and inflates.</div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 30, color: '#94a3b8' }}>
          Live tracker · 1999 → today · every EU country
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
