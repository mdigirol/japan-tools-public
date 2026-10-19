// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see CLAUDE.md, "Public-only features").
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { FEEDBACK_MAX, feedbackBody, feedbackTitle } from '../../src/lib/feedbackIssue';
import { feedbackEnabled, feedbackUrl, sendFeedback } from '../../src/lib/feedback';
import { handle, type Env } from '../../worker/feedback/src/index';

const ctx = { version: '0.1.0', builtAt: '2026-10-19T00:00:00Z', screen: '390×844', standalone: true };

describe('feedback form', () => {
  it('only lives in japan-trip-tools-public', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(pkg.name, 'The feedback form posts public issues. Remove it from this repo (see CLAUDE.md).').toBe('japan-trip-tools-public');
  });

  it('shows only in a build served from the public repo path', () => {
    expect(feedbackEnabled('/japan-trip-tools-public/')).toBe(true);
    expect(feedbackEnabled('/japan-trip-tools/')).toBe(false);
    expect(feedbackEnabled('/')).toBe(false);
  });

  it('titles the issue from the first line, trimmed', () => {
    expect(feedbackTitle('  Rate never loads\nmore detail')).toBe('Feedback: Rate never loads');
    expect(feedbackTitle('x'.repeat(80))).toHaveLength('Feedback: '.length + 60);
  });

  it('adds the kind and app version, and caps the message', () => {
    const body = feedbackBody('idea', 'y'.repeat(FEEDBACK_MAX + 50), ctx);
    expect(body).toContain('Kind: Idea');
    expect(body).toContain('App: 0.1.0');
    expect(body).toContain('home screen app');
    expect(body.split('\n')[0]).toHaveLength(FEEDBACK_MAX);
  });

  it('falls back to a prefilled new-issue link on this repo', () => {
    const u = new URL(feedbackUrl('bug', 'Cards page is blank', ctx));
    expect(`${u.origin}${u.pathname}`).toBe('https://github.com/mdigirol/japan-trip-tools-public/issues/new');
    expect(u.searchParams.get('title')).toBe('Feedback: Cards page is blank');
    expect(u.searchParams.get('labels')).toBe('feedback,bug');
    expect(feedbackUrl('content', 'word, '.repeat(FEEDBACK_MAX / 6), ctx).length).toBeLessThan(8000);
  });

  it('sends to the relay as a simple request and explains failures', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 201 }));
    expect(await sendFeedback({ kind: 'idea', message: 'Hi' }, ctx, 'tok', { url: 'https://relay.test/', fetcher })).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://relay.test/');
    expect((init.headers as Record<string, string>)['Content-Type']).toMatch(/^text\/plain/);
    expect(JSON.parse(init.body as string)).toMatchObject({ kind: 'idea', message: 'Hi', turnstile: 'tok', version: '0.1.0', website: '' });

    const rate = await sendFeedback({ kind: 'bug', message: 'x' }, ctx, '', { url: 'u', fetcher: async () => new Response('', { status: 429 }) });
    expect(rate).toMatchObject({ ok: false, error: expect.stringContaining('Too many') });
    const down = await sendFeedback({ kind: 'bug', message: 'x' }, ctx, '', { url: 'u', fetcher: async () => { throw new TypeError('offline'); } });
    expect(down).toMatchObject({ ok: false, error: expect.stringContaining('reach the server') });
  });
});

describe('feedback relay (worker)', () => {
  const ORIGIN = 'https://mdigirol.github.io';
  const env = (over: Partial<Env> = {}): Env => ({
    GITHUB_TOKEN: 'test-token', TURNSTILE_SECRET: 'test-secret', GITHUB_REPO: 'mdigirol/japan-trip-tools-public', ALLOWED_ORIGINS: ORIGIN, ...over
  });
  const post = (body: object, origin = ORIGIN) => new Request('https://relay.test/', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'text/plain', 'CF-Connecting-IP': '203.0.113.9' }, body: JSON.stringify(body)
  });
  const note = { kind: 'bug', message: 'Cards page is blank', turnstile: 'ok-token', ...ctx };
  // Fake Turnstile and GitHub. Records what the worker sent.
  const upstream = (turnstileOk = true, githubStatus = 201) => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('turnstile')) return new Response(JSON.stringify({ success: turnstileOk }));
      return new Response(JSON.stringify({ number: 12 }), { status: githubStatus });
    }) as unknown as typeof fetch;
    return { calls, fetcher };
  };

  it('creates the issue as the token owner, with labels from the kind', async () => {
    const { calls, fetcher } = upstream();
    const r = await handle(post(note), env(), fetcher);
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ ok: true, number: 12 });
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const gh = calls.find((c) => c.url.includes('api.github.com'))!;
    expect(gh.url).toBe('https://api.github.com/repos/mdigirol/japan-trip-tools-public/issues');
    expect((gh.init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    expect(JSON.parse(gh.init.body as string)).toMatchObject({ title: 'Feedback: Cards page is blank', labels: ['feedback', 'bug'] });
    expect(String(calls[0].init.body)).toContain('remoteip=203.0.113.9');
  });

  it('refuses other sites, and answers the preflight for its own', async () => {
    const { calls, fetcher } = upstream();
    expect((await handle(post(note, 'https://evil.example'), env(), fetcher)).status).toBe(403);
    const pre = await handle(new Request('https://relay.test/', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env(), fetcher);
    expect(pre.status).toBe(204);
    expect(calls).toHaveLength(0);
  });

  it('stops spam: failed Turnstile, rate limit, honeypot', async () => {
    const t = upstream(false);
    expect((await handle(post(note), env(), t.fetcher)).status).toBe(403);
    expect(t.calls.some((c) => c.url.includes('github'))).toBe(false);

    const limited = upstream();
    const r = await handle(post(note), env({ FEEDBACK_LIMITER: { limit: async () => ({ success: false }) } }), limited.fetcher);
    expect(r.status).toBe(429);
    expect(limited.calls).toHaveLength(0);

    const trap = upstream();
    expect((await handle(post({ ...note, website: 'http://spam' }), env(), trap.fetcher)).status).toBe(200);
    expect(trap.calls).toHaveLength(0);
  });

  it('rejects bad notes and reports GitHub or setup failures', async () => {
    const u = upstream();
    expect((await handle(post({ ...note, kind: 'rant' }), env(), u.fetcher)).status).toBe(400);
    expect((await handle(post({ ...note, message: '  ' }), env(), u.fetcher)).status).toBe(400);
    expect((await handle(post({ ...note, message: 'x'.repeat(FEEDBACK_MAX + 1) }), env(), u.fetcher)).status).toBe(400);
    expect((await handle(post(note), env({ GITHUB_TOKEN: undefined }), u.fetcher)).status).toBe(503);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await handle(post(note), env(), upstream(true, 401).fetcher)).status).toBe(502);
  });
});
