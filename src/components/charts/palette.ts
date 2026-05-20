// Chart palette aligned with the EUROSPENDING Brand Kit v1.0.
// Charts render on navy surfaces — colours chosen for legibility on dark bg.

export const PALETTE = {
  // Brand foundations
  navy: '#1B2A4A',
  navyDeep: '#15203C',
  lav: '#C5CBF0',
  lavDeep: '#B8BFE8',
  gold: '#FFCC00',
  paper: '#F6F4EF',
  ink: '#1B2A4A',

  // Functional roles
  primary:    '#C5CBF0',          // lavender on navy
  primaryDim: 'rgba(197,203,240,0.45)',
  axis:       'rgba(197,203,240,0.55)',
  grid:       'rgba(197,203,240,0.12)',
  gridDark:   'rgba(197,203,240,0.18)',

  positive:   '#5eead4',          // teal
  negative:   '#fb7185',          // rose
  warning:    '#FFCC00',          // brand gold
  forecast:   'rgba(197,203,240,0.55)',

  // Multi-series cycle on navy backgrounds — high-contrast yet on-brand.
  countries: [
    '#C5CBF0',  // brand lavender
    '#FFCC00',  // brand gold
    '#5eead4',  // teal
    '#fb7185',  // rose
    '#a78bfa',  // violet
    '#34d399',  // emerald
    '#fbbf24',  // amber
    '#60a5fa',  // sky
  ],
} as const;

export function nthCountryColor(i: number): string {
  return PALETTE.countries[i % PALETTE.countries.length];
}
