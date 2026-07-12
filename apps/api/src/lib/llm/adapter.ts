import { z } from 'zod';
import { env } from '../env.js';
import { logger } from '../logger.js';

const llmResponseSchema = z.object({
  prose: z.string(),
});

interface CacheEntry {
  prose: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface CopilotPrompt {
  headline: string;
  signals: Array<{ key: string; label: string; value: string; unit: string; context: string; score: string }>;
  recommendation: {
    action: string;
    timing: string;
    why: string;
    confidence: number;
  };
}

export interface ReportPrompt {
  asOf: string;
  digest: Array<{ key: string; value: number | string; unit: string }>;
  topAlerts: Array<{ title: string; message: string; priority: string }>;
  recommendations: Array<{ action: string; detail: string }>;
}

function fingerprint(input: unknown): string {
  let hash = 5381;
  const str = JSON.stringify(input);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return String(hash >>> 0);
}

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.prose;
}

function setCache(key: string, prose: string): void {
  cache.set(key, { prose, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function enhanceCopilotProse(
  vehicleId: string,
  prompt: CopilotPrompt,
): Promise<string> {
  if (env.LLM_PROVIDER === 'none' || !isLLMEnabled()) {
    return buildTemplatedCopilotProse(prompt);
  }

  const fp = fingerprint({ type: 'copilot', vehicleId, prompt });
  const cached = getCached(fp);
  if (cached) return cached;

  const systemPrompt = [
    'You are a fleet operations analyst assistant. You receive structured vehicle data and a recommendation.',
    'Your job is to rewrite the recommendation paragraph into natural, concise prose.',
    'Rules:',
    '- NEVER change any numbers, dates, or factual claims.',
    '- NEVER invent new facts or recommendations.',
    '- Output ONLY valid JSON: { "prose": "..." }',
    '- Keep the prose under 150 words.',
    '- Use a professional but approachable tone.',
  ].join('\n');

  const userPrompt = JSON.stringify({
    headline: prompt.headline,
    status: prompt.signals.filter((s) => s.score === 'warn').map((s) => `${s.label}: ${s.value}${s.unit}`).join('; '),
    recommendation: prompt.recommendation,
  });

  const result = await callLLM(systemPrompt, userPrompt, fp);
  return result ?? buildTemplatedCopilotProse(prompt);
}

export async function enhanceReportProse(prompt: ReportPrompt): Promise<string> {
  if (env.LLM_PROVIDER === 'none' || !isLLMEnabled()) {
    return buildTemplatedReportProse(prompt);
  }

  const fp = fingerprint({ type: 'report', prompt });
  const cached = getCached(fp);
  if (cached) return cached;

  const systemPrompt = [
    'You are a fleet operations analyst. You receive a daily operations digest.',
    'Rewrite the digest into a concise, natural-language summary paragraph.',
    'Rules:',
    '- NEVER change any numbers.',
    '- NEVER invent facts or recommendations.',
    '- Output ONLY valid JSON: { "prose": "..." }',
    '- Keep the prose under 200 words.',
  ].join('\n');

  const userPrompt = JSON.stringify(prompt);

  const result = await callLLM(systemPrompt, userPrompt, fp);
  return result ?? buildTemplatedReportProse(prompt);
}

function isLLMEnabled(): boolean {
  if (env.LLM_PROVIDER === 'groq') return !!env.GROQ_API_KEY;
  if (env.LLM_PROVIDER === 'gemini') return !!env.GEMINI_API_KEY;
  return false;
}

async function callLLM(
  system: string,
  user: string,
  cacheKey: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS);

    let response: Response;
    if (env.LLM_PROVIDER === 'groq') {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.LLM_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });
    } else if (env.LLM_PROVIDER === 'gemini') {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${env.LLM_MODEL || 'gemini-2.0-flash'}:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
          }),
          signal: controller.signal,
        },
      );
    } else {
      return null;
    }

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn({ status: response.status, provider: env.LLM_PROVIDER }, 'llm: non-ok response');
      return null;
    }

    const json = (await response.json()) as Record<string, unknown>;

    let text: string;
    if (env.LLM_PROVIDER === 'groq') {
      const choices = json.choices as Array<{ message: { content: string } }> | undefined;
      text = choices?.[0]?.message?.content ?? '';
    } else {
      const candidates = json.candidates as Array<{ content: { parts: Array<{ text: string }> } }> | undefined;
      text = candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    if (!text) {
      logger.warn('llm: empty response text');
      return null;
    }

    const parsed = extractJson(text);
    if (!parsed) {
      logger.warn('llm: failed to extract JSON from response');
      return null;
    }

    const validated = llmResponseSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn({ errors: validated.error.flatten() }, 'llm: schema validation failed');
      return null;
    }

    setCache(cacheKey, validated.data.prose);
    return validated.data.prose;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      logger.warn('llm: request timeout');
    } else {
      logger.error({ err }, 'llm: call failed');
    }
    return null;
  }
}

function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch { /* fall through */ }
  }
  const jsonMatch = /\{[\s\S]*"prose"[\s\S]*\}/.exec(trimmed);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
  }
  return null;
}

export function buildTemplatedCopilotProse(prompt: CopilotPrompt): string {
  const warns = prompt.signals.filter((s) => s.score === 'warn');
  const goods = prompt.signals.filter((s) => s.score === 'good');

  const lines: string[] = [`Vehicle ${prompt.headline} analysis:`];

  if (goods.length > 0) {
    const goodMsgs = goods.map((s) => `${s.label} ${s.value}${s.unit} (${s.context || 'on track'})`);
    lines.push(`In good standing — ${goodMsgs.join('; ')}.`);
  }

  if (warns.length > 0) {
    const warnMsgs = warns.map((s) => `${s.label} ${s.value}${s.unit} (${s.context || 'needs attention'})`);
    lines.push(`Areas needing attention: ${warnMsgs.join('; ')}.`);
  }

  lines.push(
    `Recommendation: ${prompt.recommendation.action} — ${prompt.recommendation.why} (confidence: ${prompt.recommendation.confidence}%).`,
  );

  return lines.join(' ');
}

export function buildTemplatedReportProse(prompt: ReportPrompt): string {
  const digestParts = prompt.digest
    .filter((d) => d.value !== 0 && d.value !== '0')
    .map((d) => `${d.value} ${d.unit ?? ''} ${d.key.replace(/_/g, ' ')}`)
    .join(', ');

  let prose = `Today's fleet report (${prompt.asOf.split('T')[0]}): ${digestParts}.`;

  if (prompt.topAlerts.length > 0) {
    prose += ` Top alerts: ${prompt.topAlerts.map((a) => a.title).join('; ')}.`;
  }

  if (prompt.recommendations.length > 0) {
    prose += ` Action items: ${prompt.recommendations.map((r) => r.action).join('; ')}.`;
  }

  return prose;
}
