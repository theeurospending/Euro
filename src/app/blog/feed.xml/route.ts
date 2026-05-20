import { listPublishedArticles } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';

const BASE = 'https://eurospending.org';

export async function GET() {
  const articles = await listPublishedArticles({ limit: 50 });

  const items = articles.map((a) => `
    <item>
      <title>${escape(a.title)}</title>
      <link>${BASE}/blog/${a.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${a.slug}</guid>
      <description>${escape(a.excerpt ?? '')}</description>
      <pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : ''}</pubDate>
      ${a.tags.map((t) => `<category>${escape(t)}</category>`).join('')}
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Eurospending — Blog</title>
    <link>${BASE}/blog</link>
    <description>Analysis and commentary on EU economic data and the euro.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${BASE}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
