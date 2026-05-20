// Polish a candidate headline into a social-media-ready caption.
// AI ONLY rewrites prose. Numbers, country names, dates come from supporting_data.

import Anthropic from '@anthropic-ai/sdk';
import { logAiUsage } from '@/lib/ai-usage';
import type { CandidateFact } from '@/lib/social/types';

const MODEL = 'claude-haiku-4-5';

let client: Anthropic | null = null;
function getClient() {
  if (client) return client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  client = new Anthropic({ apiKey: key });
  return client;
}

export async function generateCaption(fact: CandidateFact, platform: 'instagram' | 'x' = 'instagram'): Promise<string> {
  const c = getClient();
  const platformGuide = platform === 'x'
    ? 'For X (Twitter): max 240 characters. No hashtags. Tight.'
    : 'For Instagram: 2-4 sentences. Tasteful, no clickbait. Up to 5 relevant hashtags at the end (e.g. #ecb #eurozone #fiscal).';

  const system = [
    'You write social-media captions for an economic-data site called Eurospending.',
    'You only polish the prose. Numbers, country names, dates, and metric labels come from the provided JSON.',
    'Never invent figures. Never round numbers differently than provided. If a number is in the JSON, use it verbatim.',
    'No emojis. No exclamation marks. Concise and reasonable in tone.',
    platformGuide,
  ].join('\n');

  const user = `Here is a fact about EU economic data. Polish it into a caption.

HEADLINE (auto-generated, for reference): ${fact.headline}
RULE: ${fact.rule_name}
PRIORITY: ${fact.priority_score}/100

SUPPORTING DATA (use these values exactly):
${JSON.stringify(fact.supporting_data, null, 2)}

Output ONLY the caption text — no preamble, no quotes, no markdown.`;

  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const caption = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();

  await logAiUsage({
    feature: 'social_caption',
    model: MODEL,
    inputTokens: res.usage?.input_tokens ?? 0,
    outputTokens: res.usage?.output_tokens ?? 0,
    metadata: { rule: fact.rule_name, country: fact.country_iso, platform },
  });

  return caption;
}
