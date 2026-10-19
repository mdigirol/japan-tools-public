// PUBLIC REPO ONLY. Do not copy this file (or src/components/Feedback.tsx, src/lib/feedbackIssue.ts, worker/feedback/)
// into japan-trip-tools. Feedback becomes a public issue on japan-trip-tools-public; in the private app it
// would publish real trip details. See "Public-only features" in CLAUDE.md.
//
// With VITE_FEEDBACK_URL set, notes go to the relay (worker/feedback), which files the issue: type, tap Send, done.
// Without it, the form falls back to a prefilled GitHub "new issue" link.
import { FEEDBACK_REPO, feedbackBody, feedbackTitle, isKind, issueLabels, type FeedbackContext, type FeedbackKind } from './feedbackIssue';
import { FEEDBACK_DRAFT_KEY as DRAFT_KEY, FEEDBACK_OUTBOX_KEY as OUTBOX_KEY } from './storageNames';

export const FEEDBACK_URL: string = import.meta.env.VITE_FEEDBACK_URL ?? '';
export const TURNSTILE_SITE_KEY: string = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

// Second guard if the code gets copied anyway: the form only shows in a build served from this repo's path.
export const feedbackEnabled = (base: string = import.meta.env.BASE_URL): boolean => base === '/japan-trip-tools-public/';

export interface Note { kind: FeedbackKind; message: string }

// Labels only stick when the submitter can triage the repo; GitHub ignores them otherwise.
export function feedbackUrl(kind: FeedbackKind, message: string, ctx: FeedbackContext, repo: string = FEEDBACK_REPO): string {
  const q = new URLSearchParams({ title: feedbackTitle(message), body: feedbackBody(kind, message, ctx), labels: issueLabels(kind).join(',') });
  return `https://github.com/${repo}/issues/new?${q.toString()}`;
}

export type SendResult = { ok: true } | { ok: false; error: string };

// text/plain keeps it a "simple" request: no CORS preflight round trip on a slow phone connection.
// `website` is the form's hidden spam trap: people leave it empty, and the relay drops notes that fill it in.
export async function sendFeedback(note: Note, ctx: FeedbackContext, turnstile: string,
  { url = FEEDBACK_URL, fetcher = fetch, website = '' }: { url?: string; fetcher?: typeof fetch; website?: string } = {}): Promise<SendResult> {
  let r: Response;
  try {
    r = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ ...note, ...ctx, turnstile, website }) });
  } catch {
    return { ok: false, error: 'Couldn’t reach the server. Check the connection and try again.' };
  }
  if (r.ok) return { ok: true };
  if (r.status === 429) return { ok: false, error: 'Too many notes in a minute. Try again shortly.' };
  if (r.status === 403) return { ok: false, error: 'The spam check didn’t pass. Try again.' };
  return { ok: false, error: 'Couldn’t send it. Try again later.' };
}

// The unsent note and any notes waiting for a connection survive a reload. localStorage, try/catch as everywhere else.
const valid = (d: unknown): d is Note => !!d && isKind((d as Note).kind) && typeof (d as Note).message === 'string';

export function loadDraft(): Note {
  try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (valid(d)) return d; } catch { /* storage blocked */ }
  return { kind: 'bug', message: '' };
}
export function saveDraft(d: Note) {
  try { if (d.message) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* storage blocked */ }
}
export function loadOutbox(): Note[] {
  try { const l = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); if (Array.isArray(l)) return l.filter(valid); } catch { /* storage blocked */ }
  return [];
}
export function saveOutbox(l: Note[]) {
  try { if (l.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(l)); else localStorage.removeItem(OUTBOX_KEY); } catch { /* storage blocked */ }
}
