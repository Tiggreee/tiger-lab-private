#!/usr/bin/env node
/**
 * LLM Port — engine/llm/llm-port.mjs
 *
 * Provider-agnostic large language model access for the product engine.
 *
 * Design contract:
 * - OFF by default. Production and CI gates must never depend on it.
 *   Enable only with LLM_ENABLED=true and a valid provider key.
 * - Never throws to the caller. On disabled/missing-key/error it returns null,
 *   and every caller MUST have a deterministic fallback.
 * - No credential is ever logged.
 *
 * Environment:
 *   LLM_ENABLED   'true' to activate (default: off)
 *   LLM_PROVIDER  'openai' (default) | 'anthropic'
 *   LLM_MODEL     model id (default per provider)
 *   OPENAI_API_KEY / ANTHROPIC_API_KEY
 *   LLM_TIMEOUT_MS  request timeout (default 20000)
 */

import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

const PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);
const DEFAULT_MODEL = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest'
};

export function isLlmEnabled() {
  if (String(process.env.LLM_ENABLED).toLowerCase() !== 'true') return false;
  if (PROVIDER === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  if (PROVIDER === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  return false;
}

export function llmStatus() {
  return {
    enabled: isLlmEnabled(),
    provider: PROVIDER,
    model: process.env.LLM_MODEL || DEFAULT_MODEL[PROVIDER] || 'unknown',
    reason: isLlmEnabled()
      ? 'active'
      : String(process.env.LLM_ENABLED).toLowerCase() !== 'true'
        ? 'LLM_ENABLED is not true'
        : 'provider API key missing'
  };
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function completeOpenAI(prompt, { system, maxTokens, temperature }) {
  const model = process.env.LLM_MODEL || DEFAULT_MODEL.openai;
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens ?? 800,
      temperature: temperature ?? 0.7
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

async function completeAnthropic(prompt, { system, maxTokens, temperature }) {
  const model = process.env.LLM_MODEL || DEFAULT_MODEL.anthropic;
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens ?? 800,
      temperature: temperature ?? 0.7,
      system: system || undefined,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = Array.isArray(data?.content) ? data.content.map((b) => b?.text || '').join('').trim() : '';
  return text || null;
}

/**
 * Run a completion. Returns the model text, or null when the LLM is disabled
 * or the request fails. Callers must handle null with a deterministic path.
 */
export async function complete(prompt, options = {}) {
  if (!isLlmEnabled()) return null;
  try {
    if (PROVIDER === 'anthropic') return await completeAnthropic(prompt, options);
    return await completeOpenAI(prompt, options);
  } catch {
    return null;
  }
}

/**
 * Parse a JSON array/object from a model response, tolerating code fences.
 * Returns fallback when parsing fails.
 */
export function parseJsonLoose(text, fallback = null) {
  if (typeof text !== 'string') return fallback;
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return fallback; }
    }
    return fallback;
  }
}

// CLI: report status without exposing keys.
if (process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(llmStatus(), null, 2));
}
