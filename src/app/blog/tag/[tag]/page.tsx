import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublishedArticles } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)} · Blog` };
}

export default async function BlogTag({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const articles = await listPublishedArticles({ tag: decoded });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/blog" className="text-sm text-zinc-500 underline">← Blog</Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">#{decoded}</h1>
      <p className="mt-2 text-sm text-zinc-500">{articles.length} article{articles.length === 1 ? '' : 's'}</p>

      <div className="mt-10 space-y-8">
        {articles.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">No articles tagged #{decoded}.</div>
        ) : articles.map((a) => (
          <article key={a.id}>
            <div className="text-xs text-zinc-500">{a.published_at?.slice(0, 10)}</div>
            <h2 className="mt-1 text-2xl font-semibold"><Link href={`/blog/${a.slug}`} className="hover:underline">{a.title}</Link></h2>
            {a.excerpt && <p className="mt-2 text-zinc-700 dark:text-zinc-300">{a.excerpt}</p>}
          </article>
        ))}
      </div>
    </main>
  );
}
