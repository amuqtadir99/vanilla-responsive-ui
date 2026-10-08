/**
 * CSS standards: syntax sanity, design-token discipline, focus visibility
 * and the zero-dependency rule.
 */
import path from 'node:path';
import { SRC, findFiles, read, rel } from '../lib/util.mjs';

export const name = 'CSS standards';

const TOKENS_FILE = path.join(SRC, 'assets', 'css', 'tokens.css');
// Only these files may use !important (utility classes that must win).
const IMPORTANT_ALLOWED = new Set(['src/assets/css/base.css']);

function stripComments(css) {
  // Keep line breaks so reported line numbers stay accurate.
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** Yield { selector, body, line } for each rule (flattening at-rules). */
function* rules(css) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    yield { selector: m[1].trim(), body: m[2], line: lineOf(css, m.index + m[0].indexOf(m[1].trim())) };
  }
}

export function run(report) {
  const cssFiles = findFiles(SRC, (n) => n.endsWith('.css'));
  const htmlFiles = findFiles(SRC, (n) => n.endsWith('.html'));
  const htmlSources = htmlFiles.map(read).join('\n');

  // Every custom property declared anywhere in the design system.
  const declared = new Set();
  const sources = new Map();
  for (const file of cssFiles) {
    const css = stripComments(read(file));
    sources.set(file, css);
    for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
  }
  // Properties set from JavaScript (style.setProperty).
  declared.add('--value');

  for (const file of cssFiles) {
    const raw = read(file);
    const css = sources.get(file);
    const name = rel(file);

    /* ---- Syntax sanity ------------------------------------------------ */
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    report.assert(opens === closes, file, null, 'syntax', `Unbalanced braces ({ ${opens} vs } ${closes}).`);
    report.assert((raw.match(/\/\*/g) || []).length === (raw.match(/\*\//g) || []).length, file, null, 'syntax', 'Unclosed comment.');

    /* ---- No external imports / fonts --------------------------------- */
    for (const m of css.matchAll(/@import[^;]*;|url\(\s*['"]?(https?:)?\/\/[^)]*\)/g)) {
      report.error(file, lineOf(css, m.index), 'no-external-deps', `External or chained import "${m[0].slice(0, 60)}" is not allowed.`);
    }

    /* ---- Design tokens ------------------------------------------------ */
    if (file !== TOKENS_FILE) {
      for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch|lab|lch)\(/g)) {
        report.error(file, lineOf(css, m.index), 'design-tokens', `Hard-coded colour "${m[0]}"; use a token from tokens.css.`);
      }
      for (const m of css.matchAll(/font-size\s*:\s*\d+(\.\d+)?px/g)) {
        report.error(file, lineOf(css, m.index), 'relative-units', 'Use rem or a --font-size-* token instead of px for font-size (WCAG 1.4.4).');
      }
    }

    for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
      if (!m[2] && !declared.has(m[1])) {
        report.error(file, lineOf(css, m.index), 'undefined-token', `${m[1]} is not declared anywhere.`);
      } else report.pass();
    }

    /* ---- !important discipline --------------------------------------- */
    if (!IMPORTANT_ALLOWED.has(name)) {
      for (const m of css.matchAll(/!important/g)) {
        report.error(file, lineOf(css, m.index), 'no-important', '!important is reserved for base.css utilities.');
      }
    }

    /* ---- Focus must stay visible ------------------------------------- */
    for (const rule of rules(css)) {
      if (/outline\s*:\s*(none|0)\b/.test(rule.body)) {
        const ok = /focus-visible|tabindex="-1"/.test(rule.selector);
        report.assert(ok, file, rule.line, 'focus-visible', `"${rule.selector}" removes the outline without a :focus-visible replacement.`);
      }
    }

    /* ---- Layout: no floats or tables for layout ---------------------- */
    for (const m of css.matchAll(/\bfloat\s*:\s*(left|right)/g)) {
      report.error(file, lineOf(css, m.index), 'modern-layout', 'Use Flexbox or Grid instead of float for layout.');
    }

    /* ---- Orphans ------------------------------------------------------ */
    const basename = path.basename(file);
    if (!htmlSources.includes(basename)) {
      report.warn(file, null, 'orphan', 'Stylesheet is not referenced by any HTML file.');
    }
  }

  /* ---- Theme parity: system-dark and explicit-dark blocks must match --- */
  const tokens = sources.get(TOKENS_FILE) || '';
  const block = (re) => {
    const m = tokens.match(re);
    return m ? m[1].replace(/\s+/g, ' ').replace(/color-scheme:\s*dark;\s*/, '').trim() : null;
  };
  const systemDark = block(/:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/);
  const explicitDark = block(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
  report.assert(systemDark && systemDark === explicitDark, TOKENS_FILE, null, 'theme-parity', 'The prefers-color-scheme dark block and :root[data-theme="dark"] block must define identical tokens.');

  return cssFiles.length;
}
