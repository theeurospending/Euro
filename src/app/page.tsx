export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight">Eurospending</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        Tracking how Europe spends, borrows, and inflates — country by country, year by year.
      </p>
      <p className="mt-12 text-sm text-zinc-500">
        Site under construction. Admin sign-in:{' '}
        <a className="underline" href="/admin/login">/admin/login</a>
      </p>
    </main>
  );
}
