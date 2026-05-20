import Link from 'next/link';
import { listAllArticlesAdmin } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';

export default async function AdminBlog() {
  const articles = await listAllArticlesAdmin();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="mt-1 text-sm text-zinc-500">{articles.length} article{articles.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
          <Link href="/admin/blog/new" className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">+ New article</Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-zinc-400">No articles yet. <Link href="/admin/blog/new" className="underline">Create one →</Link></td></tr>
            ) : articles.map((a) => (
              <tr key={a.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">{a.title || <span className="italic text-zinc-400">untitled</span>}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.slug}</td>
                <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                <td className="px-3 py-2 text-xs text-zinc-500">{a.tags.join(', ') || '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {a.status === 'published' && a.published_at ? `pub'd ${a.published_at.slice(0, 10)}`
                    : a.status === 'scheduled' && a.scheduled_at ? `sched ${a.scheduled_at.slice(0, 16).replace('T', ' ')}`
                    : `draft ${a.updated_at.slice(0, 10)}`}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/blog/${a.id}`} className="text-xs text-blue-700 hover:underline">Edit →</Link>
                  {a.status === 'published' && (
                    <Link href={`/blog/${a.slug}`} target="_blank" className="ml-3 text-xs text-zinc-500 hover:underline">View</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    scheduled:  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    published:  'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  };
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${styles[status] ?? styles.draft}`}>{status}</span>;
}
