// What the narrator actually says, when the printed word would come out wrong.
//
// The voice reads through espeak-ng's British English, which says 1891 as "one thousand eight hundred
// and ninety one", "Kobe" as one syllable and "sequoia" as "SEK-woy-a". Each respelling here was
// checked against the phonemes the voice produces (tools/README.md, "Checking a pronunciation").
// The printed guide always shows the real word; only the recording uses the respelling.
// test/say-as.test.mjs fails if a year or any word below reaches the voice unrespelled.

export const RESPELL = [
  // word as printed, what the voice is given, why
  ['T. rex', 'T-rex', 'the full stop would make the voice pause as if a sentence had ended'],
  ['Kobe', 'Kobay', 'the city: KOH-bay, not one syllable'],
  ['Nakhla', 'Nakla', 'the Egyptian village the Mars meteorite is named after'],
  ['Iguanodon', 'Igwahnodon', 'ig-WAH-no-don'],
  ['sequoia', 'sikwoya', 'si-KWOY-a'],
  ['Cadogan', 'Kadduggan', 'ka-DUG-an (the script avoids saying it)'],
  ["Gough's", "Goff's", 'Gough\'s Cave, where Cheddar Man was found: GOFF'],
  ['Svante', 'Svanta', 'SVAN-ta'],
  ['Pääbo', 'Pairbo', 'PAIR-bo'],
  ['Chicxulub', 'Cheekshoolube', 'CHEEK-shoo-loob'],
  ['Enigmacursor', 'Enigma cursor', 'e-NIG-ma KUR-sor, not EN-ig-mack'],
  ['Ichthyotitan', 'Ichthyo-titan', 'ICK-thee-oh-TIE-tan, not ick-thee-OT-i-tan'],
  ['Deinonychus', 'Dynonnikus', 'dye-NON-ick-us, not DAY-non-itch-us'],
  ['Dinosauria', 'Dyno-sauria', 'dye-no-SOR-ia, as in dinosaur'],
  ['Lhwyd', 'Lloyd', 'Edward Lhwyd: said like Lloyd, not spelt out letter by letter'],
  ['Türkiye', 'Turkeeyeh', 'TUR-kee-yeh'],
  ['Wollemi', 'Wollem-eye', 'the Wollemi pine: WOL-em-eye'],
  ["a'a", 'ah-hah', 'the Hawaiian lava, two syllables: AH-ah'],
  ['pahoehoe', 'pa-hoy-hoy', 'the Hawaiian lava: pa-HOY-hoy'],
  ["Pele's", "Paylay's", "Pele's hair: PAY-lay, the Hawaiian volcano goddess"],
  ['Sequoyah', 'Sikwoya', 'si-KWOY-a, like the tree'],
];

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// 0 to 99 in words: 0 is "", 7 is "seven", 42 is "forty-two".
function under100(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
}

// A year the way a British narrator says it: 1891 "eighteen ninety-one", 1905 "nineteen oh five",
// 1900 "nineteen hundred", 2004 "two thousand and four", 2017 "twenty seventeen".
export function sayYear(y) {
  if (y >= 2000 && y < 2010) return y === 2000 ? 'two thousand' : `two thousand and ${ONES[y - 2000]}`;
  const hi = Math.floor(y / 100), lo = y % 100;
  if (lo === 0) return `${under100(hi)} hundred`;
  return `${under100(hi)} ${lo < 10 ? `oh ${ONES[lo]}` : under100(lo)}`;
}

// Any free-standing 4-digit number from 1000 to 2099 is read as a year. Numbers written with a comma
// (1,300 years) are not years and are left to the voice, which reads them correctly.
// A decade (the 1930s) is the year in the plural: "nineteen thirties".
const YEAR = /(?<![\d,.])(1\d{3}|20\d{2})(s?)(?![\d,.]\d)/g;
const plural = (w) => (w.endsWith('y') ? `${w.slice(0, -1)}ies` : `${w}s`);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function sayAs(text) {
  let s = text.replace(YEAR, (m, y, pl) => (pl ? plural(sayYear(Number(y))) : sayYear(Number(y))));
  for (const [word, say] of RESPELL) s = s.replace(new RegExp(`\\b${escape(word)}(s?)\\b`, 'g'), `${say}$1`);
  // Typography the voice should not see: curly quotes and the ellipsis character.
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...');
}
