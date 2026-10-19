# Feedback relay (Cloudflare Worker)

**Public repo only.** Don't copy this folder into `japan-trip-tools` (see "Public-only features" in `CLAUDE.md`).

The feedback form at the bottom of **More** posts each note here. The Worker checks it and files an issue on `mdigirol/japan-trip-tools-public`, labeled `feedback` plus `bug`, `enhancement` or `content`. Issues show the token owner as the author. Testers never see GitHub.

What it checks, in order:

1. The request comes from `ALLOWED_ORIGINS` (the Pages site).
2. No more than 3 notes a minute from one IP address.
3. The hidden spam-trap field is empty.
4. The kind is known and the note is 1–1,500 characters.
5. Cloudflare Turnstile passed (when `TURNSTILE_SECRET` is set).

The GitHub token lives only in Cloudflare as a secret. It's never in this repo, the app or the deploy workflow.

## One-time setup

### 1. GitHub token

At https://github.com/settings/personal-access-tokens/new, create a fine-grained token:

- **Name:** `jtc-feedback`
- **Expiration:** a date after the trip
- **Repository access:** Only select repositories → `japan-trip-tools-public`
- **Permissions → Repository → Issues:** Read and write. Leave everything else at No access.

Keep the page open; you'll paste the token in step 3.

### 2. Turnstile widget

In the Cloudflare dashboard, go to **Turnstile → Add widget**:

- **Widget name:** `Japan trip feedback`
- **Hostname:** `mdigirol.github.io`
- **Widget mode:** Managed

Copy the **site key** (public) and the **secret key**.

### 3. Deploy the Worker

```bash
cd worker/feedback
npx wrangler@4 login
npx wrangler@4 deploy
npx wrangler@4 secret put GITHUB_TOKEN
npx wrangler@4 secret put TURNSTILE_SECRET
```

- `login` opens the browser to sign in to Cloudflare.
- `deploy` prints the Worker's address, like `https://jtc-feedback.<your-subdomain>.workers.dev`. On a first Worker it asks you to pick a `workers.dev` subdomain.
- Each `secret put` asks you to paste a value: the GitHub token, then the Turnstile secret key.

### 4. Point the app at it

Both values are public. Set them as repository variables (not secrets), then redeploy:

```bash
gh variable set FEEDBACK_URL --body "https://jtc-feedback.<your-subdomain>.workers.dev"
gh variable set TURNSTILE_SITE_KEY --body "<site key>"
gh workflow run deploy.yml
```

Without `FEEDBACK_URL`, the form falls back to opening a prefilled GitHub issue.

## Later

- **Change the code or `wrangler.toml`:** run `npx wrangler@4 deploy` again from this folder. Pushing to `main` doesn't deploy the Worker.
- **Token expired:** create a new one (step 1) and run `npx wrangler@4 secret put GITHUB_TOKEN`.
- **Logs:** `npx wrangler@4 tail` shows live requests and errors.
- **Spam getting through:** lower the limit in `wrangler.toml`, or switch the Turnstile widget mode.
