'use client';

import { useMemo, useState } from 'react';
import type { MonetaryEvent } from '@/lib/euro-page-data';

const CATEGORY_COLORS: Record<string, string> = {
  rate_change: '#0f766e',
  qe:          '#7c2d12',
  crisis:      '#dc2626',
  milestone:   '#1e40af',
  treaty:      '#7e22ce',
};

export function EventTimeline({ events }: { events: MonetaryEvent[] }) {
  const [selected, setSelected] = useState<MonetaryEvent | null>(null);

  const { startYear, endYear, dotPositions } = useMemo(() => {
    if (events.length === 0) return { startYear: 1999, endYear: new Date().getUTCFullYear(), dotPositions: [] };
    const dates = events.map((e) => new Date(e.event_date).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates, Date.now());
    const startYear = new Date(min).getUTCFullYear();
    const endYear = new Date(max).getUTCFullYear();
    const span = max - min;
    const dotPositions = events.map((e) => {
      const t = new Date(e.event_date).getTime();
      return { event: e, x: ((t - min) / span) * 100 };
    });
    return { startYear, endYear, dotPositions };
  }, [events]);

  return (
    <div>
      {/* Year axis */}
      <div className="relative">
        <div className="overflow-x-auto pb-4">
          <div className="relative" style={{ minWidth: 800, height: 100 }}>
            {/* Track */}
            <div className="absolute left-0 right-0 top-12 h-px bg-zinc-300 dark:bg-zinc-700" />

            {/* Year labels */}
            {yearTicks(startYear, endYear).map((yr) => {
              const pct = (yr - startYear) / (endYear - startYear);
              return (
                <div key={yr} className="absolute -translate-x-1/2 text-[10px] text-zinc-400" style={{ left: `${pct * 100}%`, top: 60 }}>
                  <div className="mx-auto h-2 w-px bg-zinc-300 dark:bg-zinc-700" />
                  <div className="mt-1">{yr}</div>
                </div>
              );
            })}

            {/* Event dots */}
            {dotPositions.map(({ event, x }, i) => (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-transform hover:scale-125 dark:ring-zinc-950"
                style={{
                  left: `${x}%`,
                  top: 48,
                  width: 12,
                  height: 12,
                  background: CATEGORY_COLORS[event.category] ?? '#71717a',
                }}
                title={`${event.event_date} — ${event.title}`}
                aria-label={event.title}
              >
                <span className="sr-only">{event.title}</span>
                {/* Stagger label every 3rd event to avoid overlap */}
                {(i % 3) === 0 && (
                  <span className="absolute left-1/2 top-4 inline-block -translate-x-1/2 whitespace-nowrap text-[9px] text-zinc-500">
                    {event.title.length > 18 ? `${event.title.slice(0, 18)}…` : event.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <span key={cat} className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {cat.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <span className="font-mono text-xs text-zinc-500">{selected.event_date}</span>
              <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{selected.category}</span>
              <h3 className="mt-1 text-lg font-semibold">{selected.title}</h3>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-zinc-500 hover:underline">close</button>
          </div>
          {selected.description && <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{selected.description}</p>}
          {selected.impact_summary && <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">↳ {selected.impact_summary}</p>}
          {selected.source_url && (
            <a href={selected.source_url} target="_blank" rel="noopener" className="mt-3 inline-block text-xs text-blue-700 hover:underline">Source ↗</a>
          )}
        </div>
      )}
    </div>
  );
}

function yearTicks(start: number, end: number): number[] {
  const out: number[] = [];
  const step = end - start > 25 ? 5 : 2;
  for (let y = start; y <= end; y += step) out.push(y);
  if (out[out.length - 1] !== end) out.push(end);
  return out;
}
