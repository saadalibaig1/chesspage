import { COUNTRIES, countryName, flag, isCountry, searchCountries } from './countries';

describe('countries', () => {
  it('knows ISO codes', () => {
    expect(isCountry('PK')).toBe(true);
    expect(isCountry('US')).toBe(true);
    expect(isCountry('XX')).toBe(false);
    expect(isCountry('pk')).toBe(false);
    expect(COUNTRIES.length).toBeGreaterThan(240);
  });
  it('gives a flag and an English name', () => {
    expect(flag('PK')).toBe('🇵🇰');
    expect(countryName('PK')).toBe('Pakistan');
  });
  it('sorts by name', () => {
    expect(countryName(COUNTRIES[0])).toBe('Afghanistan');
  });
});

describe('searchCountries', () => {
  it('puts names starting with the text first, then other matches, ignoring case and accents', () => {
    const r = searchCountries('p');
    expect(countryName(r[0]).startsWith('P')).toBe(true);
    expect(r).toContain('PK');
    expect(r.slice(0, r.indexOf('PK')).every((c) => countryName(c).startsWith('P'))).toBe(true);
    expect(searchCountries('pak')).toEqual(['PK']);
    expect(searchCountries('aland')[0]).toBe('AX');
    expect(searchCountries('kingdom')).toContain('GB');
  });

  it('matches the code too, and gives every country for empty text', () => {
    expect(searchCountries('us')[0]).toBe('US');
    expect(searchCountries('  ')).toEqual(COUNTRIES);
  });
});
