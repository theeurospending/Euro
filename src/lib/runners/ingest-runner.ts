// Pure ingest runner. Never throws — captures errors per source and returns a summary.
// Both the cron handler and the admin "Run now" button call this.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  EUROSTAT_EXTRACTORS,
  type EurostatExtractorName,
  type ExtractedRow,
} from '@/lib/extractors/eurostat';

type TriggeredBy = 'manual' | 'admin' | 'cron';

export type IngestRunOpts = {
  sourceNames?: string[];           // if omitted, runs all enabled sources
  triggeredBy?: TriggeredBy;
  sinceYear?: number;
};

export type SourceRunResult = {
  source_name: string;
  status: 'ok' | 'error' | 'skipped';
  rows_fetched: number;
  rows_added: number;
  rows_updated: number;
  rows_unchanged: number;
  rows_rejected: number;
  errors: { message: string; sample?: unknown }[];
  ingest_run_id?: number;
};

export type IngestRunSummary = {
  triggered_by: TriggeredBy;
  started_at: string;
  finished_at: string;
  sources: SourceRunResult[];
};

const VALIDATION_SPIKE_PCT = 0.5;  // reject values >50% different from previous period

export async function runIngest(opts: IngestRunOpts = {}): Promise<IngestRunSummary> {
  const startedAt = new Date().toISOString();
  const triggeredBy: TriggeredBy = opts.triggeredBy ?? 'manual';
  const admin = createSupabaseAdminClient();

  // Resolve which sources to run.
  let sourceQuery = admin.from('data_sources').select('*').eq('enabled', true);
  if (opts.sourceNames && opts.sourceNames.length > 0) {
    sourceQuery = admin.from('data_sources').select('*').in('source_name', opts.sourceNames);
  }
  const { data: sources, error: sourcesError } = await sourceQuery;

  if (sourcesError || !sources) {
    return {
      triggered_by: triggeredBy,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      sources: [{
        source_name: '(setup)',
        status: 'error',
        rows_fetched: 0, rows_added: 0, rows_updated: 0, rows_unchanged: 0, rows_rejected: 0,
        errors: [{ message: `Could not load data_sources: ${sourcesError?.message ?? 'no rows'}` }],
      }],
    };
  }

  const results: SourceRunResult[] = [];
  for (const src of sources) {
    const r = await runOneSource(admin, src, opts, triggeredBy);
    results.push(r);
  }

  return {
    triggered_by: triggeredBy,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    sources: results,
  };
}

type DataSourceRow = {
  source_name: string;
  extractor_name: string;
  category: string;
  metric_keys: string[];
  config: Record<string, unknown>;
};

