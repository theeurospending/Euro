import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: profile } = await supabase
    .from('users')
    .select('email, full_name, is_admin, is_superadmin')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Signed in as <span className="font-mono">{profile?.email ?? user.email}</span>
        {profile?.is_superadmin && ' · superadmin'}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card title="Data sources" href="/admin/data-sources" hint="Trigger ingestion, view per-source status" />
        <Card title="Ingest log" href="/admin/ingest-log" hint="History of every ingest run" />
        <Card title="Monetary events" href="/admin/monetary-events" hint="ECB rate changes, milestones, crises" />
        <Card title="Countries" href="/admin/countries" hint="Edit per-country narrative (Tiptap)" />
        <Card title="Blog" href="/admin/blog" hint="Tiptap CRUD + scheduled publish" />
        <Card title="Social candidates" href="/admin/social-media/candidates" hint="Auto-detected facts; promote to drafts" />
        <Card title="Social drafts" href="/admin/social-media/drafts" hint="Edit captions, schedule" />
        <Card title="Quick draft" href="/admin/social-media/quick-draft" hint="One-off reactive post (country + metric)" />
        <Card title="Social posts" href="/admin/social-media/posts" hint="Publish history per platform" />
        <Card title="Social settings" href="/admin/social-media/settings" hint="Make.com webhook + defaults" />
      </div>

      <form action="/api/auth/signout" method="POST" className="mt-12">
        <button className="text-sm text-zinc-500 underline">Sign out</button>
      </form>
    </main>
  );
}

function Card({ title, href, hint }: { title: string; href: string; hint: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </a>
  );
}
