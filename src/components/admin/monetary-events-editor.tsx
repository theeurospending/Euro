'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type MonetaryEvent = {
  id: number;
  event_date: string;
  category: string;
  title: string;
  description: string | null;
  impact_summary: string | null;
  related_metric_keys: string[];
  source_url: string | null;
  updated_at: string;
};

const CATEGORIES = ['rate_change', 'qe', 'crisis', 'milestone', 'treaty'] as const;

const EMPTY: Omit<MonetaryEvent, 'id' | 'updated_at'> = {
  event_date: new Date().toISOString().slice(0, 10),
  category: 'milestone',
  title: '',
  description: '',
  impact_summary: '',
  related_metric_keys: [],
  source_url: '',
};

export function MonetaryEventsEditor({ initial }: { initial: MonetaryEvent[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MonetaryEvent>>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...draft,
        related_metric_keys:
          typeof draft.related_metric_keys === 'string'
            ? (draft.related_metric_keys as string).split(',').map((s) => s.trim()).filter(Boolean)
            : (draft.related_metric_keys ?? []),
      };
      const res = await fetch(editingId ? `/api/admin/monetary-events/${editingId}` : '/api/admin/monetary-events', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDraft(EMPTY);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this event?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/monetary-events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(e: MonetaryEvent) {
    setEditingId(e.id);
    setDraft({ ...e });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY);
  }

  return (
    <div>
      <section className="mb-10 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-semibold">{editingId ? `Edit event #${editingId}` : 'New event'}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" value={draft.event_date ?? ''} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Category">
            <select value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inputClass}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Title" wide>
            <input type="text" value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Description" wide>
            <textarea value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} className={inputClass} />
          </Field>
          <Field label="Impact summary" wide>
            <textarea value={draft.impact_summary ?? ''} onChange={(e) => setDraft({ ...draft, impact_summary: e.target.value })} rows={2} className={inputClass} />
          </Field>
          <Field label="Related metric keys (comma-separated)" wide>
            <input
              type="text"
              value={Array.isArray(draft.related_metric_keys) ? draft.related_metric_keys.join(', ') : (draft.related_metric_keys ?? '')}
              onChange={(e) => setDraft({ ...draft, related_metric_keys: e.target.value as unknown as string[] })}
              className={inputClass}
              placeholder="ecb_main_refi_rate, bund_10y_yield"
            />
          </Field>
          <Field label="Source URL" wide>
            <input type="url" value={draft.source_url ?? ''} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} className={inputClass} />
          </Field>
        </div>

        {error && <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        <div className="mt-4 flex gap-2">
          <button onClick={save} disabled={busy || !draft.title || !draft.event_date}
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
            {busy ? 'Saving…' : editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Cancel
            </button>
          )}
        </div>
      </section>

      <h2 className="font-semibold">{initial.length} event{initial.length === 1 ? '' : 's'}</h2>
      <div className="mt-3 space-y-3">
        {initial.map((e) => (
          <article key={e.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-mono text-xs text-zinc-500">{e.event_date}</span>
                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{e.category}</span>
                <span className="ml-2 font-semibold">{e.title}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(e)} className="text-xs text-blue-700 hover:underline">Edit</button>
                <button onClick={() => remove(e.id)} className="text-xs text-red-700 hover:underline">Delete</button>
              </div>
            </div>
            {e.description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{e.description}</p>}
            {e.related_metric_keys?.length > 0 && (
              <div className="mt-2 text-xs text-zinc-500">↳ {e.related_metric_keys.join(', ')}</div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900';

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
