import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SeoOverridesEditor } from '@/components/admin/seo-overrides-editor';

export const dynamic = 'force-dynamic';

export default async function AdminSeo() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('seo_overrides').select('*').order('path');
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">SEO overrides</h1>
        <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        Per-path title / description / OG image overrides. Take precedence over the page&apos;s defaults.
        Example paths: <code className="font-mono text-xs">/</code>, <code className="font-mono text-xs">/country/germany</code>, <code className="font-mono text-xs">/euro</code>.
      </p>
      <SeoOverridesEditor initial={data ?? []} />
    </main>
  );
}
