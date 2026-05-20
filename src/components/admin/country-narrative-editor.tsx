'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const TiptapEditor = dynamic(
  () => import('./tiptap-editor').then((m) => m.TiptapEditor),
  { ssr: false, loading: () => <div className="min-h-[120px] rounded border border-zinc-300 p-3 text-sm text-zinc-400">Loading editor…</div> },
);

type NarrativeFields = {
  intro_html: string;
  fiscal_context_html: string;
  macro_context_html: string;
  current_situation_html: string;
};

export function CountryNarrativeEditor({ countryIso, initial }: { countryIso: string; initial: NarrativeFields }) {
  const router = useRouter();
  const [draft, setDraft] = useState<NarrativeFields>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/country-narratives/${countryIso}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Field label="Intro" hint="Top of the country page, above the fiscal trajectory section.">
        <TiptapEditor value={draft.intro_html} onChange={(v) => setDraft({ ...draft, intro_html: v })} placeholder="One paragraph orienting the reader to this country's story…" />
      </Field>
      <Field label="Fiscal context" hint="Below the spending/debt section.">
        <TiptapEditor value={draft.fiscal_context_html} onChange={(v) => setDraft({ ...draft, fiscal_context_html: v })} placeholder="Why does this country's fiscal trajectory look the way it does?" />
      </Field>
      <Field label="Macro context" hint="Growth, inflation, unemployment.">
        <TiptapEditor value={draft.macro_context_html} onChange={(v) => setDraft({ ...draft, macro_context_html: v })} placeholder="Key shocks and structural features driving the macro outcomes." />
      </Field>
      <Field label="Current situation" hint="Bottom of page — most recent year or two.">
        <TiptapEditor value={draft.current_situation_html} onChange={(v) => setDraft({ ...draft, current_situation_html: v })} placeholder="What's happening right now (politics, ECB stance, key risks)." />
      </Field>

      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
          {busy ? 'Saving…' : 'Save narrative'}
        </button>
        {savedAt && <span className="text-xs text-zinc-500">Saved at {savedAt}</span>}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
