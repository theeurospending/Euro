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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="kicker text-[var(--brand-navy)]/60">Admin</div>
      <h1 className="font-display mt-3 text-4xl tracking-tight text-[var(--brand-navy)]">Dashboard</h1>
      <p className="mt-2 text-sm text-[var(--brand-navy)]/60">
        Signed in as <span className="font-mono text-[var(--brand-navy)]">{profile?.email ?? user.email}</span>
        {profile?.is_superadmin && <> · <span className="font-mono">superadmin</span></>}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <Card title="SEO overrides" href="/admin/seo" hint="Per-path title / description / OG image" />
        <Card title="Validation comparison" href="/admin/validation-comparison" hint="Eurostat vs OECD disagreements" />
      </div>
    </main>
  );
}

function Card({ title, href, hint }: { title: string; href: string; hint: string }) {
  return (
    <a
      href={href}
      className="group block rounded-lg border border-[var(--brand-navy)]/10 bg-white p-4 transition-colors hover:border-[var(--brand-navy)]/30 hover:shadow-sm"
    >
      <div className="font-display text-base text-[var(--brand-navy)]">
        {title} <span className="text-[var(--brand-gold)] opacity-0 transition-opacity group-hover:opacity-100">→</span>
      </div>
      <div className="mt-1 text-xs text-[var(--brand-navy)]/60">{hint}</div>
    </a>
  );
}
