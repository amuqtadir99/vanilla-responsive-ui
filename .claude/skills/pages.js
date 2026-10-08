#!/usr/bin/env node
/**
 * pages.js — create pages from the layout library and keep shared partials
 * (headers, footers, sidebars, template switcher) identical across pages.
 *
 *   node .claude/skills/pages.js list
 *   node .claude/skills/pages.js new --family website --layout sidebar-left --name careers --title "Careers"
 *   node .claude/skills/pages.js sync            re-stamp partials into every page
 *   node .claude/skills/pages.js sync --check    exit 1 if any page is out of date
 *
 * Partials live in src/layouts/partials/<name>.html and are embedded in
 * pages between markers:
 *
 *   <!-- @partial site-header -->
 *   …generated, do not edit…
 *   <!-- @end site-header -->
 *
 * While stamping, {{root}} becomes the page's relative path to src/, the
 * link to the current page gets aria-current="page", and links marked
 * data-section / data-section-prefix get aria-current="true" for pages in
 * that section.
 *
 * Zero dependencies: Node.js >= 18 standard library only.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const LAYOUTS_DIR = path.join(SRC, 'layouts');
const PARTIALS_DIR = path.join(LAYOUTS_DIR, 'partials');

/** Which partial plays which role in each template family. */
const FAMILIES = {
  website: {
    dir: 'templates/website',
    site: 'Acme Studio',
    partials: { header: 'site-header', footer: 'site-footer', widget: 'chat-widget' },
    css: ['templates/website/website.css'],
    scripts: [],
  },
  dashboard: {
    dir: 'templates/dashboard',
    site: 'Acme Dashboard',
    partials: { header: 'app-topbar', sidebar: 'app-sidebar', footer: null, widget: null },
    css: ['templates/dashboard/dashboard.css'],
    scripts: [],
  },
  'e-commerce': {
    dir: 'templates/e-commerce',
    site: 'Acme Store',
    partials: { header: 'shop-header', footer: 'shop-footer', widget: 'chat-widget' },
    css: ['templates/e-commerce/shop.css'],
    scripts: ['templates/e-commerce/shop.js'],
  },
  auth: {
    dir: 'templates/auth',
    site: 'Acme Cloud',
    partials: { header: 'auth-header', footer: 'auth-footer', widget: null },
    css: ['templates/auth/auth.css'],
    scripts: [],
  },
  ai: {
    dir: 'templates/ai',
    site: 'Acme AI',
    partials: { header: 'ai-topbar', sidebar: null, footer: null, widget: null },
    css: ['templates/ai/ai.css'],
    scripts: [],
  },
};

/** Role of every partial that can be swapped per family. */
const ROLES = {
  'site-header': 'header',
  'shop-header': 'header',
  'auth-header': 'header',
  'app-topbar': 'header',
  'site-footer': 'footer',
  'shop-footer': 'footer',
  'auth-footer': 'footer',
  'ai-topbar': 'header',
  'app-sidebar': 'sidebar',
  'chat-widget': 'widget',
};

const MARKER_RE = /([ \t]*)<!-- @partial ([\w-]+) -->[\s\S]*?<!-- @end \2 -->/g;

/* ---- Helpers ----------------------------------------------------------- */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const toPosix = (p) => p.split(path.sep).join('/');

function rootFor(pageFile) {
  const r = toPosix(path.relative(path.dirname(pageFile), SRC));
  return r ? `${r}/` : '';
}

function readMeta(source, key) {
  const m = source.match(new RegExp(`@${key}:\\s*(.+)`));
  return m ? m[1].trim() : '';
}

const partialCache = new Map();
function readPartial(name) {
  if (!partialCache.has(name)) {
    const file = path.join(PARTIALS_DIR, `${name}.html`);
    if (!fs.existsSync(file)) throw new Error(`Unknown partial "${name}" (expected ${rel(file)})`);
    partialCache.set(name, fs.readFileSync(file, 'utf8').trim());
  }
  return partialCache.get(name);
}