async function runOneSource(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  src: DataSourceRow,
  opts: IngestRunOpts,
  triggeredBy: TriggeredBy,
): Promise<SourceRunResult> {
  const result: SourceRunResult = {
    source_name: src.source_name,
    status: 'ok',
    rows_fetched: 0,
    rows_added: 0,
    rows_updated: 0,
    rows_unchanged: 0,
    rows_rejected: 0,
    errors: [],
  };

  // Open ingest log row.
  const { data: logRow } = await admin
    .from('ingest_run_log')
    .insert({ source_name: src.source_name, triggered_by: triggeredBy })
    .select('id')
    .single();
  const ingestRunId = logRow?.id;
  result.ingest_run_id = ingestRunId;

  // Update last_run_started_at on source.
  await admin
    .from('data_sources')
    .update({ last_run_started_at: new Date().toISOString() })
    .eq('source_name', src.source_name);

  try {
    if (src.category !== 'eurostat') {
      throw new Error(`Unknown source category "${src.category}"`);
    }
    const extractorFn = EUROSTAT_EXTRACTORS[src.extractor_name as EurostatExtractorName];
    if (!extractorFn) {
      throw new Error(`Unknown extractor "${src.extractor_name}"`);
    }

    const fetched: ExtractedRow[] = await extractorFn({ sinceYear: opts.sinceYear });
    result.rows_fetched = fetched.length;

    if (fetched.length === 0) {
      result.errors.push({ message: 'Extractor returned 0 rows' });
    }

    const upsertOutcome = await diffAndUpsert(admin, fetched, ingestRunId);
    result.rows_added = upsertOutcome.added;
    result.rows_updated = upsertOutcome.updated;
    result.rows_unchanged = upsertOutcome.unchanged;
    result.rows_rejected = upsertOutcome.rejected;
    for (const e of upsertOutcome.errors) result.errors.push(e);

    if (result.errors.length > 0 && result.rows_added + result.rows_updated > 0) {
      result.status = 'ok'; // partial success still counts as ok overall
    }
  } catch (err) {
    result.status = 'error';
    result.errors.push({ message: err instanceof Error ? err.message : String(err) });
  }

  // Close log row + update source meta.
  await admin
    .from('ingest_run_log')
    .update({
      finished_at: new Date().toISOString(),
      rows_added: result.rows_added,
      rows_updated: result.rows_updated,
      rows_unchanged: result.rows_unchanged,
      rows_rejected: result.rows_rejected,
      errors: result.errors,
    })
    .eq('id', ingestRunId);

  await admin
    .from('data_sources')
    .update({
      last_run_finished_at: new Date().toISOString(),
      last_run_status: result.status,
      last_run_summary: {
        added: result.rows_added,
        updated: result.rows_updated,
        unchanged: result.rows_unchanged,
        rejected: result.rows_rejected,
        errors: result.errors,
      },
      consecutive_failures: result.status === 'error'
        ? undefined  // we'll bump it in a separate call below since supabase-js can't increment in one go
        : 0,
      updated_at: new Date().toISOString(),
    })
    .eq('source_name', src.source_name);

  if (result.status === 'error') {
    // Best-effort failure counter bump; RPC may not be defined yet (Session 2 doesn't create it).
    try { await admin.rpc('increment_data_source_failures', { p_source_name: src.source_name }); }
    catch { /* ignore */ }
  }

  return result;
}

type DiffOutcome = {
  added: number;
  updated: number;
  unchanged: number;
  rejected: number;
  errors: { message: string; sample?: unknown }[];
};

