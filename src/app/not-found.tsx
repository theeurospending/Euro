import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-6xl font-bold tracking-tight">404</div>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        We don&apos;t have data for that. Try the home page, or browse all countries.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">Home</Link>
        <Link href="/blog" className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Blog</Link>
      </div>
    </main>
  );
}
