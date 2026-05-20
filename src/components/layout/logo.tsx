// Eurospending brand logo — icon + wordmark + tagline.
// Two variants per the brand kit: white-on-navy (default for navy pages)
// and navy-on-light for lavender/paper surfaces.

import { BrandIcon } from './brand-icon';

export function Logo({
  variant = 'white',
  size = 'md',
  showTagline = true,
}: {
  variant?: 'white' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}) {
  const dims = {
    sm: { icon: 28, word: 18, tagline: 9, gap: 10 },
    md: { icon: 44, word: 28, tagline: 11, gap: 14 },
    lg: { icon: 64, word: 44, tagline: 14, gap: 18 },
  }[size];

  const fg = variant === 'white' ? '#ffffff' : '#1B2A4A';
  const taglineColor = variant === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(27,42,74,0.7)';

  return (
    <div className="flex items-center" style={{ gap: dims.gap, color: fg }}>
      <BrandIcon size={dims.icon} />
      <div className="flex flex-col leading-none">
        <span
          className="font-display"
          style={{ fontSize: dims.word, letterSpacing: '0.06em', lineHeight: 1 }}
        >
          EUROSPENDING
        </span>
        {showTagline && (
          <span
            className="tagline mt-1"
            style={{ fontSize: dims.tagline, color: taglineColor }}
          >
            Euro Economics
          </span>
        )}
      </div>
    </div>
  );
}
