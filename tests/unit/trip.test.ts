// trip.json: schema, shape, and the confidentiality rules for a public repo.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TripFile } from '../../src/data/schema';

const raw = readFileSync(new URL('../../src/data/trip.json', import.meta.url), 'utf8');
const trip = JSON.parse(raw);

describe('trip.json', () => {
  it('passes the strict schema (no keys outside it)', () => {
    const r = TripFile.safeParse(trip);
    if (!r.success) console.error(r.error.issues);
    expect(r.success).toBe(true);
  });

  it('has 17 days, Nov 11–27, and four stays', () => {
    expect(trip.days).toHaveLength(17);
    expect(trip.days[0].date).toBe('2026-11-11');
    expect(trip.days[16].date).toBe('2026-11-27');
    expect(trip.stays.map((s: { id: string }) => s.id)).toEqual(['tokyo-1', 'hakone', 'kyoto', 'tokyo-2']);
  });

  it('has a Japanese postal address for every hotel', () => {
    for (const s of trip.stays) expect(s.addrJa).toMatch(/^〒\d{3}-\d{4} /);
  });


  it('contains no booking numbers, booking words, prices or tokens', () => {
    const banned: [string, RegExp][] = [
      ['long digit run (confirmation number)', /\d{7,}/],
      ['letter+digits code (C260517…)', /\b[A-Z]{1,3}\d{6,}\b/],
      ['control number (E372-style)', /\bE\d{3}\b/],
      ['trip reference (two letters, dash, letters+digits)', /\b[A-Z]{2}-[A-Z]{2}\d+/],
      ['booking words', /\b(Booked|Ticketed|Confirmation|Reservation (number|under)|prepaid)\b/i],
      ['prices', /(\$\s?\d|¥\s?\d|\d\s?yen\b|USD)/i],
      ['tokens', /(github_pat_|ghp_|gho_|AIza[0-9A-Za-z_-]{10,}|sk-[A-Za-z0-9]{10,})/],
      ['emails', /[\w.+-]+@[\w-]+\.[\w.]+/],
      ['clock times', /\b\d{1,2}:\d{2}\s?(AM|PM|a|p)\b/i]
    ];
    const strings: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'string') { if (path !== 'generatedAt') strings.push(v); }
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    };
    walk(trip, '');
    for (const s of strings) for (const [name, re] of banned) expect(re.test(s), `${name}: "${s}"`).toBe(false);
  });

  it('only has hotel front-desk phone numbers', () => {
    const phones = raw.match(/\+81[\d -]+/g) ?? [];
    expect(phones.sort()).toEqual(trip.stays.map((s: { tel: string }) => s.tel).sort());
  });
});
