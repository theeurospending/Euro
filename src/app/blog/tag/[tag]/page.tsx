import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublishedArticles } from '@/lib/blog-data';
import { SiteHeader } from '@/components/layout/site-header';

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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10 text-slate-100">
        <Link href="/blog" className="font-mono text-xs text-slate-400 hover:text-[var(--brand-lav)]">← Blog</Link>
        <h1 className="font-display mt-4 text-4xl tracking-tight text-white sm:text-5xl">#{decoded}</h1>
        <p className="mt-2 font-mono text-xs text-slate-400">{articles.length} article{articles.length === 1 ? '' : 's'}</p>

        <div className="mt-10 space-y-10">
          {articles.length === 0 ? (
            <div className="surface p-10 text-center text-sm text-slate-400">No articles tagged #{decoded}.</div>
          ) : articles.map((a) => (
            <article key={a.id}>
              <div className="font-mono text-xs text-slate-400">{a.published_at?.slice(0, 10)}</div>
              <h2 className="font-display mt-2 text-2xl text-white"><Link href={`/blog/${a.slug}`} className="hover:text-[var(--brand-lav)]">{a.title}</Link></h2>
              {a.excerpt && <p className="mt-2 text-slate-300">{a.excerpt}</p>}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
