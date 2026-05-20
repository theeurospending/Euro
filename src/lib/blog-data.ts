import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type BlogArticle = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string;
  cover_image_url: string | null;
  tags: string[];
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string | null;
  published_at: string | null;
  seo_meta: Record<string, string>;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export async function listPublishedArticles(opts?: { tag?: string; limit?: number }): Promise<BlogArticle[]> {
  const admin = createSupabaseAdminClient();
  let q = admin.from('blog_articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (opts?.tag) q = q.contains('tags', [opts.tag]);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []) as BlogArticle[];
}

export async function getArticleBySlug(slug: string, opts?: { includeDraft?: boolean }): Promise<BlogArticle | null> {
  const admin = createSupabaseAdminClient();
  const q = admin.from('blog_articles').select('*').eq('slug', slug);
  if (!opts?.includeDraft) q.eq('status', 'published');
  const { data } = await q.maybeSingle();
  return (data as BlogArticle | null) ?? null;
}

export async function listAllArticlesAdmin(): Promise<BlogArticle[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('blog_articles')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as BlogArticle[];
}

export async function listAllTags(): Promise<{ tag: string; count: number }[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('blog_articles')
    .select('tags')
    .eq('status', 'published');
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const t of row.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}
