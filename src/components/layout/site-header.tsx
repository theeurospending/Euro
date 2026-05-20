import Link from 'next/link';
import { Logo } from './logo';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/compare', label: 'Compare' },
  { href: '/euro', label: 'The euro' },
  { href: '/blog', label: 'Blog' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--brand-navy)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--brand-navy)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" aria-label="Eurospending home" className="block">
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
