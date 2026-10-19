// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see CLAUDE.md, "Public-only features").
// Both apps are served from https://mdigirol.github.io, and browsers scope localStorage, IndexedDB and
// Cache Storage by origin, not path. This prefix keeps the demo from reading or editing the private app's data.
export const STORAGE_PREFIX = 'jtc-public-';

export const SETTINGS_KEY = `${STORAGE_PREFIX}settings-v1`;
export const DB_NAME = `${STORAGE_PREFIX}companion`;
export const FEEDBACK_DRAFT_KEY = `${STORAGE_PREFIX}feedback-draft-v1`;
export const FEEDBACK_OUTBOX_KEY = `${STORAGE_PREFIX}feedback-outbox-v1`;
export const runtimeCacheName = (name: string) => `${STORAGE_PREFIX}${name}`;
