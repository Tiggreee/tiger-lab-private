import { describe, expect, it, vi } from 'vitest';
import {
  detectProvider,
  buildRequest,
  parseResponse,
  templateFallback,
  generateText
} from '../../../engine/runtime/llm-provider.mjs';

describe('detectProvider', () => {
  it('falls back to template when no key is present', () => {
    expect(detectProvider({})).toEqual({ provider: 'template', model: null, keyPresent: false });
  });

  it('prefers anthropic when its key is present', () => {
    const d = detectProvider({ ANTHROPIC_API_KEY: 'sk-ant-x', OPENAI_API_KEY: 'sk-openai-x' });
    expect(d.provider).toBe('anthropic');
    expect(d.keyPresent).toBe(true);
    expect(d.model).toContain('claude');
  });

  it('uses openai when only its key is present', () => {
    const d = detectProvider({ OPENAI_API_KEY: 'sk-openai-x' });
    expect(d.provider).toBe('openai');
    expect(d.model).toContain('gpt');
  });

  it('honors an explicit LLM_MODEL override', () => {
    const d = detectProvider({ ANTHROPIC_API_KEY: 'sk-ant-x', LLM_MODEL: 'claude-custom' });
    expect(d.model).toBe('claude-custom');
  });
});

describe('buildRequest', () => {
  it('builds an anthropic request with auth header and messages', () => {
    const req = buildRequest(
      'anthropic',
      { system: 'be concise', prompt: 'hello', maxTokens: 100 },
      { ANTHROPIC_API_KEY: 'sk-ant-123' }
    );
    expect(req.url).toBe('https://api.anthropic.com/v1/messages');
    expect(req.headers['x-api-key']).toBe('sk-ant-123');
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(req.body.system).toBe('be concise');
    expect(req.body.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('builds an openai request with bearer auth and system message', () => {
    const req = buildRequest(
      'openai',
      { system: 'be concise', prompt: 'hello' },
      { OPENAI_API_KEY: 'sk-openai-123' }
    );
    expect(req.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(req.headers.authorization).toBe('Bearer sk-openai-123');
    expect(req.body.messages[0]).toEqual({ role: 'system', content: 'be concise' });
    expect(req.body.messages[1]).toEqual({ role: 'user', content: 'hello' });
  });

  it('throws when the required key is missing', () => {
    expect(() => buildRequest('anthropic', { prompt: 'hi' }, {})).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws on an empty prompt', () => {
    expect(() => buildRequest('openai', { prompt: '' }, { OPENAI_API_KEY: 'x' })).toThrow(/non-empty prompt/);
  });
});

describe('parseResponse', () => {
  it('extracts anthropic text content', () => {
    const text = parseResponse('anthropic', { content: [{ type: 'text', text: '  hi there  ' }] });
    expect(text).toBe('hi there');
  });

  it('extracts openai message content', () => {
    const text = parseResponse('openai', { choices: [{ message: { content: 'answer' } }] });
    expect(text).toBe('answer');
  });

  it('throws on a malformed payload', () => {
    expect(() => parseResponse('openai', { choices: [] })).toThrow(/missing message content/);
  });
});

describe('templateFallback', () => {
  it('returns a deterministic non-empty draft', () => {
    const out = templateFallback({ system: 'ctx', prompt: 'first line\nsecond line' });
    expect(out).toContain('first line');
    expect(out).toContain('[context] ctx');
  });
});

describe('generateText', () => {
  it('uses the deterministic fallback when no key is configured', async () => {
    const result = await generateText({ prompt: 'draft this', env: {} });
    expect(result.provider).toBe('template');
    expect(result.fallback).toBe(true);
    expect(result.text).toContain('draft this');
  });

  it('calls the real provider endpoint when a key is present (mocked fetch)', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'generated copy' }] })
    }));

    const result = await generateText({
      prompt: 'write a headline',
      env: { ANTHROPIC_API_KEY: 'sk-ant-live' },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).messages[0].content).toBe('write a headline');
    expect(result.provider).toBe('anthropic');
    expect(result.fallback).toBe(false);
    expect(result.text).toBe('generated copy');
  });

  it('throws when the provider returns a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'unauthorized'
    }));

    await expect(
      generateText({ prompt: 'x', env: { OPENAI_API_KEY: 'bad' }, fetchImpl })
    ).rejects.toThrow(/LLM request failed \(openai 401\)/);
  });
});
