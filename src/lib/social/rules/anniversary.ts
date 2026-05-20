// Detect that today is the N-year anniversary of a notable monetary_events row.

import type { CandidateFact } from '@/lib/social/types';

const ANNIVERSARIES = [1, 5, 10, 15, 20, 25];

type MonetaryEvent = {
  id: number;
  event_date: string;
  category: string;
  title: string;
  description: string | null;
};

export function detectAnniversaries(events: MonetaryEvent[], asOf: Date = new Date()): CandidateFact[] {
  const out: CandidateFact[] = [];
  const todayMonthDay = `${String(asOf.getUTCMonth() + 1).padStart(2, '0')}-${String(asOf.getUTCDate()).padStart(2, '0')}`;
  const todayYear = asOf.getUTCFullYear();

  for (const ev of events) {
    const eventMonthDay = ev.event_date.slice(5, 10);
    if (eventMonthDay !== todayMonthDay) continue;
    const eventYear = parseInt(ev.event_date.slice(0, 4), 10);
    const ageYears = todayYear - eventYear;
    if (!ANNIVERSARIES.includes(ageYears)) continue;
    out.push({
      country_iso: null,
      rule_name: 'anniversary',
      headline: `${ageYears} years ago today: ${ev.title} (${ev.event_date})`,
      supporting_data: {
        metric: null, period: ev.event_date,
        event_id: ev.id, event_title: ev.title, event_category: ev.category,
        years_ago: ageYears,
      },
      priority_score: 40 + Math.min(30, ageYears),
      chart_type: 'none',
    });
  }
  return out;
}
