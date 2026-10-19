// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see CLAUDE.md, "Public-only features").
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_MAX, feedbackBody, feedbackEnabled, feedbackTitle, feedbackUrl } from '../../src/lib/feedback';

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

  it('builds a prefilled new-issue link on this repo', () => {
    const u = new URL(feedbackUrl('bug', 'Cards page is blank', ctx));
    expect(`${u.origin}${u.pathname}`).toBe('https://github.com/mdigirol/japan-trip-tools-public/issues/new');
    expect(u.searchParams.get('title')).toBe('Feedback: Cards page is blank');
    expect(u.searchParams.get('labels')).toBe('feedback,bug');
    expect(u.searchParams.get('body')).toContain('Cards page is blank');
  });

  it('stays under a safe URL length at the maximum English message size', () => {
    expect(feedbackUrl('content', 'word, '.repeat(FEEDBACK_MAX / 6), ctx).length).toBeLessThan(8000);
  });
});
