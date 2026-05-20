// Polish a candidate headline into a social-media-ready caption.
// AI ONLY rewrites prose. Numbers, country names, dates come from supporting_data.
//
// All captions are hard-capped at 240 characters so the same string works for
// X, Instagram, and Facebook without per-platform rewrites.

import Anthropic from '@anthropic-ai/sdk';
import { logAiUsage } from '@/lib/ai-usage';
import type { CandidateFact } from '@/lib/social/types';

const MODEL = 'claude-haiku-4-5';
const MAX_CHARS = 240;

let client: Anthropic | null = null;
function getClient() {
  if (client) return client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  client = new Anthropic({ apiKey: key });
  return client;
}

export async function generateCaption(fact: CandidateFact, _platform: 'instagram' | 'x' = 'instagram'): Promise<string> {
  const c = getClient();

  const system = [
    'You write social-media captions for an economic-data site called Eurospending.',
    'You only polish the prose. Numbers, country names, dates, and metric labels come from the provided JSON.',
    'Never invent figures. Never round numbers differently than provided. If a number is in the JSON, use it verbatim.',
    'No emojis. No exclamation marks. Concise and reasonable in tone.',
    `HARD LIMIT: the caption MUST be ${MAX_CHARS} characters or fewer including any hashtags. Count carefully. If you cannot fit hashtags, omit them.`,
    'Style: 1-2 short sentences. Up to 2 optional hashtags at the end (e.g. #ECB #eurozone), but only if total stays under the limit.',
  ].join('\n');

  const user = `Here is a fact about EU economic data. Polish it into a caption.

HEADLINE (auto-generated, for reference): ${fact.headline}
RULE: ${fact.rule_name}
PRIORITY: ${fact.priority_score}/100

SUPPORTING DATA (use these values exactly):
${JSON.stringify(fact.supporting_data, null, 2)}

Output ONLY the caption text — no preamble, no quotes, no markdown. Maximum ${MAX_CHARS} characters.`;

  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 200,
    system,
    messages: [{ role: 'user', content: user }],
  });

  let caption = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();

  // Belt-and-braces enforcement: if the model overruns, trim cleanly to the last
  // word that fits, then add an ellipsis. Better to truncate than fail at X's API.
  if (caption.length > MAX_CHARS) {
    const trimmed = caption.slice(0, MAX_CHARS - 1);
    const lastSpace = trimmed.lastIndexOf(' ');
    caption = (lastSpace > MAX_CHARS - 30 ? trimmed.slice(0, lastSpace) : trimmed) + '…';
  }

  await logAiUsage({
    feature: 'social_caption',
    model: MODEL,
    inputTokens: res.usage?.input_tokens ?? 0,
    outputTokens: res.usage?.output_tokens ?? 0,
    metadata: { rule: fact.rule_name, country: fact.country_iso, char_count: caption.length },
  });

  return caption;
}
