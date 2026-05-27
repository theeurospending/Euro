import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/locales';

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return children;
}
