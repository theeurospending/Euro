'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { BrandIcon } from '@/components/layout/brand-icon';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('app error:', error.message, error.digest);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center text-[var(--brand-navy)]">
      <BrandIcon size={72} />
      <div className="font-display mt-8 text-5xl tracking-tight">Something broke</div>
      <p className="mt-4 text-lg text-[var(--brand-navy)]/70">
        We logged it. Try again in a moment.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-[var(--brand-navy)]/50">digest: {error.digest}</p>}
      <div className="mt-10 flex gap-3">
        <button onClick={reset} className="rounded-md bg-[var(--brand-navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-navy-deep)]">
          Try again
        </button>
        <Link href="/" className="rounded-md border border-[var(--brand-navy)]/20 px-4 py-2 text-sm text-[var(--brand-navy)] hover:bg-[var(--brand-navy)]/5">Home</Link>
      </div>
    </main>
  );
}
