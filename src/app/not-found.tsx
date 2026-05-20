import Link from 'next/link';
import { BrandIcon } from '@/components/layout/brand-icon';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center text-slate-200">
      <BrandIcon size={72} />
      <div className="font-display mt-8 text-7xl tracking-tight text-white">404</div>
      <p className="mt-4 max-w-md text-lg text-slate-400">
        We don&apos;t have data for that. Try the home page, or browse all countries.
      </p>
      <div className="mt-10 flex gap-3">
        <Link href="/" className="rounded-md bg-[var(--brand-lav)] px-4 py-2 text-sm font-medium text-[var(--brand-navy)] hover:bg-white">Home</Link>
        <Link href="/blog" className="rounded-md border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">Blog</Link>
      </div>
    </main>
  );
}
