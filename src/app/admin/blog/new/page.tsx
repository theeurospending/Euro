import Link from 'next/link';
import { BlogArticleEditor } from '@/components/admin/blog-article-editor';

export const dynamic = 'force-dynamic';

export default function AdminBlogNew() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">New article</h1>
        <Link href="/admin/blog" className="text-sm text-zinc-500 underline">← All articles</Link>
      </div>
      <BlogArticleEditor
        initial={{
          id: null,
          slug: '',
          title: '',
          excerpt: '',
          body_html: '',
          cover_image_url: '',
          tags: [],
          status: 'draft',
          scheduled_at: '',
        }}
      />
    </main>
  );
}
