import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Post = {
  id: number;
  draft_id: number | null;
  country_iso: string | null;
  caption: string;
  image_url: string | null;
  platforms: string[];
  posted_at: string;
  platform_statuses: Record<string, string>;
  error_message: string | null;
};

export default async function PostsPage() {
  const admin = createSupabaseAdminClient();
  const { data, count } = await admin
    .from('social_media_posts')
    .select('*', { count: 'exact' })
    .order('posted_at', { ascending: false })
    .limit(50);
  const posts = (data ?? []) as Post[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social posts</h1>
          <p className="mt-1 text-sm text-zinc-500">{count ?? 0} posts — newest first.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/social-media/drafts" className="text-sm text-blue-700 hover:underline">← Drafts</Link>
          <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
          No posts yet. Drafts that succeed at publish land here.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <article key={p.id} className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[120px_1fr]">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="aspect-square w-full max-w-[120px] rounded object-cover" />
              ) : (
                <div className="flex aspect-square w-full max-w-[120px] items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">no image</div>
              )}
              <div>
                <div className="text-xs text-zinc-500">
                  <span className="font-mono">#{p.id}</span> · {p.country_iso ?? 'EZ-wide'} · {new Date(p.posted_at).toLocaleString()}
                </div>
                <p className="mt-1 line-clamp-3 text-sm">{p.caption}</p>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  {Object.entries(p.platform_statuses).map(([plat, status]) => (
                    <span key={plat} className={`rounded px-2 py-0.5 ${status === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'}`}>
                      {plat}: {status}
                    </span>
                  ))}
                </div>
                {p.error_message && <div className="mt-1 text-xs text-red-700">{p.error_message}</div>}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
