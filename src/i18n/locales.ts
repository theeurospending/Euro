// The 24 official EU languages. `code` is the URL/locale prefix; `native` is
// the endonym shown in the language picker.
export const LOCALES = [
  { code: 'bg', native: 'Български' },
  { code: 'cs', native: 'Čeština' },
  { code: 'da', native: 'Dansk' },
  { code: 'de', native: 'Deutsch' },
  { code: 'el', native: 'Ελληνικά' },
  { code: 'en', native: 'English' },
  { code: 'es', native: 'Español' },
  { code: 'et', native: 'Eesti' },
  { code: 'fi', native: 'Suomi' },
  { code: 'fr', native: 'Français' },
  { code: 'ga', native: 'Gaeilge' },
  { code: 'hr', native: 'Hrvatski' },
  { code: 'hu', native: 'Magyar' },
  { code: 'it', native: 'Italiano' },
  { code: 'lt', native: 'Lietuvių' },
  { code: 'lv', native: 'Latviešu' },
  { code: 'mt', native: 'Malti' },
  { code: 'nl', native: 'Nederlands' },
  { code: 'pl', native: 'Polski' },
  { code: 'pt', native: 'Português' },
  { code: 'ro', native: 'Română' },
  { code: 'sk', native: 'Slovenčina' },
  { code: 'sl', native: 'Slovenščina' },
  { code: 'sv', native: 'Svenska' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_CODES = LOCALES.map((l) => l.code) as Locale[];

export function isLocale(value: string): value is Locale {
  return (LOCALE_CODES as string[]).includes(value);
}

export function nativeName(code: string): string {
  return LOCALES.find((l) => l.code === code)?.native ?? code;
}
