// PUBLIC REPO ONLY. Do not copy this file (or src/components/Feedback.tsx, or tests/unit/feedback.test.ts)
// into japan-trip-tools. Feedback becomes a public issue on japan-trip-tools-public; in the private app it
// would publish real trip details. See "Public-only features" in CLAUDE.md.
//
// No token or backend: the form builds a prefilled GitHub "new issue" link, and the person taps Submit there.
export const FEEDBACK_REPO = 'mdigirol/japan-trip-tools-public';
export const FEEDBACK_MAX = 1500;   // keeps the issue link well under URL length limits

// Second guard if the code gets copied anyway: the form only shows in a build served from this repo's path.
export const feedbackEnabled = (base: string = import.meta.env.BASE_URL): boolean => base === '/japan-trip-tools-public/';

export type FeedbackKind = 'bug' | 'idea' | 'content';
export const KINDS: { id: FeedbackKind; label: string; issueLabel: string }[] = [
  { id: 'bug', label: 'Bug', issueLabel: 'bug' },
  { id: 'idea', label: 'Idea', issueLabel: 'enhancement' },
  { id: 'content', label: 'Wrong info', issueLabel: 'content' }
];

export interface FeedbackContext { version: string; builtAt: string; screen: string; standalone: boolean }

export function feedbackTitle(message: string): string {
  const first = message.trim().split('\n')[0].trim().replace(/\s+/g, ' ');
  return `Feedback: ${first.length > 60 ? `${first.slice(0, 59)}…` : first}`;
}

export function feedbackBody(kind: FeedbackKind, message: string, ctx: FeedbackContext): string {
  const k = KINDS.find((x) => x.id === kind)!;
  return [
    message.trim().slice(0, FEEDBACK_MAX),
    '',
    '---',
    `Kind: ${k.label}`,
    `App: ${ctx.version} · built ${ctx.builtAt}`,
    `Screen: ${ctx.screen}${ctx.standalone ? ' · home screen app' : ''}`,
    '',
    '_Sent from the in-app feedback form._'
  ].join('\n');
}

// Labels only stick when the submitter can triage the repo; GitHub ignores them otherwise.
export function feedbackUrl(kind: FeedbackKind, message: string, ctx: FeedbackContext, repo: string = FEEDBACK_REPO): string {
  const k = KINDS.find((x) => x.id === kind)!;
  const q = new URLSearchParams({ title: feedbackTitle(message), body: feedbackBody(kind, message, ctx), labels: `feedback,${k.issueLabel}` });
  return `https://github.com/${repo}/issues/new?${q.toString()}`;
}

// The unsent note survives a reload or going offline. localStorage, try/catch as everywhere else.
const DRAFT_KEY = 'jtc-feedback-draft-v1';
export function loadDraft(): { kind: FeedbackKind; message: string } {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (d && KINDS.some((k) => k.id === d.kind) && typeof d.message === 'string') return d;
  } catch { /* storage blocked */ }
  return { kind: 'bug', message: '' };
}
export function saveDraft(d: { kind: FeedbackKind; message: string }) {
  try { if (d.message) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* storage blocked */ }
}
