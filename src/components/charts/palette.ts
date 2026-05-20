// Shared chart palette. Hex values mirror Tailwind tokens so visual changes
// are easy to make consistently across all chart types.

export const PALETTE = {
  primary:  '#0f172a', // zinc-900
  primaryDim: '#71717a', // zinc-500
  axis:     '#a1a1aa', // zinc-400
  grid:     '#e4e4e7', // zinc-200
  gridDark: '#27272a', // zinc-800

  positive: '#16a34a', // green-600
  negative: '#dc2626', // red-600
  warning:  '#f59e0b', // amber-500
  forecast: '#94a3b8', // slate-400 (dashed forecasts)

  countries: [
    '#0f766e', // teal-700
    '#7c2d12', // orange-900
    '#1e40af', // blue-800
    '#7e22ce', // purple-700
    '#be123c', // rose-700
    '#15803d', // green-700
    '#a16207', // amber-700
    '#0c4a6e', // sky-900
  ],
} as const;

export function nthCountryColor(i: number): string {
  return PALETTE.countries[i % PALETTE.countries.length];
}
