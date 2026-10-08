#!/usr/bin/env node
/**
 * Zero-dependency test runner for vanilla-responsive-ui.
 *
 *   node tests/run-all.mjs                    run every static check
 *   node tests/run-all.mjs --only html,css    run selected suites
 *   node tests/run-all.mjs --strict           treat warnings as errors
 *
 * Suites: html, a11y, css, js, contrast, docs
 * Browser tests (Playwright, optional) live in tests/browser/smoke.mjs.
 */
import * as html from './checks/html.mjs';
import * as a11y from './checks/a11y.mjs';
import * as css from './checks/css.mjs';
import * as js from './checks/js.mjs';
import * as contrast from './checks/contrast.mjs';
import * as docs from './checks/docs.mjs';
import { Reporter } from './lib/util.mjs';

const SUITES = { html, a11y, css, js, contrast, docs };

const args = process.argv.slice(2);
const onlyIndex = args.indexOf('--only');
const only = onlyIndex !== -1 ? (args[onlyIndex + 1] || '').split(',').filter(Boolean) : Object.keys(SUITES);
const strict = args.includes('--strict');

const unknown = only.filter((s) => !SUITES[s]);
if (unknown.length) {
  console.error(`Unknown suite(s): ${unknown.join(', ')}. Available: ${Object.keys(SUITES).join(', ')}`);
  process.exit(2);
}

let errors = 0;
let warnings = 0;
for (const key of only) {
  const suite = SUITES[key];
  const report = new Reporter();
  try {
    suite.run(report);
  } catch (error) {
    report.error('tests/run-all.mjs', null, 'crash', `${key} suite crashed: ${error.stack || error}`);
  }
  report.print(suite.name);
  errors += report.errors.length;
  warnings += report.warnings.length;
}

const failed = errors > 0 || (strict && warnings > 0);
console.log(`\n${failed ? '✗ FAILED' : '✓ PASSED'}: ${errors} errors, ${warnings} warnings${strict ? ' (strict)' : ''}`);
process.exit(failed ? 1 : 0);
