import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticleBySlug } from '@/lib/blog-data';

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
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/blog" className="text-sm text-zinc-500 underline">← Blog</Link>

      {a.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.cover_image_url} alt="" className="mt-6 w-full rounded-lg" />
      )}

      <header className="mt-6">
        <div className="text-xs text-zinc-500">{a.published_at?.slice(0, 10)}</div>
        <h1 className="mt-1 text-4xl font-bold tracking-tight">{a.title}</h1>
        {a.excerpt && <p className="mt-3 text-lg text-zinc-700 dark:text-zinc-300">{a.excerpt}</p>}
      </header>

      <article className="prose prose-zinc mt-8 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: a.body_html }} />

      {a.tags.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          {a.tags.map((t) => (
            <Link key={t} href={`/blog/tag/${encodeURIComponent(t)}`} className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">#{t}</Link>
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
  );
}
