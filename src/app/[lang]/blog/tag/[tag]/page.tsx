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
      <main className="mx-auto max-w-3xl px-6 py-10 text-[var(--brand-navy)]">
        <Link href="/blog" className="font-mono text-xs text-[var(--brand-navy)]/60 hover:text-[var(--brand-navy)]">← Blog</Link>
        <h1 className="font-display mt-4 text-4xl tracking-tight sm:text-5xl">#{decoded}</h1>
        <p className="mt-2 font-mono text-xs text-[var(--brand-navy)]/60">{articles.length} article{articles.length === 1 ? '' : 's'}</p>

        <div className="mt-10 space-y-10">
          {articles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--brand-navy)]/20 p-10 text-center text-sm text-[var(--brand-navy)]/55">No articles tagged #{decoded}.</div>
          ) : articles.map((a) => (
            <article key={a.id}>
              <div className="font-mono text-xs text-[var(--brand-navy)]/60">{a.published_at?.slice(0, 10)}</div>
              <h2 className="font-display mt-2 text-2xl"><Link href={`/blog/${a.slug}`} className="hover:text-[var(--brand-navy)]/70">{a.title}</Link></h2>
              {a.excerpt && <p className="mt-2 text-[var(--brand-navy)]/80">{a.excerpt}</p>}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
