/**
 * Shared helpers for the test suite: file discovery and result reporting.
 * Zero dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SRC = path.join(ROOT, 'src');

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.cache']);

/** Recursively list files under `dir` whose name matches `test`. */
export function findFiles(dir, test) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (test(entry.name, full)) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

export const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

export function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/** True for a complete document, false for a snippet/fragment. */
export function isFullDocument(source) {
  return /^\s*(<!--[\s\S]*?-->\s*)*<!doctype html>/i.test(source);
}

/** Collects findings and prints a readable report. */
export class Reporter {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = 0;
  }

  /** Count a passed assertion (for the summary). */
  pass() {
    this.checks += 1;
  }

  error(file, line, rule, message) {
    this.checks += 1;
    this.errors.push({ file: rel(file), line, rule, message });
  }

  warn(file, line, rule, message) {
    this.warnings.push({ file: rel(file), line, rule, message });
  }

  /** Assert helper: records an error when `condition` is false. */
  assert(condition, file, line, rule, message) {
    if (condition) this.pass();
    else this.error(file, line, rule, message);
    return condition;
  }

  print(title) {
    const fmt = (f, kind) => `  ${kind} ${f.file}${f.line ? `:${f.line}` : ''}  ${f.message}  [${f.rule}]`;
    const status = this.errors.length ? '✗' : '✓';
    console.log(`\n${status} ${title}: ${this.checks} checks, ${this.errors.length} errors, ${this.warnings.length} warnings`);
    for (const e of this.errors) console.log(fmt(e, 'error  '));
    for (const w of this.warnings) console.log(fmt(w, 'warning'));
  }
}
