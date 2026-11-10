// ISO 3166-1 alpha-2 codes.
const CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
  'DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT ' +
  'JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG ' +
  'NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH ' +
  'TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW';

const SET = new Set(CODES.split(' '));

export const isCountry = (code: string) => SET.has(code);

export const flag = (code: string) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

let names: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  try {
    names ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every country code, sorted by English name. */
export const COUNTRIES = [...SET].sort((a, b) => countryName(a).localeCompare(countryName(b)));

const plain = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Countries matching the typed text: exact code, then names that start with it, then a word that does, then any match. */
export function searchCountries(text: string): string[] {
  const q = plain(text.trim());
  if (!q) return COUNTRIES;
  const score = (c: string) => {
    const name = plain(countryName(c));
    if (c.toLowerCase() === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.split(/[\s(&.-]+/).some((w) => w.startsWith(q))) return 2;
    return name.includes(q) ? 3 : 9;
  };
  return COUNTRIES.map((c) => [c, score(c)] as const)
    .filter(([, s]) => s < 9)
    .sort((a, b) => a[1] - b[1])
    .map(([c]) => c);
}
