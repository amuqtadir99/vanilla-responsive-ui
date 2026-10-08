/**
 * Documentation synchronicity (Rule 4): generated docs are current, every
 * required document exists, every page carries the current partials, sample
 * data parses, and every component, module and template is documented.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, SRC, findFiles, read, rel } from '../lib/util.mjs';

export const name = 'Documentation sync';

const REQUIRED_DOCS = [
  'README.md',
  'LICENSE',
  'CLAUDE.md',
  'docs/ARCHITECTURE.md',
  'docs/ACCESSIBILITY.md',
  'docs/SECURITY.md',
  'docs/INTEGRATION_GUIDE.md',
  'docs/COMPONENTS.md',
  'docs/LAYOUTS.md',
  'docs/THEMING.md',
  'docs/DATA.md',
  'docs/AI-CHAT.md',
  'CONTRIBUTING.md',
  'llms.txt',
  'catalog.json',
];

export function run(report) {
  for (const doc of REQUIRED_DOCS) {
    report.assert(fs.existsSync(path.join(ROOT, doc)), path.join(ROOT, doc), null, 'required-doc', `${doc} is missing.`);
  }

  const generator = path.join(ROOT, '.claude', 'skills', 'generate-doc.js');
  const result = spawnSync(process.execPath, [generator, '--check'], { encoding: 'utf8' });
  report.assert(result.status === 0, generator, null, 'generated-docs', `Generated docs are stale or invalid: ${(result.stderr || result.stdout).trim()}`);

  const pages = path.join(ROOT, '.claude', 'skills', 'pages.js');
  const sync = spawnSync(process.execPath, [pages, 'sync', '--check'], { encoding: 'utf8' });
  report.assert(sync.status === 0, pages, null, 'partials-sync', `Pages are out of sync with src/layouts/partials (run: node .claude/skills/pages.js sync): ${(sync.stderr || sync.stdout).trim()}`);

  // Sample data must be valid JSON (charts, grids and assistants load it).
  for (const file of findFiles(path.join(SRC, 'data'), (n) => n.endsWith('.json'))) {
    let ok = true;
    try { JSON.parse(read(file)); } catch { ok = false; }
    report.assert(ok, file, null, 'data-json', `${rel(file)} is not valid JSON.`);
  }

  // Every doc linked from llms.txt exists.
  const llms = path.join(ROOT, 'llms.txt');
  if (fs.existsSync(llms)) {
    for (const [, target] of read(llms).matchAll(/\]\(([^)#\s]+)[^)]*\)/g)) {
      if (/^[a-z]+:/i.test(target)) continue;
      report.assert(fs.existsSync(path.join(ROOT, target)), llms, null, 'llms-link', `llms.txt links to missing ${target}.`);
    }
  }

  const allDocs = ['README.md', 'docs/ARCHITECTURE.md', 'docs/INTEGRATION_GUIDE.md', 'docs/COMPONENTS.md']
    .filter((d) => fs.existsSync(path.join(ROOT, d)))
    .map((d) => read(path.join(ROOT, d)))
    .join('\n');

  // Every JS module is documented somewhere.
  for (const file of findFiles(path.join(SRC, 'assets', 'js'), (n) => n.endsWith('.js'))) {
    const base = path.basename(file);
    report.assert(allDocs.includes(base), file, null, 'module-documented', `${rel(file)} is not mentioned in README.md or docs/.`);
  }

  // Every template folder is covered by the README and the integration guide.
  const integration = fs.existsSync(path.join(ROOT, 'docs/INTEGRATION_GUIDE.md')) ? read(path.join(ROOT, 'docs/INTEGRATION_GUIDE.md')) : '';
  const readme = fs.existsSync(path.join(ROOT, 'README.md')) ? read(path.join(ROOT, 'README.md')) : '';
  const templatesDir = path.join(SRC, 'templates');
  for (const entry of fs.readdirSync(templatesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(templatesDir, entry.name);
    report.assert(readme.includes(`templates/${entry.name}`), dir, null, 'template-documented', `README.md does not list templates/${entry.name}.`);
    report.assert(integration.includes(entry.name), dir, null, 'template-documented', `INTEGRATION_GUIDE.md does not mention the ${entry.name} template.`);
  }

  return REQUIRED_DOCS.length;
}
