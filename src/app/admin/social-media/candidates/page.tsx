import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { CandidatesTable } from '@/components/admin/social-candidates-table';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = status ?? 'new';
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('social_media_candidates')
    .select('*')
    .eq('status', filter)
    .order('priority_score', { ascending: false })
    .order('detected_at', { ascending: false })
    .limit(200);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social candidates</h1>
          <p className="mt-1 text-sm text-zinc-500">Auto-detected facts. Promote to generate a draft.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/social-media/drafts" className="text-sm text-blue-700 hover:underline">Drafts →</Link>
          <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2 text-xs">
        {(['new', 'promoted', 'dismissed'] as const).map((s) => (
          <Link key={s} href={`/admin/social-media/candidates?status=${s}`}
                className={`rounded-full px-3 py-1 ${filter === s ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border border-zinc-300 dark:border-zinc-700'}`}>
            {s}
          </Link>
        ))}
      </div>

      <CandidatesTable candidates={data ?? []} />
    </main>
  );
}
