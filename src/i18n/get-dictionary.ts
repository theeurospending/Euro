import 'server-only';
import type { Locale } from './locales';
import { DEFAULT_LOCALE } from './locales';
import en from './dictionaries/en.json';

export type Dictionary = typeof en;

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  bg: () => import('./dictionaries/bg.json'),
  cs: () => import('./dictionaries/cs.json'),
  da: () => import('./dictionaries/da.json'),
  de: () => import('./dictionaries/de.json'),
  el: () => import('./dictionaries/el.json'),
  en: () => import('./dictionaries/en.json'),
  es: () => import('./dictionaries/es.json'),
  et: () => import('./dictionaries/et.json'),
  fi: () => import('./dictionaries/fi.json'),
  fr: () => import('./dictionaries/fr.json'),
  ga: () => import('./dictionaries/ga.json'),
  hr: () => import('./dictionaries/hr.json'),
  hu: () => import('./dictionaries/hu.json'),
  it: () => import('./dictionaries/it.json'),
  lt: () => import('./dictionaries/lt.json'),
  lv: () => import('./dictionaries/lv.json'),
  mt: () => import('./dictionaries/mt.json'),
  nl: () => import('./dictionaries/nl.json'),
  pl: () => import('./dictionaries/pl.json'),
  pt: () => import('./dictionaries/pt.json'),
  ro: () => import('./dictionaries/ro.json'),
  sk: () => import('./dictionaries/sk.json'),
  sl: () => import('./dictionaries/sl.json'),
  sv: () => import('./dictionaries/sv.json'),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  const load = loaders[(locale as Locale)] ?? loaders[DEFAULT_LOCALE];
  return (await load()).default as Dictionary;
}
