// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see src/lib/feedback.ts and CLAUDE.md).
import { useEffect, useRef, useState } from 'preact/hooks';
import { FEEDBACK_MAX, KINDS, type FeedbackContext } from '../lib/feedbackIssue';
import { FEEDBACK_URL, TURNSTILE_SITE_KEY, feedbackEnabled, feedbackUrl, loadDraft, loadOutbox, saveDraft, saveOutbox, sendFeedback, type Note } from '../lib/feedback';
import { useOnline } from '../lib/online';

const context = (): FeedbackContext => ({
  version: __APP_VERSION__,
  builtAt: __BUILT_AT__,
  screen: `${window.innerWidth}×${window.innerHeight}`,
  standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false
});

export function Feedback() {
  if (!feedbackEnabled()) return null;
  return (
    <section data-testid="feedback">
      <h2>Feedback</h2>
      <div class="card">{FEEDBACK_URL ? <RelayForm /> : <LinkForm />}</div>
    </section>
  );
}

function useDraft() {
  const [draft, setDraft] = useState(loadDraft);
  const edit = (p: Partial<Note>) => { const d = { ...draft, ...p }; setDraft(d); saveDraft(d); };
  return [draft, edit] as const;
}

function Fields({ draft, edit }: { draft: Note; edit: (p: Partial<Note>) => void }) {
  return (
    <>
      <div class="seg" role="group" aria-label="Kind of feedback">
        {KINDS.map((k) => <button key={k.id} aria-pressed={draft.kind === k.id} onClick={() => edit({ kind: k.id })}>{k.label}</button>)}
      </div>
      <label class="field"><span>What happened?</span>
        <textarea rows={4} maxLength={FEEDBACK_MAX} value={draft.message} placeholder="One thing per note"
          onInput={(e) => edit({ message: e.currentTarget.value })} /></label>
      <p class="small faint">Notes are posted publicly. Leave out names, booking numbers and prices.</p>
    </>
  );
}

// ---- Relay: type, tap Send, done. Notes written offline wait here and go out once the phone is online. ----

interface Turnstile { render(el: HTMLElement, o: Record<string, unknown>): string; reset(id: string): void; remove(id: string): void }
declare global { interface Window { turnstile?: Turnstile } }

let turnstileScript: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  turnstileScript ??= new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => { turnstileScript = null; s.remove(); fail(new Error('turnstile')); };
    document.head.appendChild(s);
  });
  return turnstileScript;
}

// Cloudflare's spam check. It stays invisible unless it needs a tap. Token: '' with no site key, null while waiting.
function useTurnstile(online: boolean) {
  const el = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(TURNSTILE_SITE_KEY ? null : '');
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !online || id.current) return;
    let live = true;
    loadTurnstile().then(() => {
      if (!live || !el.current || !window.turnstile) return;
      id.current = window.turnstile.render(el.current, {
        sitekey: TURNSTILE_SITE_KEY, appearance: 'interaction-only', size: 'flexible', theme: 'auto',
        callback: (t: string) => setToken(t), 'expired-callback': () => setToken(null), 'error-callback': () => setToken(null)
      });
    }).catch(() => { /* offline or blocked: tries again when back online */ });
    return () => { live = false; };
  }, [online]);
  useEffect(() => () => { if (id.current) window.turnstile?.remove(id.current); }, []);
  // Each token works once, so ask for a fresh one after every send.
  const reset = () => { if (TURNSTILE_SITE_KEY && id.current) { setToken(null); window.turnstile?.reset(id.current); } };
  return { el, token, reset };
}

function RelayForm() {
  const online = useOnline();
  const [draft, edit] = useDraft();
  const [outbox, setOutbox] = useState(loadOutbox);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const trap = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const ts = useTurnstile(online);

  const send = () => {
    const l = [...outbox, { kind: draft.kind, message: draft.message.trim() }];
    setOutbox(l); saveOutbox(l); edit({ message: '' }); setSent(false); setError('');
  };

  useEffect(() => {
    if (!online || ts.token === null || !outbox.length || error || busy.current) return;
    busy.current = true;
    sendFeedback(outbox[0], context(), ts.token, { website: trap.current?.value }).then((r) => {
      busy.current = false;
      ts.reset();
      if (r.ok) { setOutbox((l) => { const rest = l.slice(1); saveOutbox(rest); return rest; }); setSent(true); }
      else setError(r.error);
    });
  }, [online, ts.token, outbox, error]);

  const n = outbox.length;
  return (
    <>
      <p class="small muted" style="margin-top:0">Tell us what broke or what to add.</p>
      <Fields draft={draft} edit={edit} />
      <input ref={trap} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px" />
      <div ref={ts.el} />
      <button class="btn primary block" disabled={!draft.message.trim()} onClick={send}>Send</button>
      <div role="status" class="small muted" style="margin-top:8px">
        {error ? <>{error} Your note is saved.<button class="btn block" style="margin-top:8px" onClick={() => setError('')}>Try again</button></>
          : n && !online ? `Saved. ${n} note${n > 1 ? 's' : ''} waiting to send. ${n > 1 ? 'They go' : 'It goes'} out when you’re back online with this page open.`
          : n ? 'Sending…'
          : sent ? 'Sent ✓ Thanks!' : ''}
      </div>
    </>
  );
}

// ---- Fallback with no relay configured: a prefilled GitHub "new issue" link. ----

function LinkForm() {
  const online = useOnline();
  const [draft, edit] = useDraft();
  const [sent, setSent] = useState(false);
  const ready = draft.message.trim().length > 0;
  return (
    <>
      <p class="small muted" style="margin-top:0">Tell us what broke or what to add. It opens a GitHub issue for you to submit.</p>
      <Fields draft={draft} edit={(p) => { edit(p); setSent(false); }} />
      {online && ready
        ? <a class="btn primary block" href={feedbackUrl(draft.kind, draft.message, context())} target="_blank" rel="noopener"
            onClick={() => { setSent(true); edit({ message: '' }); }}>Open on GitHub</a>
        : <button class="btn primary block" disabled>Open on GitHub</button>}
      {!online && <p class="small muted">You’re offline. Your note is saved here; send it once you’re back online.</p>}
      {sent && <p class="small muted" role="status">Opened GitHub. Tap Submit there to post it. You need a GitHub account.</p>}
    </>
  );
}
