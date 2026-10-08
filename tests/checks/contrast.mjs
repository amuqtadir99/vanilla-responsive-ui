/**
 * Colour contrast of design-token pairs, in both themes (WCAG 1.4.3 text
 * 4.5:1, WCAG 1.4.11 non-text UI 3:1). Reads values straight from tokens.css,
 * so re-theming is verified automatically.
 */
import path from 'node:path';
import { SRC, read } from '../lib/util.mjs';

export const name = 'Colour contrast';

const TOKENS_FILE = path.join(SRC, 'assets', 'css', 'tokens.css');

// [foreground, background, minimum ratio, where it is used]
const PAIRS = [
  ['--color-text', '--color-bg', 4.5, 'body text'],
  ['--color-text', '--color-surface', 4.5, 'text on surface'],
  ['--color-text', '--color-surface-raised', 4.5, 'text on cards'],
  ['--color-text', '--color-surface-sunken', 4.5, 'text on hover states'],
  ['--color-text-muted', '--color-bg', 4.5, 'secondary text'],
  ['--color-text-muted', '--color-surface', 4.5, 'secondary text on surface'],
  ['--color-text-muted', '--color-surface-raised', 4.5, 'secondary text on cards'],
  ['--color-text-muted', '--color-surface-sunken', 4.5, 'neutral badge'],
  ['--color-link', '--color-bg', 4.5, 'links'],
  ['--color-link', '--color-surface', 4.5, 'links on surface'],
  ['--color-primary', '--color-bg', 4.5, 'primary text (eyebrow, active tab)'],
  ['--color-primary', '--color-primary-soft', 4.5, 'primary badge, current nav item'],
  ['--color-on-primary', '--color-primary', 4.5, 'primary button'],
  ['--color-on-primary', '--color-primary-hover', 4.5, 'primary button hover'],
  ['--color-bg', '--color-danger', 4.5, 'danger button'],
  ['--color-danger', '--color-bg', 4.5, 'error messages'],
  ['--color-success', '--color-success-soft', 4.5, 'success badge'],
  ['--color-warning', '--color-warning-soft', 4.5, 'warning badge'],
  ['--color-danger', '--color-danger-soft', 4.5, 'danger badge'],
  ['--color-info', '--color-info-soft', 4.5, 'info text'],
  ['--color-text', '--color-success-soft', 4.5, 'success alert body'],
  ['--color-text', '--color-warning-soft', 4.5, 'warning alert body'],
  ['--color-text', '--color-danger-soft', 4.5, 'danger alert body'],
  ['--color-text', '--color-info-soft', 4.5, 'info alert body'],
  ['--color-text', '--color-primary-soft', 4.5, 'table chart bars'],
  ['--color-text', '--color-selection', 4.5, 'selected text'],
  ['--color-border-strong', '--color-bg', 3, 'form control borders'],
  ['--color-border-strong', '--color-surface-raised', 3, 'form control borders on cards'],
  ['--color-focus', '--color-bg', 3, 'focus ring'],
  ['--color-focus', '--color-surface', 3, 'focus ring on surface'],
  ['--color-warning', '--color-surface-raised', 3, 'rating stars'],
];

function parseBlock(body) {
  const tokens = {};
  for (const m of body.matchAll(/(--color-[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) tokens[m[1]] = m[2];
  return tokens;
}

function luminance(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function run(report) {
  const css = read(TOKENS_FILE).replace(/\/\*[\s\S]*?\*\//g, '');
  const light = parseBlock(css.match(/:root\s*\{([^}]*)\}/)[1]);
  const darkMatch = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
  const themes = { light, dark: { ...light, ...(darkMatch ? parseBlock(darkMatch[1]) : {}) } };

  for (const [theme, tokens] of Object.entries(themes)) {
    for (const [fg, bg, min, usage] of PAIRS) {
      if (!tokens[fg] || !tokens[bg]) {
        report.error(TOKENS_FILE, null, 'contrast', `[${theme}] ${fg} or ${bg} is missing or not a hex value.`);
        continue;
      }
      const r = ratio(tokens[fg], tokens[bg]);
      report.assert(r >= min, TOKENS_FILE, null, 'contrast', `[${theme}] ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1 (${usage}).`);
    }
  }
  return PAIRS.length * 2;
}
