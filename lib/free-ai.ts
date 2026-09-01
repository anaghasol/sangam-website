/**
 * Sangam's chat model cascade — free tiers only, across several providers.
 *
 * SANGAM ONLY. This file lives in sangam-website and is used by Sangam's chat.
 * Sitara has its own separate gateway; the two apps are not shared.
 *
 * WHY MORE THAN GROQ: the chat used to try six Groq models and nothing else, so
 * when Groq's free tier rate-limited — which it does after a handful of messages
 * in quick succession — every model failed and the guest got "I'm just stepping
 * away for a moment". Measured live: seven test questions in a row, and the last
 * two got that fallback with `rate_limit_exceeded` on all six models. A busy
 * evening would do the same thing.
 *
 * Groq stays first because it is the fastest; the others exist so a rate limit
 * on any one provider is invisible to the guest rather than fatal.
 *
 * Every provider here is a FREE tier. No paid model is called.
 */

export type Msg = { role: string; content: string }

type Provider = {
  name: string
  /** Every key to try, in order. A dead key is skipped, not fatal. */
  keys: () => (string | undefined)[]
  models: string[]
  call: (key: string, model: string, system: string, msgs: Msg[]) => Promise<string | null>
}

/** OpenAI-shaped chat completion — Groq, Cerebras, OpenRouter and Mistral all speak it. */
async function openaiStyle(
  url: string, key: string, model: string, system: string, msgs: Msg[], extra: Record<string, unknown> = {},
): Promise<string | null> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        // These APIs require the conversation to open with a user turn.
        ...msgs.filter((m, i) => !(i === 0 && m.role === 'assistant')),
      ],
      max_tokens: 500,
      temperature: 0.7,
      ...extra,
    }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json().catch(() => null)
  if (!data || data.error) {
    console.error(`[chat] ${model} failed:`, data?.error?.code || data?.error?.message || res.status)
    return null
  }
  return data.choices?.[0]?.message?.content?.trim() || null
}

const PROVIDERS: Provider[] = [
  {
    name: 'groq',
    keys: () => [process.env.GROQ_API_KEY],
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound', 'groq/compound-mini', 'allam-2-7b'],
    call: (k, m, s, msgs) => openaiStyle('https://api.groq.com/openai/v1/chat/completions', k, m, s, msgs),
  },
  {
    name: 'cerebras',
    keys: () => [process.env.CEREBRAS_API_KEY],
    models: ['gpt-oss-120b', 'llama-3.3-70b'],
    call: (k, m, s, msgs) => openaiStyle('https://api.cerebras.ai/v1/chat/completions', k, m, s, msgs),
  },
  {
    name: 'mistral',
    keys: () => [process.env.MISTRAL_API_KEY],
    models: ['mistral-small-latest'],
    call: (k, m, s, msgs) => openaiStyle('https://api.mistral.ai/v1/chat/completions', k, m, s, msgs),
  },
  {
    name: 'openrouter',
    // Two keys: the original returns 402 (out of credits) as of 2026-08-31, so
    // the newer one is tried first. Credit is per-key, not per-account, and a
    // spent key fails every call — worth stepping past rather than stopping on.
    keys: () => [process.env.OPENROUTER_API_KEY_2, process.env.OPENROUTER_API_KEY],
    // ":free" variants only — these cost nothing on OpenRouter.
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-2-9b-it:free'],
    call: (k, m, s, msgs) => openaiStyle('https://openrouter.ai/api/v1/chat/completions', k, m, s, msgs),
  },
  {
    name: 'gemini',
    keys: () => [process.env.GEMINI_API_KEY],
    models: ['gemini-2.0-flash'],
    // Gemini has its own request shape: the system prompt is a separate field
    // and turns are "parts", not "content".
    call: async (k, m, s, msgs) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: s }] },
            contents: msgs.map(x => ({
              role: x.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: x.content }],
            })),
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
          }),
          signal: AbortSignal.timeout(15000),
        },
      )
      const data = await res.json().catch(() => null)
      if (!data || data.error) {
        console.error('[chat] gemini failed:', data?.error?.message || res.status)
        return null
      }
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    },
  },
]

/** First free model that answers, or null when every provider is exhausted. */
export async function askFreeModels(system: string, msgs: Msg[]): Promise<string | null> {
  for (const p of PROVIDERS) {
    for (const key of p.keys()) {
      if (!key) continue
      for (const model of p.models) {
        try {
          const reply = await p.call(key, model, system, msgs)
          if (reply) {
            console.log(`[chat] answered by ${p.name}/${model}`)
            return reply
          }
        } catch (err) {
          console.error(`[chat] ${p.name}/${model} threw:`, (err as Error)?.message)
        }
      }
    }
  }
  return null
}
