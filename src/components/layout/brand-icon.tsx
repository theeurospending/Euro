// Brand icon: 12 gold stars in a ring around a white € glyph on navy,
// rendered programmatically so it scales to any size.

function starPolygon(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(' ');
}

const STARS = Array.from({ length: 12 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
  return { cx: 200 + Math.cos(a) * 145, cy: 200 + Math.sin(a) * 145 };
});

export function BrandIcon({
  size = 44,
  rounded = true,
}: {
  size?: number;
  rounded?: boolean;
}) {
  const rx = rounded ? 80 : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flex: '0 0 auto' }}
      aria-label="Eurospending logo"
    >
      <rect width="400" height="400" rx={rx} fill="#1B2A4A" />
      {STARS.map((s, i) => (
        <polygon key={i} points={starPolygon(s.cx, s.cy, 18)} fill="#FFCC00" />
      ))}
      <text
        x="200"
        y="200"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={900}
        fontSize={200}
      >
        €
      </text>
    </svg>
  );
}
