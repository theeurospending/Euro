'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to Cloudflare logs.
    console.error('app error:', error.message, error.digest);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-6xl font-bold tracking-tight">Something broke</div>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        We logged it. If you saw this from a recent action, try again in a moment.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-zinc-400">digest: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
          Try again
        </button>
        <Link href="/" className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Home</Link>
      </div>
    </main>
  );
}
