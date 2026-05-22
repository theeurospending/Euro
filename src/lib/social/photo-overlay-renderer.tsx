// Photo-overlay variant: a country photo from Google Drive with a navy
// gradient overlay + brand wordmark + headline + key stat.
// 1080×1080 via next/og.

import { ImageResponse } from 'next/og';
import type { CandidateFact } from '@/lib/social/types';
import { loadArchivoNarrow } from '@/lib/og-fonts';

const NAVY = '#1B2A4A';
const GOLD = '#FFCC00';

export type PhotoCardInput = {
  fact: CandidateFact;
  unit: string;
  country_label: string;        // e.g. "Greece 🇬🇷"
  photoDataUrl: string;          // data: URL of the country photo (base64-encoded)
};

export async function renderPhotoCardPng(input: PhotoCardInput): Promise<ArrayBuffer> {
  const { fact, unit, country_label, photoDataUrl } = input;
  const valueStr = formatValue(fact.supporting_data.value, unit);
  const fontData = await loadArchivoNarrow();
  const fonts = fontData ? [{ name: 'Archivo Narrow', data: fontData, weight: 700 as const, style: 'normal' as const }] : undefined;
  const display = fontData ? 'Archivo Narrow' : 'sans-serif';

  const response = new ImageResponse(
    (
      <div style={{
        width: 1080, height: 1080, display: 'flex', flexDirection: 'column',
        background: NAVY, position: 'relative', fontFamily: 'sans-serif',
      }}>
        {/* Photo background */}
        {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
        <img
          src={photoDataUrl}
          width={1080}
          height={1080}
          style={{ position: 'absolute', inset: 0, objectFit: 'cover', filter: 'brightness(0.55)' }}
        />
        {/* Navy gradient overlay for legibility */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: `linear-gradient(180deg, ${NAVY}00 0%, ${NAVY}88 50%, ${NAVY}f0 100%)`,
        }} />

        {/* Brand header */}
        <div style={{ display: 'flex', position: 'relative', padding: 60, alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 12, background: NAVY,
            border: `2px solid ${GOLD}`, fontSize: 34, fontWeight: 900, color: '#fff',
          }}>€</div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: 3, fontFamily: display }}>
            EUROSPENDING
          </div>
        </div>

        {/* Body block */}
        <div style={{
          display: 'flex', flexDirection: 'column', position: 'relative',
          marginTop: 'auto', padding: '0 60px 60px', gap: 12,
        }}>
          <div style={{ display: 'flex', fontSize: 28, color: GOLD, letterSpacing: 3, textTransform: 'uppercase' }}>
            {country_label}
          </div>
          <div style={{
            display: 'flex', fontSize: 180, fontWeight: 800, lineHeight: 1,
            color: '#fff', fontFamily: display, letterSpacing: 2,
          }}>{valueStr}</div>
          <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>
            {unit} · {formatPeriod(fact.supporting_data.period)}
          </div>
          <div style={{
            display: 'flex', marginTop: 16, fontSize: 30, lineHeight: 1.25,
            color: '#fff', maxWidth: 960, fontWeight: 500,
          }}>{fact.headline}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, fonts },
  );

  return await response.arrayBuffer();
}

function formatValue(raw: unknown, unit: string): string {
  if (typeof raw !== 'number') return String(raw ?? '');
  if (unit.includes('%')) return `${raw.toFixed(1)}%`;
  if (unit.toLowerCase().includes('eur')) {
    if (raw >= 1_000_000) return `€${(raw / 1_000_000).toFixed(1)}T`;
    if (raw >= 1_000) return `€${(raw / 1_000).toFixed(0)}B`;
    return `€${raw.toFixed(0)}M`;
  }
  return raw.toFixed(2);
}

function formatPeriod(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  return raw;
}
