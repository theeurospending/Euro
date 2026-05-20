import type { MetadataRoute } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const BASE = 'https://eurospending.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createSupabaseAdminClient();
  const { data: countries } = await admin
    .from('countries')
    .select('slug, is_aggregate, is_eu_member, updated_at')
    .order('display_order');

  const now = new Date();
  const fixedRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,        lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/compare`, lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/euro`,    lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/blog`,    lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
  ];

  const countryRoutes: MetadataRoute.Sitemap = (countries ?? [])
    .filter((c) => !c.is_aggregate)
    .map((c) => ({
      url: `${BASE}/country/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: 'daily' as const,
      priority: c.is_eu_member ? 0.8 : 0.5,
    }));

  return [...fixedRoutes, ...countryRoutes];
}
