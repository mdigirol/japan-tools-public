// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see "Public-only features" in CLAUDE.md).
//
// Feedback relay (Cloudflare Worker). The app POSTs a note here; the Worker checks it and creates an issue
// on GITHUB_REPO with a token that never leaves Cloudflare. Setup: worker/feedback/README.md.
import { FEEDBACK_MAX, feedbackBody, feedbackTitle, isKind, issueLabels } from '../../../src/lib/feedbackIssue';

export interface Env {
  GITHUB_TOKEN?: string;      // secret: fine-grained token, Issues read/write on GITHUB_REPO only
  TURNSTILE_SECRET?: string;  // secret: when set, every note needs a valid Turnstile token
  GITHUB_REPO: string;        // var, owner/name
  ALLOWED_ORIGINS: string;    // var, comma-separated, e.g. https://mdigirol.github.io
  FEEDBACK_LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> };
}

type Fetch = typeof fetch;

const cors = (origin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin'
});

const short = (v: unknown, n = 40) => String(v ?? '').slice(0, n);

export async function handle(req: Request, env: Env, fetcher: Fetch = fetch): Promise<Response> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return new Response('Forbidden', { status: 403 });
  const reply = (status: number, data: object) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'method' });
  if (!env.GITHUB_TOKEN) return reply(503, { ok: false, error: 'not configured' });

  const ip = req.headers.get('CF-Connecting-IP') ?? '';
  if (env.FEEDBACK_LIMITER && !(await env.FEEDBACK_LIMITER.limit({ key: ip || 'unknown' })).success) {
    return reply(429, { ok: false, error: 'rate' });
  }

  let b: Record<string, unknown>;
  try { b = JSON.parse(await req.text()); } catch { return reply(400, { ok: false, error: 'json' }); }
  if (b.website) return reply(200, { ok: true });   // honeypot: people never fill it in
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (!isKind(b.kind) || !message || message.length > FEEDBACK_MAX) return reply(400, { ok: false, error: 'invalid' });

  if (env.TURNSTILE_SECRET) {
    const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: short(b.turnstile, 2048) });
    if (ip) form.set('remoteip', ip);
    const v = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
      .then((r) => r.json() as Promise<{ success?: boolean }>).catch(() => ({ success: false }));
    if (!v.success) return reply(403, { ok: false, error: 'check' });
  }

  const ctx = { version: short(b.version), builtAt: short(b.builtAt), screen: short(b.screen), standalone: b.standalone === true };
  const r = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'jtc-feedback-worker',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: feedbackTitle(message), body: feedbackBody(b.kind, message, ctx), labels: issueLabels(b.kind) })
  }).catch(() => null);
  if (!r?.ok) {
    console.error('GitHub issue create failed', r?.status, await r?.text().catch(() => ''));
    return reply(502, { ok: false, error: 'github' });
  }
  const issue = (await r.json()) as { number: number };
  return reply(201, { ok: true, number: issue.number });
}

export default { fetch: (req: Request, env: Env) => handle(req, env) };
