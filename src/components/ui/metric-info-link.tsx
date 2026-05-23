import Link from 'next/link';
import { explainerForMetric } from '@/lib/blog/metric-explainers';

// Small "i" badge linking to the plain-English explainer for a metric.
// Inherits colour from the surrounding text (works on dark and light surfaces).
// Renders nothing if the metric has no explainer mapped.
export function MetricInfoLink({ metricKey, className = '' }: { metricKey: string | null | undefined; className?: string }) {
  const explainer = explainerForMetric(metricKey);
  if (!explainer) return null;
  return (
    <Link
      href={`/blog/${explainer.slug}`}
      title={`What is this? — ${explainer.title}`}
      aria-label={`What is this metric? Read the explainer: ${explainer.title}`}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current align-middle text-[10px] font-semibold leading-none opacity-50 transition-opacity hover:opacity-100 ${className}`}
    >
      i
    </Link>
  );
}
