/**
 * Unit tests for pure functions in the shared modules (no DOM needed).
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SRC } from '../lib/util.mjs';

export const name = 'Unit tests';

const modulePath = (rel) => pathToFileURL(path.join(SRC, 'assets', 'js', rel)).href;

export async function run(report) {
  const file = path.join(SRC, 'assets', 'js', 'core', 'theme.js');
  const { generateBrand, contrast, mix } = await import(modulePath('core/theme.js'));

  report.assert(mix('#000000', '#ffffff', 0.5) === '#808080', file, null, 'mix', 'mix() should blend channels linearly.');
  report.assert(Math.abs(contrast('#000000', '#ffffff') - 21) < 0.01, file, null, 'contrast', 'contrast(black, white) should be 21.');

  // Any input colour must yield an accessible palette in both themes.
  const SAMPLES = ['#2a4fcf', '#ffffff', '#000000', '#ffff00', '#00ff00', '#ff0000', '#00ffff', '#808080', '#f59e0b', '#1e1b4b'];
  const SURFACES = { light: { bg: '#ffffff', surface: '#f5f7fa', text: '#161a21' }, dark: { bg: '#0e1116', surface: '#161a21', text: '#e8ebf0' } };
  for (const hex of SAMPLES) {
    const palette = generateBrand(hex);
    for (const scheme of ['light', 'dark']) {
      const p = palette[scheme];
      const s = SURFACES[scheme];
      const pairs = [
        [p.primary, s.bg, 4.5, 'primary on bg'],
        [p['on-primary'], p.primary, 4.5, 'on-primary on primary'],
        [p.primary, p['primary-soft'], 4.5, 'primary on soft'],
        [p.link, s.bg, 4.5, 'link on bg'],
        [p.link, s.surface, 4.5, 'link on surface'],
        [s.text, p.selection, 4.5, 'text on selection'],
      ];
      for (const [fg, bg, min, label] of pairs) {
        const r = contrast(fg, bg);
        report.assert(r >= min, file, null, 'generate-brand', `generateBrand(${hex}) ${scheme}: ${label} is ${r.toFixed(2)}:1, needs ${min}:1.`);
      }
    }
  }

  let threw = false;
  try {
    generateBrand('red');
  } catch {
    threw = true;
  }
  report.assert(threw, file, null, 'generate-brand', 'generateBrand() must reject values that are not #rrggbb.');

  // Formatting: cached formatters must not leak options between values.
  const formatFile = path.join(SRC, 'assets', 'js', 'core', 'format.js');
  const { formatValue, percentChange } = await import(modulePath('core/format.js'));
  const cases = [
    [249, 'currency', '$249'],
    [6.95, 'currency', '$6.95'],
    [35.8, 'currency', '$35.80'],
    [1234567, 'compact', '1.2M'],
    [48290, 'currency-compact', '$48.3K'],
    [12.345, 'percent', '12.3%'],
    [null, 'number', '—'],
  ];
  for (const [value, format, expected] of cases) {
    const actual = formatValue(value, format, { locale: 'en-US' });
    report.assert(actual === expected, formatFile, null, 'format', `formatValue(${value}, '${format}') returned "${actual}", expected "${expected}".`);
  }
  report.assert(percentChange(110, 100) === 10, formatFile, null, 'format', 'percentChange(110, 100) should be 10.');
  return SAMPLES.length + cases.length + 1;
}
