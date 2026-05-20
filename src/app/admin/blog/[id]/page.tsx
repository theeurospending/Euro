import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { BlogArticleEditor } from '@/components/admin/blog-article-editor';

export const dynamic = 'force-dynamic';

export default async function AdminBlogEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('blog_articles').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit article</h1>
        <Link href="/admin/blog" className="text-sm text-zinc-500 underline">← All articles</Link>
      </div>
      <BlogArticleEditor
        initial={{
          id: data.id,
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt ?? '',
          body_html: data.body_html ?? '',
          cover_image_url: data.cover_image_url ?? '',
          tags: data.tags ?? [],
          status: data.status,
          scheduled_at: data.scheduled_at ?? '',
        }}
      />
    </main>
  );
}
