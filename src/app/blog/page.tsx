import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublishedArticles, listAllTags } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Analysis and commentary on EU economic data and the euro.',
};

export default async function BlogIndex() {
  const [articles, tags] = await Promise.all([listPublishedArticles(), listAllTags()]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <a href="/" className="text-sm text-zinc-500 underline">← Home</a>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Blog</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Analysis and commentary.</p>

      {tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link key={t.tag} href={`/blog/tag/${encodeURIComponent(t.tag)}`} className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              #{t.tag} <span className="text-zinc-400">{t.count}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10 space-y-8">
        {articles.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
            No articles published yet.
          </div>
        ) : articles.map((a) => (
          <article key={a.id}>
            <div className="text-xs text-zinc-500">{a.published_at?.slice(0, 10)}</div>
            <h2 className="mt-1 text-2xl font-semibold">
              <Link href={`/blog/${a.slug}`} className="hover:underline">{a.title}</Link>
            </h2>
            {a.excerpt && <p className="mt-2 text-zinc-700 dark:text-zinc-300">{a.excerpt}</p>}
            {a.tags.length > 0 && (
              <div className="mt-2 text-xs text-zinc-500">{a.tags.map((t) => `#${t}`).join(' ')}</div>
            )}
          </article>
        ))}
      </div>

      <div className="mt-12 text-xs">
        <a href="/blog/feed.xml" className="text-zinc-500 hover:underline">RSS feed</a>
      </div>
    </main>
  );
}
