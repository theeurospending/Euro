// Admin pages: branded paper layout with the Eurospending logo + nav.
// Public pages stay on the navy bg; admin uses paper for control contrast.

import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/data-sources', label: 'Data' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/countries', label: 'Countries' },
  { href: '/admin/monetary-events', label: 'Events' },
  { href: '/admin/social-media/drafts', label: 'Social' },
  { href: '/admin/seo', label: 'SEO' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-paper)] text-[var(--brand-navy)]">
      <header className="sticky top-0 z-20 border-b border-[var(--brand-navy)]/10 bg-[var(--brand-paper)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--brand-paper)]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <Link href="/admin" aria-label="Eurospending admin">
            <Logo variant="navy" size="sm" />
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-xs">
            {ADMIN_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded px-2.5 py-1.5 font-medium text-[var(--brand-navy)]/70 transition-colors hover:bg-[var(--brand-navy)]/10 hover:text-[var(--brand-navy)]"
              >
                {n.label}
              </Link>
            ))}
            <form action="/api/auth/signout" method="POST" className="ml-2 inline">
              <button className="rounded px-2.5 py-1.5 text-xs text-[var(--brand-navy)]/60 hover:text-[var(--brand-navy)]">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
