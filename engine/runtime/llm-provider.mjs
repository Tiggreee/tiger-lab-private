/**
 * LLM provider abstraction.
 *
 * Real integration when an API key is present in the environment, deterministic
 * template fallback otherwise. No secrets are ever hardcoded: keys are read from
 * the environment at call time only.
 *
 * Supported providers (auto-detected, in priority order):
 *   - anthropic  (ANTHROPIC_API_KEY)  -> Messages API
 *   - openai     (OPENAI_API_KEY)     -> Chat Completions API
 *   - template   (no key)             -> deterministic local fallback
 */

const DEFAULT_MODELS = {
  anthropic: 'claude-3-5-sonnet-latest',
  openai: 'gpt-4o-mini'
};

/**
 * Detect which provider is usable from the given environment.
 * @param {Record<string, string | undefined>} env
 * @returns {{ provider: 'anthropic' | 'openai' | 'template', model: string | null, keyPresent: boolean }}
 */
export function detectProvider(env = process.env) {
  if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim()) {
    return { provider: 'anthropic', model: env.LLM_MODEL || DEFAULT_MODELS.anthropic, keyPresent: true };
  }
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim()) {
    return { provider: 'openai', model: env.LLM_MODEL || DEFAULT_MODELS.openai, keyPresent: true };
  }
  return { provider: 'template', model: null, keyPresent: false };
}

/**
 * Build a provider-specific HTTP request. Pure and testable.
 * The API key is injected into headers from `env` only; never logged or returned elsewhere.
 * @returns {{ url: string, headers: Record<string, string>, body: object }}
 */
export function buildRequest(provider, { system = '', prompt, model, maxTokens = 800 }, env = process.env) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('buildRequest requires a non-empty prompt string.');
  }

  if (provider === 'anthropic') {
    const key = env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set.');
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: {
        model: model || DEFAULT_MODELS.anthropic,
        max_tokens: maxTokens,
        system: system || undefined,
        messages: [{ role: 'user', content: prompt }]
      }
    };
  }

  if (provider === 'openai') {
    const key = env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set.');
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`
      },
      body: {
        model: model || DEFAULT_MODELS.openai,
        max_tokens: maxTokens,
        messages
      }
    };
  }

  throw new Error(`Unsupported provider for buildRequest: ${provider}`);
}

/**
 * Extract the text content from a provider response payload.
 */
export function parseResponse(provider, payload) {
  if (provider === 'anthropic') {
    const block = payload?.content?.find((c) => c.type === 'text') || payload?.content?.[0];
    const text = block?.text;
    if (typeof text !== 'string') throw new Error('Anthropic response missing text content.');
    return text.trim();
  }
  if (provider === 'openai') {
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error('OpenAI response missing message content.');
    return text.trim();
  }
  throw new Error(`Unsupported provider for parseResponse: ${provider}`);
}

/**
 * Deterministic, offline fallback. Honest: it does not pretend to be an LLM,
 * it returns the prompt shaped as a structured draft so downstream code always
 * gets a usable string even with zero credentials.
 */
export function templateFallback({ system = '', prompt }) {
  const lead = String(prompt).split('\n').find((l) => l.trim().length > 0) || String(prompt);
  const context = system ? `[context] ${system.trim()}\n` : '';
  return `${context}${lead.trim()}`.trim();
}

/**
 * Generate text through the best available provider.
 * Falls back to a deterministic template when no API key is configured.
 *
 * @param {object} opts
 * @param {string} opts.prompt        Required user prompt.
 * @param {string} [opts.system]      Optional system instruction.
 * @param {string} [opts.model]       Optional model override.
 * @param {number} [opts.maxTokens]   Optional token cap.
 * @param {Record<string,string|undefined>} [opts.env]  Environment (defaults to process.env).
 * @param {typeof fetch} [opts.fetchImpl]  Injectable fetch (for tests).
 * @returns {Promise<{ text: string, provider: string, model: string | null, fallback: boolean }>}
 */
export async function generateText({ prompt, system = '', model, maxTokens = 800, env = process.env, fetchImpl } = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('generateText requires a non-empty prompt string.');
  }

  const { provider, model: detectedModel } = detectProvider(env);
  const chosenModel = model || detectedModel;

  if (provider === 'template') {
    return { text: templateFallback({ system, prompt }), provider: 'template', model: null, fallback: true };
  }

  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new Error('No fetch implementation available for LLM request.');
  }

  const req = buildRequest(provider, { system, prompt, model: chosenModel, maxTokens }, env);
  const res = await doFetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body)
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${provider} ${res.status}): ${detail.slice(0, 200)}`);
  }

  const payload = await res.json();
  const text = parseResponse(provider, payload);
  return { text, provider, model: chosenModel, fallback: false };
}
