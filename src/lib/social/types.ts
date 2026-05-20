// Types shared between the fact detector, the runner, and the admin UI.

export type ChartType = 'line' | 'bar' | 'donut' | 'none';

export type CandidateFact = {
  country_iso: string | null;        // null for eurozone-wide
  rule_name: string;
  headline: string;                  // deterministic — no AI; numbers come from supporting_data
  supporting_data: Record<string, unknown>;
  priority_score: number;            // 0..100
  chart_type: ChartType;
};

export type DataPoint = { period_start: string; value: number };

// Per-country, per-metric ordered series. Pulled by the runner once per run.
export type SeriesIndex = Map<string /* `${iso}|${metric}` */, DataPoint[]>;
