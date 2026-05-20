'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = { path: string; title: string | null; description: string | null; og_image_url: string | null };

export function SeoOverridesEditor({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empty: Row = { path: '', title: '', description: '', og_image_url: '' };
  const draft = editing ?? empty;

  async function save() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: draft.path,
          title: draft.title || null,
          description: draft.description || null,
          og_image_url: draft.og_image_url || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function remove(path: string) {
    if (!confirm(`Remove SEO override for ${path}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/seo?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">{editing ? `Edit ${editing.path}` : 'New override'}</h2>
        <div className="mt-3 space-y-3">
          <Field label="Path"><input value={draft.path} onChange={(e) => setEditing({ ...draft, path: e.target.value })} className={inputClass} placeholder="/, /country/germany, /euro" /></Field>
          <Field label="Title"><input value={draft.title ?? ''} onChange={(e) => setEditing({ ...draft, title: e.target.value })} className={inputClass} /></Field>
          <Field label="Description"><textarea rows={2} value={draft.description ?? ''} onChange={(e) => setEditing({ ...draft, description: e.target.value })} className={inputClass} /></Field>
          <Field label="OG image URL"><input value={draft.og_image_url ?? ''} onChange={(e) => setEditing({ ...draft, og_image_url: e.target.value })} className={inputClass} /></Field>
        </div>
        {error && <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={busy || !draft.path} className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">{busy ? '…' : editing ? 'Update' : 'Create'}</button>
          {editing && <button onClick={() => setEditing(null)} className="text-xs text-zinc-500 hover:underline">Cancel</button>}
        </div>
      </section>

      <h2 className="text-sm font-semibold">{initial.length} override{initial.length === 1 ? '' : 's'}</h2>
      <div className="space-y-2">
        {initial.map((r) => (
          <article key={r.path} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <code className="font-mono text-xs">{r.path}</code>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditing(r)} className="text-blue-700 hover:underline">Edit</button>
                <button onClick={() => remove(r.path)} className="text-red-700 hover:underline">Delete</button>
              </div>
            </div>
            {r.title && <div className="mt-1 text-sm font-semibold">{r.title}</div>}
            {r.description && <div className="text-xs text-zinc-500">{r.description}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span><div className="mt-1">{children}</div></label>;
}
