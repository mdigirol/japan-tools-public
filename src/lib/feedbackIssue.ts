// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see "Public-only features" in CLAUDE.md).
//
// How a feedback note becomes a GitHub issue. Shared by the app (src/lib/feedback.ts) and the relay
// (worker/feedback/src/index.ts), so both build the same title, body and labels.
export const FEEDBACK_REPO = 'mdigirol/japan-trip-tools-public';
export const FEEDBACK_MAX = 1500;   // keeps the fallback issue link well under URL length limits

export type FeedbackKind = 'bug' | 'idea' | 'content';
export const KINDS: { id: FeedbackKind; label: string; issueLabel: string }[] = [
  { id: 'bug', label: 'Bug', issueLabel: 'bug' },
  { id: 'idea', label: 'Idea', issueLabel: 'enhancement' },
  { id: 'content', label: 'Wrong info', issueLabel: 'content' }
];

export const isKind = (k: unknown): k is FeedbackKind => KINDS.some((x) => x.id === k);
export const issueLabels = (kind: FeedbackKind): string[] => ['feedback', KINDS.find((x) => x.id === kind)!.issueLabel];

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
