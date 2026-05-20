// ISO 3166-1 numeric code → our internal iso_code (alpha-2)
// Only countries we care about (EU27 + a handful of peers).

export const NUMERIC_TO_ISO: Record<number, string> = {
  40:  'AT', // Austria
  56:  'BE', // Belgium
  100: 'BG', // Bulgaria
  191: 'HR', // Croatia
  196: 'CY', // Cyprus
  203: 'CZ', // Czech Republic
  208: 'DK', // Denmark
  233: 'EE', // Estonia
  246: 'FI', // Finland
  250: 'FR', // France
  276: 'DE', // Germany
  300: 'GR', // Greece
  348: 'HU', // Hungary
  372: 'IE', // Ireland
  380: 'IT', // Italy
  428: 'LV', // Latvia
  440: 'LT', // Lithuania
  442: 'LU', // Luxembourg
  470: 'MT', // Malta
  528: 'NL', // Netherlands
  616: 'PL', // Poland
  620: 'PT', // Portugal
  642: 'RO', // Romania
  703: 'SK', // Slovakia
  705: 'SI', // Slovenia
  724: 'ES', // Spain
  752: 'SE', // Sweden
  // Comparators
  826: 'GB', // United Kingdom
  840: 'US', // United States
  756: 'CH', // Switzerland
  578: 'NO', // Norway
};

export const EU_NUMERICS = new Set<number>([
  40, 56, 100, 191, 196, 203, 208, 233, 246, 250, 276, 300, 348, 372,
  380, 428, 440, 442, 470, 528, 616, 620, 642, 703, 705, 724, 752,
]);
