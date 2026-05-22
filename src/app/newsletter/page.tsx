import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { NewsletterForm } from '@/components/layout/newsletter-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'Weekly digest of EU economic data and the most notable moves of the week.',
};

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ confirmed?: string; email?: string; error?: string; unsubscribed?: string }> }) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 text-slate-100">
        <div className="kicker">Weekly · Monday morning</div>
        <h1 className="font-display mt-3 text-5xl tracking-tight text-white">Newsletter</h1>
        <p className="mt-4 text-lg text-slate-300">
          A weekly email with the biggest movements in EU public finance plus any new analysis.
          One email per week. No tracking pixels. Unsubscribe from any email.
        </p>

        {params.confirmed && (
          <div className="surface mt-8 border-l-4 border-l-[var(--brand-gold)] p-4">
            <div className="font-display text-lg text-white">You&apos;re in.</div>
            <p className="mt-1 text-sm text-slate-300">
              {params.email && <>Confirmed <code className="font-mono text-[var(--brand-lav)]">{params.email}</code>. </>}
              You&apos;ll get the first digest on the next Monday at 09:00 UTC.
            </p>
          </div>
        )}

        {params.unsubscribed && (
          <div className="surface mt-8 border-l-4 border-l-slate-500 p-4">
            <div className="font-display text-lg text-white">Unsubscribed.</div>
            <p className="mt-1 text-sm text-slate-300">You won&apos;t get any more emails. Sorry to see you go.</p>
          </div>
        )}

        {params.error && (
          <div className="surface mt-8 border-l-4 border-l-rose-500 p-4">
            <div className="font-display text-lg text-white">Problem</div>
            <p className="mt-1 text-sm text-slate-300">{decodeURIComponent(params.error)}</p>
          </div>
        )}

        {!params.confirmed && !params.unsubscribed && (
          <div className="surface mt-10 p-6">
            <NewsletterForm />
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Confirmation email · double opt-in · stored in EU (Supabase Frankfurt)
            </p>
          </div>
        )}

        <h2 className="font-display mt-16 text-2xl text-white">What you&apos;ll get</h2>
        <ul className="mt-4 space-y-3 text-slate-300">
          <li><span className="mr-2 text-[var(--brand-gold)]">→</span> Top 3-5 EU economic moves of the week, with the underlying numbers.</li>
          <li><span className="mr-2 text-[var(--brand-gold)]">→</span> Any new analysis from the blog.</li>
          <li><span className="mr-2 text-[var(--brand-gold)]">→</span> Notable monetary events (rate decisions, treaty milestones, etc.) on their anniversary.</li>
          <li><span className="mr-2 text-[var(--brand-gold)]">→</span> Plain text + light HTML — no images, no tracking pixels.</li>
        </ul>
      </main>
    </>
  );
}
