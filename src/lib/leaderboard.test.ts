import { countryName, detectCountry, flag } from './country';
import { COUNTRIES, ranked, simulatedRows, withPlayer } from './leaderboard';

test('detectCountry', () => {
  expect(detectCountry('Asia/Karachi')).toBe('PK');
  expect(detectCountry('America/New_York')).toBe('US');
  expect(detectCountry('Europe/London')).toBe('GB');
  expect(detectCountry('Mars/Base', 'en')).toBe('WW');
  expect(detectCountry('Mars/Base', 'fr-CA')).toBe('CA');
});

test('flag and name', () => {
  expect(flag('PK')).toBe('🇵🇰');
  expect(flag('WW')).toBe('🌍');
  expect(countryName('WW')).toBe('Worldwide');
  expect(countryName('PK')).toBe('Pakistan');
});

test('simulatedRows is stable per day and mode', () => {
  const a = simulatedRows('2026-10-23', 'five');
  expect(a).toEqual(simulatedRows('2026-10-23', 'five'));
  expect(a).not.toEqual(simulatedRows('2026-10-24', 'five'));
  expect(a).not.toEqual(simulatedRows('2026-10-23', 'solo'));
  expect(a.map((r) => r.iso)).toEqual(COUNTRIES);
  for (const r of a) {
    expect(r.winPct).toBeGreaterThanOrEqual(0);
    expect(r.winPct).toBeLessThanOrEqual(100);
    expect(r.avg).toBeGreaterThan(0);
    expect(r.avg).toBeLessThanOrEqual(5);
  }
});

test('withPlayer folds the player into their country', () => {
  const rows = simulatedRows('2026-10-23', 'solo');
  const pk = rows.find((r) => r.iso === 'PK')!;
  const me = withPlayer(rows, 'PK', { won: true, n: 2, grid: [], timeMs: 1 }, 999).find((r) => r.iso === 'PK')!;
  expect(me).toMatchObject({ you: true, players: pk.players + 1, longestStreak: 999 });
  expect(me.winPct).toBeGreaterThanOrEqual(pk.winPct);
  expect(withPlayer(rows, 'PK', null, 0).find((r) => r.iso === 'PK')).toMatchObject({ you: true, players: pk.players });
  expect(withPlayer(rows, 'IS', null, 0).at(-1)).toMatchObject({ iso: 'IS', you: true, players: 0 });
});

test('ranked: win and streak descending; avg depends on mode', () => {
  const rows = simulatedRows('2026-10-23', 'five');
  const w = ranked(rows, 'win', 'five');
  expect(w[0].winPct).toBeGreaterThanOrEqual(w[1].winPct);
  const five = ranked(rows, 'avg', 'five');
  expect(five[0].avg).toBeGreaterThanOrEqual(five[1].avg); // more solved = better
  const solo = ranked(simulatedRows('2026-10-23', 'solo'), 'avg', 'solo');
  expect(solo[0].avg).toBeLessThanOrEqual(solo[1].avg); // fewer tries = better
});

test('detectCountry reads the region from any position in the language tag', () => {
  expect(detectCountry('Mars/Base', 'zh-Hans-CN')).toBe('CN');
  expect(detectCountry('Mars/Base', 'sr-Latn-RS')).toBe('RS');
  expect(detectCountry('Mars/Base', 'zh-Hans')).toBe('WW');
});

test('country module loads and names fall back without Intl.DisplayNames', async () => {
  const orig = Intl.DisplayNames;
  delete (Intl as any).DisplayNames;
  try {
    vi.resetModules();
    const fresh = await import('./country');
    expect(fresh.countryName('FR')).toBe('FR');
    expect(fresh.countryName('WW')).toBe('Worldwide');
  } finally {
    (Intl as any).DisplayNames = orig;
  }
});
