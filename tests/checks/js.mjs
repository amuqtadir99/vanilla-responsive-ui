/**
 * JavaScript standards: syntax, ES-module hygiene, XSS-safe DOM APIs and
 * the zero-dependency rule.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SRC, findFiles, read, rel } from '../lib/util.mjs';

export const name = 'JavaScript standards';

const RULES = [
  [/\.innerHTML\s*[+]?=|\.outerHTML\s*=|insertAdjacentHTML\s*\(/, 'xss', 'Use textContent or createElement instead of HTML string injection.'],
  [/document\.write\s*\(/, 'xss', 'document.write is not allowed.'],
  [/\beval\s*\(|new\s+Function\s*\(/, 'xss', 'eval / new Function are not allowed (CSP).'],
  [/setAttribute\(\s*['"](style|on\w+)['"]/, 'csp', 'Setting style or on* attributes breaks a strict CSP; use classes, style.setProperty or addEventListener.'],
  [/(^|[^.\w])var\s+\w/, 'modern-syntax', 'Use const or let instead of var.'],
  [/(^|[^.\w$])(window|globalThis|self)\.[A-Za-z_$][\w$]*\s*=(?!=)/, 'no-globals', 'Do not assign to the global object; export from the module instead.'],
  [/(^|[^\w$.])(jQuery|\$)\s*\(/, 'no-external-deps', 'jQuery-style calls are not allowed; use the core/dom.js helpers.'],
  [/console\.(log|debug)\s*\(/, 'no-console', 'Remove console.log/debug before committing (console.error is fine).'],
];

function stripCommentsAndStrings(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\])\/\/.*$/gm, (m, p) => p + ' '.repeat(m.length - p.length));
}

export function run(report) {
  const files = findFiles(SRC, (n) => n.endsWith('.js') || n.endsWith('.mjs'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vrui-js-'));

  try {
    for (const file of files) {
      const source = read(file);
      const code = stripCommentsAndStrings(source);

      /* ---- Syntax (as an ES module) ---------------------------------- */
      const copy = path.join(tmp, `${rel(file).replace(/[\\/]/g, '__')}.mjs`);
      fs.writeFileSync(copy, source);
      const result = spawnSync(process.execPath, ['--check', copy], { encoding: 'utf8' });
      report.assert(result.status === 0, file, null, 'syntax', `Syntax error: ${(result.stderr || '').split('\n').slice(0, 5).join(' ').trim()}`);

      /* ---- Banned patterns ------------------------------------------- */
      code.split('\n').forEach((lineText, index) => {
        for (const [re, rule, message] of RULES) {
          if (re.test(lineText)) report.error(file, index + 1, rule, message);
        }
      });

      /* ---- Imports must be relative ES modules ---------------------- */
      for (const m of code.matchAll(/(?:import\s[^'"]*from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
        const spec = m[1];
        const line = code.slice(0, m.index).split('\n').length;
        if (!spec.startsWith('./') && !spec.startsWith('../')) {
          report.error(file, line, 'no-external-deps', `Import "${spec}" must be a relative path (no packages or URLs).`);
          continue;
        }
        const target = path.resolve(path.dirname(file), spec);
        report.assert(fs.existsSync(target), file, line, 'import-path', `Import "${spec}" does not resolve.`);
      }
      if (/\brequire\s*\(/.test(code)) report.error(file, null, 'esm-only', 'Use ES module imports instead of require().');

      /* ---- Component contract ---------------------------------------- */
      if (rel(file).startsWith('src/assets/js/components/')) {
        report.assert(/export\s+function\s+init\s*\(/.test(code), file, null, 'component-contract', 'Component modules must export init(root).');
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return files.length;
}
