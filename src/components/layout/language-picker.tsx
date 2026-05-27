'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LOCALES } from '@/i18n/locales';

// Globe-icon language switcher. Rewrites the first path segment to the chosen
// locale and persists the choice in the NEXT_LOCALE cookie so unprefixed links
// resolve to the same language.
export function LanguagePicker({ current, label }: { current: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000;samesite=lax`;
    const parts = pathname.split('/');
    if (parts.length > 1) parts[1] = code;
    const next = parts.join('/') || `/${code}`;
    router.push(next);
    router.refresh();
  }

  return (
    <label className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-white/80 hover:bg-white/10">
      <span aria-hidden className="text-base leading-none">🌐</span>
      <span className="sr-only">{label}</span>
      <select
        value={current}
        onChange={onChange}
        aria-label={label}
        className="cursor-pointer bg-transparent text-white/80 outline-none [&>option]:text-black"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
