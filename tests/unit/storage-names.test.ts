// PUBLIC REPO ONLY. Do not copy into japan-trip-tools (see CLAUDE.md, "Public-only features").
// The demo and the private app share an origin, so every storage name here must be unique to the demo.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { DB_NAME, FEEDBACK_DRAFT_KEY, FEEDBACK_OUTBOX_KEY, SETTINGS_KEY, STORAGE_PREFIX, runtimeCacheName } from '../../src/lib/storageNames';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

describe('storage names', () => {
  it('carry the public prefix', () => {
    expect(STORAGE_PREFIX).toBe('jtc-public-');
    for (const name of [SETTINGS_KEY, DB_NAME, FEEDBACK_DRAFT_KEY, FEEDBACK_OUTBOX_KEY, runtimeCacheName('rates')]) {
      expect(name.startsWith(STORAGE_PREFIX), name).toBe(true);
    }
  });

  it('settings are saved under the prefixed key', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v)
    });
    vi.resetModules();
    const { updateSettings } = await import('../../src/lib/settings');
    updateSettings({ who: 'A' });
    expect([...store.keys()]).toEqual([SETTINGS_KEY]);
    vi.unstubAllGlobals();
  });

  it('nothing in src or vite.config.ts names the private app’s storage', () => {
    const old = /'jtc-settings-v1'|'jtc-feedback-(draft|outbox)-v1'|openDB[^(]*\(\s*'companion'|cacheName:\s*'/;
    for (const f of [...files('src'), 'vite.config.ts']) {
      expect(old.test(readFileSync(f, 'utf8')), f).toBe(false);
    }
  });
});
