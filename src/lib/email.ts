import { Resend } from 'resend';

let cached: Resend | null = null;

export function getResend() {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  cached = new Resend(key);
  return cached;
}

export function applyTemplate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(vars[key] ?? ''));
}
