import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublishedArticles, listAllTags } from '@/lib/blog-data';
import { SiteHeader } from '@/components/layout/site-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Analysis and commentary on EU economic data and the euro.',
};

export default async function BlogIndex() {
  const [articles, tags] = await Promise.all([listPublishedArticles(), listAllTags()]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10 text-slate-100">
        <div className="kicker">Analysis · commentary</div>
        <h1 className="font-display mt-3 text-5xl tracking-tight text-white">Blog</h1>

        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t.tag}
                href={`/blog/tag/${encodeURIComponent(t.tag)}`}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-white/5"
              >
                #{t.tag} <span className="text-slate-500">{t.count}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 space-y-10">
          {articles.length === 0 ? (
            <div className="surface p-10 text-center text-sm text-slate-400">
              No articles published yet.
            </div>
          ) : articles.map((a) => (
            <article key={a.id}>
              <div className="font-mono text-xs text-slate-400">{a.published_at?.slice(0, 10)}</div>
              <h2 className="font-display mt-2 text-2xl text-white">
                <Link href={`/blog/${a.slug}`} className="hover:text-[var(--brand-lav)]">{a.title}</Link>
              </h2>
              {a.excerpt && <p className="mt-2 text-slate-300">{a.excerpt}</p>}
              {a.tags.length > 0 && (
                <div className="mt-2 font-mono text-xs text-slate-500">{a.tags.map((t) => `#${t}`).join(' ')}</div>
              )}
            </article>
          ))}
        </div>

        <div className="mt-16 text-xs">
          <a href="/blog/feed.xml" className="font-mono text-slate-400 hover:text-[var(--brand-lav)]">RSS feed →</a>
        </div>
      </main>
    </>
  );
}
