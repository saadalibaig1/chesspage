import { COUNTRIES, countryName, flag, isCountry } from './countries';

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
