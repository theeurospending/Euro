import Link from 'next/link';
import { headers } from 'next/headers';
import { Logo } from './logo';
import { LanguagePicker } from './language-picker';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';

export async function SiteHeader() {
  const lang = (await headers()).get('x-locale') || DEFAULT_LOCALE;
  const dict = await getDictionary(lang);

  const nav = [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/compare`, label: dict.nav.compare },
    { href: `/${lang}/euro`, label: dict.nav.euro },
    { href: `/${lang}/data`, label: dict.nav.data },
    { href: `/${lang}/blog`, label: dict.nav.blog },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--brand-navy)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--brand-navy)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href={`/${lang}`} aria-label="Eurospending home" className="block">
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
          <LanguagePicker current={lang} label={dict.language.select} />
        </nav>
      </div>
    </header>
  );
}
