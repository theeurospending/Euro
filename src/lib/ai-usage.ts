import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export async function logAiUsage(opts: {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  metadata?: Record<string, unknown>;
}) {
  const p = PRICING_PER_MTOK[opts.model] ?? { input: 0, output: 0 };
  const cost = (opts.inputTokens / 1_000_000) * p.input + (opts.outputTokens / 1_000_000) * p.output;
  const supabase = createSupabaseAdminClient();
  await supabase.from('ai_usage_log').insert({
    feature: opts.feature,
    model: opts.model,
    input_tokens: opts.inputTokens,
    output_tokens: opts.outputTokens,
    cost_usd: cost.toFixed(6),
    metadata: opts.metadata ?? {},
  });
  return cost;
}
