// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see src/lib/feedback.ts and CLAUDE.md).
import { useState } from 'preact/hooks';
import { FEEDBACK_MAX, KINDS, feedbackEnabled, feedbackUrl, loadDraft, saveDraft, type FeedbackKind } from '../lib/feedback';
import { useOnline } from '../lib/online';

export function Feedback() {
  const online = useOnline();
  const [draft, setDraft] = useState(loadDraft);
  const [sent, setSent] = useState(false);
  if (!feedbackEnabled()) return null;

  const set = (p: Partial<{ kind: FeedbackKind; message: string }>) => {
    const d = { ...draft, ...p };
    setDraft(d); saveDraft(d); setSent(false);
  };
  const ready = draft.message.trim().length > 0;
  const url = ready ? feedbackUrl(draft.kind, draft.message, {
    version: __APP_VERSION__,
    builtAt: __BUILT_AT__,
    screen: `${window.innerWidth}×${window.innerHeight}`,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false
  }) : '';
  const opened = () => { setSent(true); setDraft({ kind: draft.kind, message: '' }); saveDraft({ kind: draft.kind, message: '' }); };

  return (
    <section data-testid="feedback">
      <h2>Feedback</h2>
      <div class="card">
        <p class="small muted" style="margin-top:0">Tell us what broke or what to add. It opens a GitHub issue for you to submit.</p>
        <div class="seg" role="group" aria-label="Kind of feedback">
          {KINDS.map((k) => <button key={k.id} aria-pressed={draft.kind === k.id} onClick={() => set({ kind: k.id })}>{k.label}</button>)}
        </div>
        <label class="field"><span>What happened?</span>
          <textarea rows={4} maxLength={FEEDBACK_MAX} value={draft.message} placeholder="One thing per note"
            onInput={(e) => set({ message: e.currentTarget.value })} /></label>
        <p class="small faint">Issues are public. Leave out names, booking numbers and prices.</p>
        {online && ready
          ? <a class="btn primary block" href={url} target="_blank" rel="noopener" onClick={opened}>Open on GitHub</a>
          : <button class="btn primary block" disabled>Open on GitHub</button>}
        {!online && <p class="small muted">You’re offline. Your note is saved here; send it once you’re back online.</p>}
        {sent && <p class="small muted" role="status">Opened GitHub. Tap Submit there to post it. You need a GitHub account.</p>}
      </div>
    </section>
  );
}
