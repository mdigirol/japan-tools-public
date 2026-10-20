import { describe, expect, it } from 'vitest';
import { longDate, parseNowParam, tokyo } from '../../src/lib/now';
import { todayState, weatherCities } from '../../src/lib/trip';

const at = (s: string) => new Date(s);

describe('trip clock', () => {
  it('parses ?now= with an encoded or a literal plus', () => {
    expect(parseNowParam('?now=2026-11-02T08:00%2B09:00')?.toISOString()).toBe('2026-11-01T23:00:00.000Z');
    expect(parseNowParam('?now=2026-11-02T08:00+09:00')?.toISOString()).toBe('2026-11-01T23:00:00.000Z');
    expect(parseNowParam('?x=1')).toBeNull();
  });
  it('uses Tokyo dates', () => {
    expect(tokyo(at('2026-11-01T15:30:00Z')).ymd).toBe('2026-11-02');   // 00:30 JST
    expect(longDate('2026-11-02')).toBe('Mon, Nov 2');
  });
});

describe('todayState', () => {
  const cases: [string, string, string, string | undefined][] = [
    // now (JST), city, primary hotel, checking out
    ['2026-10-23T18:00+09:00', 'Tokyo', 'tokyo-1', undefined],
    ['2026-10-29T10:00+09:00', 'Hakone', 'hakone', 'tokyo-1'],
    ['2026-10-29T16:00+09:00', 'Hakone', 'hakone', undefined],
    ['2026-11-01T09:00+09:00', 'Kyoto', 'kyoto', undefined],
    ['2026-11-07T12:00+09:00', 'Tokyo', 'tokyo-2', undefined],
    ['2026-11-10T08:00+09:00', 'Tokyo', 'tokyo-2', undefined]
  ];
  for (const [when, city, primary, out] of cases) {
    it(`${when} → ${city}, ${primary}${out ? `, checking out of ${out}` : ''}`, () => {
      const s = todayState(at(when));
      expect(s.phase).toBe('during');
      expect(s.city).toBe(city);
      expect(s.primary?.id).toBe(primary);
      expect(s.checkingOut?.id).toBe(out);
    });
  }

  it('switches on Oct 31 and Nov 5 at check-in', () => {
    expect(todayState(at('2026-10-31T09:00+09:00')).checkingOut?.id).toBe('hakone');
    expect(todayState(at('2026-10-31T15:30+09:00')).checkingOut).toBeUndefined();
    expect(todayState(at('2026-11-05T11:00+09:00')).checkingOut?.id).toBe('kyoto');
  });

  it('counts nights in a leg', () => {
    const s = todayState(at('2026-11-02T08:00+09:00'));
    expect(s.leg?.night).toBe(3);
    expect(s.leg?.nights).toBe(5);
    expect(s.dayNumber).toBe(12);
  });

  it('handles the edges', () => {
    const before = todayState(at('2026-10-18T12:00+09:00'));
    expect(before.phase).toBe('before');
    expect(before.daysToGo).toBe(4);
    expect(before.day?.date).toBe('2026-10-23');
    expect(todayState(at('2026-10-22T12:00+09:00')).phase).toBe('air-out');
    const last = todayState(at('2026-11-10T08:00+09:00'));
    expect(last.flightHome).toBe(true);
    expect(todayState(at('2026-11-11T08:00+09:00')).phase).toBe('after');
  });

  it('shows two cities on two-city days', () => {
    const d20 = todayState(at('2026-11-01T09:00+09:00')).day;
    expect(weatherCities(d20).map((c) => c.id)).toEqual(['kyoto', 'osaka']);
    const d25 = todayState(at('2026-11-07T09:00+09:00')).day;
    expect(weatherCities(d25).map((c) => c.id)).toEqual(['tokyo']);
  });
});