/** Render a partial for a specific page. */
function renderPartial(name, pageFile) {
  const pageDir = path.dirname(pageFile);
  const body = readPartial(name).replace(/\{\{root\}\}/g, rootFor(pageFile));

  return body.replace(/<a\b([^>]*)>/g, (tag, attrs) => {
    if (/\baria-current=/.test(attrs)) return tag;
    const hrefMatch = attrs.match(/\bhref="([^"]+)"/);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1];
    if (/^(#|[a-z]+:|\/\/)/i.test(href) || href.includes('#')) return tag;

    const target = path.resolve(pageDir, href.split('?')[0]);
    let current = null;
    if (target === pageFile) current = 'page';
    else if (/\bdata-section\b(?!-)/.test(attrs) && pageFile.startsWith(path.dirname(target) + path.sep)) current = 'true';
    else {
      const prefix = attrs.match(/\bdata-section-prefix="([\w-]+)"/);
      if (prefix && path.dirname(target) === pageDir && path.basename(pageFile).startsWith(prefix[1])) current = 'true';
    }
    return current ? `<a${attrs} aria-current="${current}">` : tag;
  });
}

/** Replace the content of every partial marker in `html`. */
function stamp(html, pageFile) {
  return html.replace(MARKER_RE, (match, indent, name) => {
    const body = renderPartial(name, pageFile)
      .split('\n')
      .map((line) => (line.trim() ? indent + line : ''))
      .join('\n');
    return `${indent}<!-- @partial ${name} -->\n${body}\n${indent}<!-- @end ${name} -->`;
  });
}

/** Rewrite relative href/src values when moving markup between folders. */
function rebase(html, fromDir, toDir) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (match, attr, value) => {
    if (/^(#|[a-z]+:|\/|\{\{)/i.test(value)) return match;
    const [pathPart, ...rest] = value.split(/(?=[?#])/);
    const target = path.resolve(fromDir, pathPart);
    let next = toPosix(path.relative(toDir, target));
    if (!next) next = './';
    return `${attr}="${next}${rest.join('')}"`;
  });
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageFiles() {
  return walk(SRC)
    .filter((f) => !f.startsWith(PARTIALS_DIR + path.sep))
    .filter((f) => fs.readFileSync(f, 'utf8').includes('<!-- @partial '));
}

function listLayouts() {
  return fs
    .readdirSync(LAYOUTS_DIR)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .map((f) => {
      const source = fs.readFileSync(path.join(LAYOUTS_DIR, f), 'utf8');
      return {
        id: path.basename(f, '.html'),
        name: readMeta(source, 'layout'),
        description: readMeta(source, 'description'),
        regions: readMeta(source, 'regions'),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/* ---- Commands ---------------------------------------------------------- */
function cmdList() {
  console.log('Layouts (src/layouts/<id>.html):');
  for (const l of listLayouts()) console.log(`  ${l.id.padEnd(14)} ${l.name} — ${l.description} [regions: ${l.regions}]`);
  console.log('\nPartials (src/layouts/partials/<name>.html):');
  for (const f of fs.readdirSync(PARTIALS_DIR).filter((n) => n.endsWith('.html')).sort()) {
    const name = path.basename(f, '.html');
    console.log(`  ${name}${ROLES[name] ? ` (role: ${ROLES[name]})` : ''}`);
  }
  console.log('\nFamilies (--family):');
  for (const [id, fam] of Object.entries(FAMILIES)) {
    const parts = Object.entries(fam.partials).map(([role, p]) => `${role}=${p || 'none'}`).join(', ');
    console.log(`  ${id.padEnd(11)} src/${fam.dir}/  ${parts}`);
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else {
        args[key] = next;
        i += 1;
      }
    } else args._.push(a);
  }
  return args;
}

function cmdNew(args) {
  const family = FAMILIES[args.family];
  const layouts = listLayouts().map((l) => l.id);
  if (!family) throw new Error(`--family must be one of: ${Object.keys(FAMILIES).join(', ')}`);
  if (!layouts.includes(args.layout)) throw new Error(`--layout must be one of: ${layouts.join(', ')}`);
  if (!args.name || !/^[a-z0-9][a-z0-9-]*$/.test(args.name)) throw new Error('--name must be a lowercase slug, e.g. "careers"');
  const title = typeof args.title === 'string' ? args.title : args.name.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const description = typeof args.description === 'string' ? args.description : `${title} page.`;

  const targetDir = path.join(SRC, family.dir);
  const target = path.join(targetDir, `${args.name}.html`);
  if (fs.existsSync(target) && !args.force) throw new Error(`${rel(target)} exists. Pass --force to overwrite.`);

  let html = fs.readFileSync(path.join(LAYOUTS_DIR, `${args.layout}.html`), 'utf8');
  html = html.replace(/^\s*<!--[\s\S]*?-->\s*/, ''); // layout metadata header
  html = rebase(html, LAYOUTS_DIR, targetDir);

  // Swap partials for the family's equivalents (or remove them).
  html = html.replace(MARKER_RE, (match, indent, name) => {
    if (name === 'template-switcher' && args['no-demo']) return '';
    const role = ROLES[name];
    if (!role || !(role in family.partials)) return match;
    const replacement = family.partials[role];
    if (!replacement) return '';
    return `${indent}<!-- @partial ${replacement} -->\n${indent}<!-- @end ${replacement} -->`;
  });
  html = html.replace(/\n{3,}/g, '\n\n');

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)} — ${escapeHtml(family.site)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);
  html = html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/, `$1${escapeHtml(title)}$2`);

  const relFromTarget = (p) => toPosix(path.relative(targetDir, path.join(SRC, p)));
  const cssLinks = family.css
    .filter((p) => fs.existsSync(path.join(SRC, p)))
    .map((p) => `  <link rel="stylesheet" href="${relFromTarget(p)}">`)
    .join('\n');
  if (cssLinks) html = html.replace(/(\n\s*<script type="module")/, `\n${cssLinks}$1`);
  const scripts = family.scripts
    .filter((p) => fs.existsSync(path.join(SRC, p)))
    .map((p) => `  <script type="module" src="${relFromTarget(p)}"></script>`)
    .join('\n');
  if (scripts) html = html.replace(/(<script type="module" src="[^"]*main\.js"><\/script>)/, `$1\n${scripts}`);

  html = stamp(html, target);
  if (args['dry-run']) {
    process.stdout.write(html);
    return;
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(target, html);
  console.log(`✎ created ${rel(target)} (layout: ${args.layout}, family: ${args.family})`);
  console.log('Next: replace the placeholder content, link the page from the family navigation partial,');
  console.log('then run: node .claude/skills/pages.js sync && node .claude/skills/generate-doc.js');
}

function cmdSync(args) {
  const check = Boolean(args.check);
  let stale = 0;
  let written = 0;
  const files = pageFiles();
  for (const file of files) {
    const current = fs.readFileSync(file, 'utf8');
    const next = stamp(current, file);
    if (next === current) continue;
    if (check) {
      console.error(`✗ ${rel(file)} has out-of-date partials`);
      stale += 1;
    } else {
      fs.writeFileSync(file, next);
      console.log(`✎ ${rel(file)}`);
      written += 1;
    }
  }
  console.log(check ? `${files.length} pages checked, ${stale} out of date.` : `${files.length} pages checked, ${written} updated.`);
  if (stale) {
    console.error('Run: node .claude/skills/pages.js sync');
    process.exit(1);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === 'list') cmdList();
  else if (command === 'new') cmdNew(args);
  else if (command === 'sync') cmdSync(args);
  else {
    console.log('Usage: node .claude/skills/pages.js <list | new | sync> [options]');
    console.log('  new  --family <name> --layout <id> --name <slug> [--title "Text"] [--description "Text"] [--no-demo] [--force] [--dry-run]');
    console.log('  sync [--check]');
    process.exit(command ? 2 : 0);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`pages: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { stamp, rebase, renderPartial, listLayouts, FAMILIES, ROLES };
