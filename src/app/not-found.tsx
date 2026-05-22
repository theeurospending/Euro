import Link from 'next/link';
import { BrandIcon } from '@/components/layout/brand-icon';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center text-[var(--brand-navy)]">
      <BrandIcon size={72} />
      <div className="font-display mt-8 text-7xl tracking-tight">404</div>
      <p className="mt-4 max-w-md text-lg text-[var(--brand-navy)]/70">
        We don&apos;t have data for that. Try the home page, or browse all countries.
      </p>
      <div className="mt-10 flex gap-3">
        <Link href="/" className="rounded-md bg-[var(--brand-navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-navy-deep)]">Home</Link>
        <Link href="/blog" className="rounded-md border border-[var(--brand-navy)]/20 px-4 py-2 text-sm text-[var(--brand-navy)] hover:bg-[var(--brand-navy)]/5">Blog</Link>
      </div>
    </main>
  );
}
