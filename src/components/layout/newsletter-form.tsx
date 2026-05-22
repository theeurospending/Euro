'use client';

import { useState } from 'react';

export function NewsletterForm({ source = 'homepage' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy'); setError(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setState('sent');
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (state === 'sent') {
    return (
      <div className="text-sm text-[var(--brand-navy)]/80">
        <span className="text-[var(--brand-gold)]">✓</span> Check your inbox.
        We sent a confirmation link to <code className="font-mono text-[var(--brand-navy)]">{email}</code>.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-md border border-[var(--brand-navy)]/20 bg-white px-3 py-2.5 text-sm text-[var(--brand-navy)] placeholder:text-[var(--brand-navy)]/40 focus:border-[var(--brand-navy)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === 'busy' || !email}
        className="rounded-md bg-[var(--brand-navy)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-navy-deep)] disabled:opacity-50"
      >
        {state === 'busy' ? 'Sending…' : 'Subscribe'}
      </button>
      {error && <div className="text-xs text-rose-700 sm:basis-full">{error}</div>}
    </form>
  );
}
