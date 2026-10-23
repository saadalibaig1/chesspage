// Timezone → ISO country for the zones most people actually run in.
// Packed as "ISO:Zone,Zone|ISO:Zone" to stay small.
const PACKED =
  'US:America/New_York,America/Chicago,America/Denver,America/Los_Angeles,America/Phoenix,America/Anchorage,America/Detroit,America/Indiana/Indianapolis,America/Boise,Pacific/Honolulu' +
  '|CA:America/Toronto,America/Vancouver,America/Edmonton,America/Winnipeg,America/Halifax,America/St_Johns,America/Regina' +
  '|MX:America/Mexico_City,America/Monterrey,America/Tijuana,America/Cancun|BR:America/Sao_Paulo,America/Fortaleza,America/Manaus,America/Recife,America/Bahia' +
  '|AR:America/Argentina/Buenos_Aires,America/Buenos_Aires|CL:America/Santiago|CO:America/Bogota|PE:America/Lima|VE:America/Caracas|UY:America/Montevideo|CU:America/Havana' +
  '|GB:Europe/London|IE:Europe/Dublin|FR:Europe/Paris|DE:Europe/Berlin|ES:Europe/Madrid,Atlantic/Canary|PT:Europe/Lisbon|IT:Europe/Rome|NL:Europe/Amsterdam|BE:Europe/Brussels' +
  '|CH:Europe/Zurich|AT:Europe/Vienna|PL:Europe/Warsaw|CZ:Europe/Prague|SK:Europe/Bratislava|HU:Europe/Budapest|RO:Europe/Bucharest|BG:Europe/Sofia|GR:Europe/Athens' +
  '|SE:Europe/Stockholm|NO:Europe/Oslo|DK:Europe/Copenhagen|FI:Europe/Helsinki|IS:Atlantic/Reykjavik|EE:Europe/Tallinn|LV:Europe/Riga|LT:Europe/Vilnius' +
  '|UA:Europe/Kyiv,Europe/Kiev|BY:Europe/Minsk|RU:Europe/Moscow,Europe/Samara,Asia/Yekaterinburg,Asia/Novosibirsk,Asia/Krasnoyarsk,Asia/Irkutsk,Asia/Vladivostok' +
  '|RS:Europe/Belgrade|HR:Europe/Zagreb|SI:Europe/Ljubljana|BA:Europe/Sarajevo|AM:Asia/Yerevan|GE:Asia/Tbilisi|AZ:Asia/Baku|TR:Europe/Istanbul' +
  '|IL:Asia/Jerusalem,Asia/Tel_Aviv|AE:Asia/Dubai|SA:Asia/Riyadh|QA:Asia/Qatar|KW:Asia/Kuwait|IR:Asia/Tehran|IQ:Asia/Baghdad|EG:Africa/Cairo' +
  '|PK:Asia/Karachi|IN:Asia/Kolkata,Asia/Calcutta|BD:Asia/Dhaka|LK:Asia/Colombo|NP:Asia/Kathmandu|AF:Asia/Kabul|UZ:Asia/Tashkent|KZ:Asia/Almaty' +
  '|CN:Asia/Shanghai,Asia/Urumqi|HK:Asia/Hong_Kong|TW:Asia/Taipei|JP:Asia/Tokyo|KR:Asia/Seoul|MN:Asia/Ulaanbaatar|SG:Asia/Singapore|MY:Asia/Kuala_Lumpur' +
  '|ID:Asia/Jakarta,Asia/Makassar|PH:Asia/Manila|TH:Asia/Bangkok|VN:Asia/Ho_Chi_Minh,Asia/Saigon|AU:Australia/Sydney,Australia/Melbourne,Australia/Brisbane,Australia/Perth,Australia/Adelaide,Australia/Hobart' +
  '|NZ:Pacific/Auckland|ZA:Africa/Johannesburg|NG:Africa/Lagos|KE:Africa/Nairobi|MA:Africa/Casablanca|DZ:Africa/Algiers|TN:Africa/Tunis|GH:Africa/Accra|ET:Africa/Addis_Ababa';

const TZ: Record<string, string> = {};
for (const group of PACKED.split('|')) {
  const [iso, zones] = group.split(':');
  for (const z of zones.split(',')) TZ[z] = iso;
}

export function detectCountry(
  tz = Intl.DateTimeFormat().resolvedOptions().timeZone,
  lang = typeof navigator === 'undefined' ? '' : navigator.language,
): string {
  if (TZ[tz]) return TZ[tz];
  const region = lang.split('-').slice(1).reverse().find((t) => /^[A-Z]{2}$/i.test(t));
  return region ? region.toUpperCase() : 'WW';
}

export function flag(iso: string): string {
  if (iso === 'WW') return '🌍';
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

let names: Intl.DisplayNames | null = null;
export function countryName(iso: string): string {
  if (iso === 'WW') return 'Worldwide';
  try {
    names ??= new Intl.DisplayNames(['en'], { type: 'region' }); // missing before Safari 14.1
    return names.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

export const ALL_COUNTRIES = [...new Set(Object.values(TZ))].sort((a, b) => countryName(a).localeCompare(countryName(b)));
