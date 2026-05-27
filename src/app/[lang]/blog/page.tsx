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

  const has = (a: (typeof articles)[number], tag: string) => a.tags.includes(tag);
  const startHere = articles.find((a) => has(a, 'start-here'));
  const guides = articles.filter((a) => has(a, 'guide') && !has(a, 'start-here'));
  const explainers = articles.filter((a) => has(a, 'explainer'));
  const analysis = articles.filter((a) => has(a, 'analysis'));
  const grouped = new Set([
    ...(startHere ? [startHere.id] : []),
    ...guides.map((a) => a.id),
    ...explainers.map((a) => a.id),
    ...analysis.map((a) => a.id),
  ]);
  const other = articles.filter((a) => !grouped.has(a.id));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10 text-[var(--brand-navy)]">
        <div className="kicker">Guides · explainers · analysis</div>
        <h1 className="font-display mt-3 text-5xl tracking-tight">Blog</h1>
        <p className="mt-4 max-w-2xl text-[var(--brand-navy)]/80">
          Plain-English explainers for every metric on the site, guides to navigating the data, and evidence-led analysis.
          New here? Start with the tour below.
        </p>

        {startHere && (
          <Link
            href={`/blog/${startHere.slug}`}
            className="mt-8 block rounded-lg border border-[var(--brand-navy)]/20 bg-[var(--brand-navy)]/[0.03] p-5 transition-colors hover:border-[var(--brand-gold)]/50"
          >
            <div className="kicker text-[10px]">Start here</div>
            <div className="font-display mt-1 text-2xl">{startHere.title}</div>
            {startHere.excerpt && <p className="mt-1 text-sm text-[var(--brand-navy)]/75">{startHere.excerpt}</p>}
          </Link>
        )}

        {tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t.tag}
                href={`/blog/tag/${encodeURIComponent(t.tag)}`}
                className="rounded-full border border-[var(--brand-navy)]/20 px-3 py-1 text-xs text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-navy)]/5"
              >
                #{t.tag} <span className="text-[var(--brand-navy)]/50">{t.count}</span>
              </Link>
            ))}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-[var(--brand-navy)]/20 p-10 text-center text-sm text-[var(--brand-navy)]/55">
            No articles published yet.
          </div>
        ) : (
          <>
            <ArticleSection title="Guides" subtitle="How to read the site and the numbers" articles={guides} />
            <ArticleSection title="Metric explainers" subtitle="What each number means, in plain English" articles={explainers} />
            <ArticleSection title="Analysis" subtitle="Evidence-led commentary" articles={analysis} />
            {other.length > 0 && <ArticleSection title="More" articles={other} />}
          </>
        )}

        <div className="mt-16 text-xs">
          <a href="/blog/feed.xml" className="font-mono text-[var(--brand-navy)]/60 hover:text-[var(--brand-navy)] underline">RSS feed →</a>
        </div>
      </main>
    </>
  );
}

function ArticleSection({ title, subtitle, articles }: { title: string; subtitle?: string; articles: { id: number; slug: string; title: string; excerpt: string | null; published_at: string | null }[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--brand-navy)]/55">{subtitle}</p>}
      <div className="mt-5 space-y-6">
        {articles.map((a) => (
          <article key={a.id}>
            <h3 className="font-display text-xl">
              <Link href={`/blog/${a.slug}`} className="hover:text-[var(--brand-navy)]/70">{a.title}</Link>
            </h3>
            {a.excerpt && <p className="mt-1 text-sm text-[var(--brand-navy)]/80">{a.excerpt}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
