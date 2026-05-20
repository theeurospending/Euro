import type { MetadataRoute } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const BASE = 'https://eurospending.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createSupabaseAdminClient();
  const now = new Date();

  const [countriesRes, blogRes, tagsRes] = await Promise.all([
    admin.from('countries').select('slug, is_aggregate, is_eu_member, updated_at').order('display_order'),
    admin.from('blog_articles').select('slug, updated_at, published_at').eq('status', 'published'),
    admin.from('blog_articles').select('tags').eq('status', 'published'),
  ]);

  const fixedRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,        lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/compare`, lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/euro`,    lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/blog`,    lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
  ];

  const countryRoutes: MetadataRoute.Sitemap = (countriesRes.data ?? [])
    .filter((c) => !c.is_aggregate)
    .map((c) => ({
      url: `${BASE}/country/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: 'daily' as const,
      priority: c.is_eu_member ? 0.8 : 0.5,
    }));

  const blogRoutes: MetadataRoute.Sitemap = (blogRes.data ?? []).map((a) => ({
    url: `${BASE}/blog/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : (a.published_at ? new Date(a.published_at) : now),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const tagSet = new Set<string>();
  for (const row of tagsRes.data ?? []) {
    for (const t of row.tags ?? []) tagSet.add(t);
  }
  const tagRoutes: MetadataRoute.Sitemap = [...tagSet].map((t) => ({
    url: `${BASE}/blog/tag/${encodeURIComponent(t)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  return [...fixedRoutes, ...countryRoutes, ...blogRoutes, ...tagRoutes];
}
