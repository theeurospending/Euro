'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const TiptapBlogEditor = dynamic(
  () => import('./tiptap-blog-editor').then((m) => m.TiptapBlogEditor),
  { ssr: false, loading: () => <div className="min-h-[300px] rounded border border-zinc-300 p-3 text-sm text-zinc-400">Loading editor…</div> },
);

export type BlogDraft = {
  id: number | null;
  slug: string;
  title: string;
  excerpt: string;
  body_html: string;
  cover_image_url: string;
  tags: string[];
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string;
};

export function BlogArticleEditor({ initial }: { initial: BlogDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BlogDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(targetStatus?: BlogDraft['status']) {
    setBusy(true); setError(null);
    try {
      const payload = {
        ...draft,
        status: targetStatus ?? draft.status,
        scheduled_at: (targetStatus ?? draft.status) === 'scheduled' ? draft.scheduled_at : null,
      };
      const res = await fetch(draft.id ? `/api/admin/blog/${draft.id}` : '/api/admin/blog', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (!draft.id && json.id) {
        router.push(`/admin/blog/${json.id}`);
      } else {
        setDraft({ ...draft, status: payload.status as BlogDraft['status'], scheduled_at: payload.scheduled_at ?? '' });
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!draft.id) return;
    if (!confirm(`Delete "${draft.title || draft.slug}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/blog/${draft.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      router.push('/admin/blog');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: draft.slug || slugify(e.target.value) })}
          className={inputClass}
          placeholder="The article title"
        />
      </Field>

      <Field label="Slug">
        <input type="text" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className={`${inputClass} font-mono`} placeholder="url-friendly-slug" />
      </Field>

      <Field label="Excerpt" hint="One-paragraph summary used on listing pages + OG.">
        <textarea rows={3} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} className={inputClass} />
      </Field>

      <Field label="Cover image URL" hint="Optional. Used as OG image and listing thumbnail.">
        <input type="url" value={draft.cover_image_url} onChange={(e) => setDraft({ ...draft, cover_image_url: e.target.value })} className={inputClass} />
      </Field>

      <Field label="Tags (comma-separated)">
        <input type="text" value={draft.tags.join(', ')} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} className={inputClass} placeholder="ecb, fiscal, italy" />
      </Field>

      <Field label="Body">
        <TiptapBlogEditor value={draft.body_html} onChange={(v) => setDraft({ ...draft, body_html: v })} />
      </Field>

      <div className="flex flex-wrap items-end gap-3 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Current status: <strong>{draft.status}</strong></span>
        <Field label="Schedule at" hint="Required for status = scheduled" wide={false}>
          <input
            type="datetime-local"
            value={draft.scheduled_at?.slice(0, 16) ?? ''}
            onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => save('draft')}      disabled={busy || !draft.title || !draft.slug} className={btnSecondary}>Save draft</button>
        <button onClick={() => save('scheduled')}  disabled={busy || !draft.scheduled_at || !draft.title} className={btnSecondary}>Schedule</button>
        <button onClick={() => save('published')}  disabled={busy || !draft.title || !draft.slug} className={btnPrimary}>{busy ? 'Saving…' : 'Publish now'}</button>
        {draft.id && <button onClick={remove} disabled={busy} className="ml-auto text-xs text-red-700 hover:underline">Delete</button>}
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const inputClass =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900';
const btnPrimary =
  'rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900';
const btnSecondary =
  'rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800';

function Field({ label, children, hint, wide }: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={`block ${wide ?? true ? 'w-full' : ''}`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