async function diffAndUpsert(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  fetched: ExtractedRow[],
  ingestRunId: number | undefined,
): Promise<DiffOutcome> {
  const outcome: DiffOutcome = { added: 0, updated: 0, unchanged: 0, rejected: 0, errors: [] };
  if (fetched.length === 0) return outcome;

  // Validate.
  const cleaned: ExtractedRow[] = [];
  for (const r of fetched) {
    if (!Number.isFinite(r.value)) {
      outcome.rejected++;
      outcome.errors.push({ message: 'non-finite value', sample: redact(r) });
      continue;
    }
    if (!r.country_iso || !r.metric_key || !r.period_start) {
      outcome.rejected++;
      outcome.errors.push({ message: 'missing key field', sample: redact(r) });
      continue;
    }
    cleaned.push(r);
  }

  // Pull existing rows for the affected (country, metric, period) tuples.
  // To keep the query bounded, fetch by metric in batches.
  const byMetric = new Map<string, ExtractedRow[]>();
  for (const r of cleaned) {
    const arr = byMetric.get(r.metric_key) ?? [];
    arr.push(r);
    byMetric.set(r.metric_key, arr);
  }

  const existingMap = new Map<string, { value: number; source: string; period_start: string }>();
  // We also need a per-(country, metric) "previous period" lookup for spike detection.
  const seriesByKey = new Map<string, { period_start: string; value: number }[]>();

  for (const [metricKey, rows] of byMetric) {
    const countries = [...new Set(rows.map((r) => r.country_iso))];
    const { data, error } = await admin
      .from('economic_data_points')
      .select('country_iso, metric_key, period_start, value, source')
      .eq('metric_key', metricKey)
      .in('country_iso', countries);
    if (error) {
      outcome.errors.push({ message: `select existing for metric "${metricKey}": ${error.message}` });
      continue;
    }
    for (const row of data ?? []) {
      existingMap.set(`${row.country_iso}|${row.metric_key}|${row.period_start}`, {
        value: Number(row.value),
        source: row.source,
        period_start: row.period_start,
      });
      const seriesKey = `${row.country_iso}|${row.metric_key}`;
      const arr = seriesByKey.get(seriesKey) ?? [];
      arr.push({ period_start: row.period_start, value: Number(row.value) });
      seriesByKey.set(seriesKey, arr);
    }
  }
  // Sort each series by period.
  for (const arr of seriesByKey.values()) {
    arr.sort((a, b) => a.period_start.localeCompare(b.period_start));
  }

  // Diff + spike check.
  const toUpsert: ExtractedRow[] = [];
  const revisions: {
    country_iso: string; metric_key: string; period_start: string;
    old_value: number; new_value: number; old_source: string; new_source: string;
    ingest_run_id: number | undefined;
  }[] = [];

  for (const r of cleaned) {
    const key = `${r.country_iso}|${r.metric_key}|${r.period_start}`;
    const existing = existingMap.get(key);

    // Spike check against immediately preceding period of the same series,
    // but only when prior >0 (deficit/growth can legitimately flip sign).
    const series = seriesByKey.get(`${r.country_iso}|${r.metric_key}`) ?? [];
    const prior = lastBefore(series, r.period_start);
    if (prior && Math.abs(prior.value) > 1 && !r.is_forecast && !r.is_estimate) {
      const delta = Math.abs(r.value - prior.value) / Math.abs(prior.value);
      if (delta > VALIDATION_SPIKE_PCT) {
        outcome.rejected++;
        outcome.errors.push({
          message: `spike >${VALIDATION_SPIKE_PCT * 100}% rejected (${prior.value} → ${r.value})`,
          sample: { country: r.country_iso, metric: r.metric_key, period: r.period_start },
        });
        continue;
      }
    }

    if (!existing) {
      outcome.added++;
      toUpsert.push(r);
    } else if (Number(existing.value) === Number(r.value) && existing.source === r.source) {
      outcome.unchanged++;
    } else {
      outcome.updated++;
      toUpsert.push(r);
      revisions.push({
        country_iso: r.country_iso,
        metric_key: r.metric_key,
        period_start: r.period_start,
        old_value: existing.value,
        new_value: r.value,
        old_source: existing.source,
        new_source: r.source,
        ingest_run_id: ingestRunId,
      });
    }
  }

  // Chunked upsert.
  // Final safety dedupe in case any extractor concatenated sub-batches with overlapping keys.
  const dedupedMap = new Map<string, ExtractedRow>();
  for (const r of toUpsert) {
    dedupedMap.set(`${r.country_iso}|${r.metric_key}|${r.period_start}`, r);
  }
  const dedupedUpsert = [...dedupedMap.values()];

  const CHUNK = 500;
  for (let i = 0; i < dedupedUpsert.length; i += CHUNK) {
    const chunk = dedupedUpsert.slice(i, i + CHUNK);
    const { error } = await admin
      .from('economic_data_points')
      .upsert(chunk.map((r) => ({
        country_iso: r.country_iso,
        metric_key: r.metric_key,
        period_start: r.period_start,
        value: r.value,
        unit: r.unit,
        source: r.source,
        is_estimate: r.is_estimate ?? false,
        is_forecast: r.is_forecast ?? false,
        notes: r.notes ?? null,
        source_revision_date: r.source_revision_date ?? null,
      })), { onConflict: 'country_iso,metric_key,period_start' });
    if (error) {
      outcome.errors.push({ message: `upsert chunk ${i}: ${error.message}` });
    }
  }

  // Insert revisions (best-effort).
  if (revisions.length > 0) {
    for (let i = 0; i < revisions.length; i += CHUNK) {
      const chunk = revisions.slice(i, i + CHUNK);
      const { error } = await admin.from('data_revisions').insert(chunk);
      if (error) outcome.errors.push({ message: `insert revisions chunk ${i}: ${error.message}` });
    }
  }

  return outcome;
}

function lastBefore(series: { period_start: string; value: number }[], target: string): { period_start: string; value: number } | null {
  let candidate: { period_start: string; value: number } | null = null;
  for (const r of series) {
    if (r.period_start < target) candidate = r;
    else break;
  }
  return candidate;
}

function redact(r: ExtractedRow): Partial<ExtractedRow> {
  return {
    country_iso: r.country_iso,
    metric_key: r.metric_key,
    period_start: r.period_start,
    value: r.value,
    source: r.source,
  };
}
