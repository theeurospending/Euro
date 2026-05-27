import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticleBySlug } from '@/lib/blog-data';
import { SiteHeader } from '@/components/layout/site-header';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return { title: 'Not found' };
  return {
    title: a.title,
    description: a.excerpt ?? undefined,
    openGraph: {
      title: a.title,
      description: a.excerpt ?? undefined,
      type: 'article',
      images: a.cover_image_url ? [{ url: a.cover_image_url }] : undefined,
      publishedTime: a.published_at ?? undefined,
      tags: a.tags,
    },
  };
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10 text-[var(--brand-navy)]">
        <Link href="/blog" className="font-mono text-xs text-[var(--brand-navy)]/60 hover:text-[var(--brand-navy)]">← Blog</Link>

        {a.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover_image_url} alt="" className="mt-6 w-full rounded-lg" />
        )}

        <header className="mt-8">
          <div className="font-mono text-xs text-[var(--brand-navy)]/60">{a.published_at?.slice(0, 10)}</div>
          <h1 className="font-display mt-2 text-4xl tracking-tight sm:text-5xl">{a.title}</h1>
          {a.excerpt && <p className="mt-4 text-lg text-[var(--brand-navy)]/80">{a.excerpt}</p>}
        </header>

        <article className="prose-on-paper mt-10 max-w-none text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: a.body_html }} />

        {a.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-[var(--brand-navy)]/15 pt-6">
            {a.tags.map((t) => (
              <Link key={t} href={`/blog/tag/${encodeURIComponent(t)}`} className="rounded-full border border-[var(--brand-navy)]/20 px-3 py-1 text-xs text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-navy)]/5">#{t}</Link>
            ))}
          </div>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.excerpt,
          datePublished: a.published_at,
          dateModified: a.updated_at,
          image: a.cover_image_url ?? undefined,
          keywords: a.tags.join(', '),
          publisher: { '@type': 'Organization', name: 'Eurospending' },
        }) }} />
      </main>
    </>
  );
}
