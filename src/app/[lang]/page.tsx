import Link from 'next/link';
import { loadHomepageData } from '@/lib/homepage-data';
import { EuropeMap } from '@/components/map/europe-map';
import { CountryTileGrid } from '@/components/map/country-tile-grid';
import { SiteHeader } from '@/components/layout/site-header';
import { NewsletterForm } from '@/components/layout/newsletter-form';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: 'Eurospending — Euro Economics',
    description: dict.home.hero_intro,
    openGraph: {
      title: 'Eurospending',
      description: dict.home.hero_title,
      type: 'website' as const,
    },
  };
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.home;
  const data = await loadHomepageData();
  const ez = data.euroSnapshot;

  return (
    <>
      <SiteHeader />
      <main className="text-[var(--brand-navy)]">
        {/* Hero */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
            <div className="kicker">{t.hero_kicker}</div>
            <h1 className="font-display mt-4 text-5xl leading-[0.95] tracking-tight text-[var(--brand-navy)] sm:text-6xl lg:text-7xl">
              {t.hero_title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--brand-navy)]/75">
              {t.hero_intro}
            </p>
          </div>
        </section>

        {/* Map */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="surface p-4 lg:p-6">
              <EuropeMap countries={data.countries} />
            </div>
          </div>
        </section>

        {/* Tile grid */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="kicker">{t.tiles_kicker}</div>
            <h2 className="font-display mt-3 text-3xl text-[var(--brand-navy)]">{t.tiles_title}</h2>
            <p className="mt-2 text-sm text-[var(--brand-navy)]/60">{t.tiles_intro}</p>
            <div className="mt-8">
              <CountryTileGrid countries={data.countries} />
            </div>
          </div>
        </section>

        {/* Euro snapshot */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="kicker">{t.euro_kicker}</div>
            <h2 className="font-display mt-3 text-3xl text-[var(--brand-navy)]">{t.euro_title}</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard label={t.metric_refi} value={ez.ecb_main_refi_rate ? `${ez.ecb_main_refi_rate.value.toFixed(2)}%` : '—'} sub={ez.ecb_main_refi_rate?.period_start} asOf={t.as_of} />
              <MetricCard label={t.metric_hicp} value={ez.eurozone_hicp_headline ? `${ez.eurozone_hicp_headline.value.toFixed(1)}%` : '—'} sub={ez.eurozone_hicp_headline?.period_start.slice(0, 7)} asOf={t.as_of} />
              <MetricCard label={t.metric_eurusd} value={ez.eur_usd_rate ? ez.eur_usd_rate.value.toFixed(4) : '—'} sub={ez.eur_usd_rate?.period_start} asOf={t.as_of} />
            </div>
            {ez.latestEvent && (
              <div className="surface mt-6 p-5">
                <div className="kicker">
                  <span className="font-mono">{ez.latestEvent.event_date}</span>
                  <span className="ml-3 text-[var(--brand-gold)]">{ez.latestEvent.category}</span>
                </div>
                <div className="mt-2 font-display text-xl">{ez.latestEvent.title}</div>
                {ez.latestEvent.description && <p className="mt-3 text-sm">{ez.latestEvent.description}</p>}
              </div>
            )}
          </div>
        </section>

        {/* Newsletter */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="kicker">{t.newsletter_kicker}</div>
                <h2 className="font-display mt-3 text-3xl text-[var(--brand-navy)]">{t.newsletter_title}</h2>
                <p className="mt-2 text-sm text-[var(--brand-navy)]/60">{t.newsletter_intro}</p>
              </div>
              <div className="lg:w-96">
                <NewsletterForm source="homepage" />
              </div>
            </div>
          </div>
        </section>

        {/* Nav cards */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NavCard href={`/${lang}/compare`} title={t.card_compare_title} hint={t.card_compare_hint} />
              <NavCard href={`/${lang}/euro`}    title={t.card_euro_title} hint={t.card_euro_hint} />
              <NavCard href={`/${lang}/data`}    title={t.card_data_title} hint={t.card_data_hint} />
              <NavCard href={`/${lang}/blog`}    title={t.card_blog_title} hint={t.card_blog_hint} />
            </div>
          </div>
        </section>

        <footer className="bg-[var(--brand-navy)] text-slate-300">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-8 font-mono text-xs">
            <div>{dict.footer.tagline}</div>
            <div>{dict.footer.data_credit}</div>
          </div>
        </footer>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Eurospending',
          url: 'https://eurospending.org',
          description: 'Public tracker of EU economic data and the story of the euro.',
        }) }} />
      </main>
    </>
  );
}

function MetricCard({ label, value, sub, asOf }: { label: string; value: string; sub?: string; asOf: string }) {
  return (
    <div className="surface p-5">
      <div className="kicker text-xs">{label}</div>
      <div className="font-display mt-2 text-4xl">{value}</div>
      {sub && <div className="mt-1 font-mono text-xs text-slate-400">{asOf} {sub}</div>}
    </div>
  );
}

function NavCard({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link href={href} className="surface group block p-5 transition-colors hover:border-[var(--brand-gold)]/40">
      <div className="font-display text-xl">{title} <span className="text-[var(--brand-gold)] transition-transform group-hover:translate-x-0.5">→</span></div>
      <div className="mt-2 text-sm text-slate-400">{hint}</div>
    </Link>
  );
}
