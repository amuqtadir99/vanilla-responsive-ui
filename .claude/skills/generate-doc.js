#!/usr/bin/env node
/**
 * generate-doc.js — keep component documentation in sync with the source.
 *
 * Reads every snippet in src/components/*.html, parses its metadata header
 * and regenerates:
 *   - docs/COMPONENTS.md          reference with vanilla, Razor, React and
 *                                 Django usage for every component
 *   - src/components/index.html   live gallery rendering every snippet
 *
 * Snippet header format (first thing in the file):
 *   <!--
 *   @component: Tabs
 *   @description: One sentence.
 *   @css: components/tabs.css          (comma-separated, relative to src/assets/css)
 *   @js: components/tabs.js | none     (relative to src/assets/js)
 *   @a11y: Accessibility notes.
 *   -->
 *
 * Usage:
 *   node .claude/skills/generate-doc.js           write the files
 *   node .claude/skills/generate-doc.js --check   exit 1 if they are stale
 *
 * Zero dependencies: Node.js >= 18 standard library only.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');
const CSS_COMPONENTS_DIR = path.join(ROOT, 'src', 'assets', 'css', 'components');
const DOC_FILE = path.join(ROOT, 'docs', 'COMPONENTS.md');
const GALLERY_FILE = path.join(COMPONENTS_DIR, 'index.html');
const GALLERY_ORDER = [
  'button',
  'alert',
  'card',
  'accordion',
  'tabs',
  'dialog',
  'form-field',
  'toast',
  'data-table',
  'breadcrumb',
  'pagination',
  'theme-toggle',
  'site-header',
  'site-footer',
];

const REQUIRED_KEYS = ['component', 'description', 'css', 'js', 'a11y'];

/** Parse one snippet file into { slug, meta, markup }. */
function parseSnippet(file) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^\s*<!--([\s\S]*?)-->\s*/);
  const slug = path.basename(file, '.html');
  if (!match) throw new Error(`${slug}.html: missing metadata comment header`);

  const meta = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^\s*@([a-z0-9]+):\s*(.*)$/i);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
  }
  for (const key of REQUIRED_KEYS) {
    if (!meta[key]) throw new Error(`${slug}.html: missing "@${key}:" in metadata header`);
  }

  const list = (value) =>
    value === 'none'
      ? []
      : value
          .split(',')
          .map((v) => v.replace(/\(.*\)/, '').trim())
          .filter(Boolean);

  return {
    slug,
    title: meta.component,
    description: meta.description,
    a11y: meta.a11y,
    css: list(meta.css),
    js: list(meta.js),
    jsNote: meta.js,
    markup: source.slice(match[0].length).trimEnd(),
  };
}

function loadSnippets() {
  const files = fs
    .readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .map((f) => path.join(COMPONENTS_DIR, f));

  const rank = (s) => {
    const i = GALLERY_ORDER.indexOf(s.slug);
    return i === -1 ? GALLERY_ORDER.length : i;
  };
  return files.map(parseSnippet).sort((a, b) => rank(a) - rank(b) || a.slug.localeCompare(b.slug));
}

function pascal(slug) {
  return slug.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- docs/COMPONENTS.md ------------------------------------------------ */
function renderMarkdown(snippets) {
  const out = [];
  out.push('# Components');
  out.push('');
  out.push('<!-- GENERATED FILE. Do not edit by hand: update the snippet in src/components/ and run `node .claude/skills/generate-doc.js`. -->');
  out.push('');
  out.push('Every component is a plain HTML snippet in [`src/components/`](../src/components/) plus optional CSS and JavaScript modules. Open [`src/components/index.html`](../src/components/index.html) in a browser (served over HTTP) to try them live.');
  out.push('');
  out.push('All components require `tokens.css` and `base.css`. Components with JavaScript are initialised automatically by `main.js`, or individually by importing the module and calling `init(rootElement)`. See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for framework-specific setup.');
  out.push('');
  out.push('| Component | CSS | JavaScript |');
  out.push('| --- | --- | --- |');
  for (const s of snippets) {
    const css = s.css.map((c) => `\`${c}\``).join(', ');
    const js = s.js.length ? s.js.map((j) => `\`${j}\``).join(', ') : '—';
    out.push(`| [${s.title}](#${s.slug}) | ${css} | ${js} |`);
  }
  out.push('');

  for (const s of snippets) {
    const name = pascal(s.slug);
    out.push(`<h2 id="${s.slug}">${s.title}</h2>`);
    out.push('');
    out.push(s.description);
    out.push('');
    out.push(`- **Snippet:** [\`src/components/${s.slug}.html\`](../src/components/${s.slug}.html)`);
    out.push(`- **CSS:** ${s.css.map((c) => `\`src/assets/css/${c}\``).join(', ')}`);
    out.push(`- **JavaScript:** ${s.js.length ? s.jsNote.replace(/([\w/-]+\.js)/g, '`src/assets/js/$1`') : 'none (HTML and CSS only)'}`);
    out.push(`- **Accessibility:** ${s.a11y}`);
    out.push('');

    out.push('### Vanilla HTML');
    out.push('');
    out.push('```html');
    out.push('<!-- In <head> -->');
    out.push('<link rel="stylesheet" href="/assets/css/tokens.css">');
    out.push('<link rel="stylesheet" href="/assets/css/base.css">');
    for (const c of s.css) out.push(`<link rel="stylesheet" href="/assets/css/${c}">`);
    if (s.js.length) out.push('<script type="module" src="/assets/js/main.js"></script>');
    out.push('');
    out.push('<!-- In <body> -->');
    out.push(s.markup);
    out.push('```');
    out.push('');

    out.push('### ASP.NET Core (Razor Pages / MVC)');
    out.push('');
    out.push(`Save the markup as \`Pages/Shared/Components/_${name}.cshtml\` (escape any literal \`@\` as \`@@\`) and render it where needed:`);
    out.push('');
    out.push('```cshtml');
    out.push(`<partial name="Components/_${name}" />`);
    out.push('```');
    out.push('');
    out.push('Reference the stylesheets in `_Layout.cshtml`' + (s.js.length ? ' and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.' : '.'));
    out.push('');

    out.push('### React / Next.js');
    out.push('');
    out.push('Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:');
    out.push('');
    out.push('```jsx');
    if (s.js.length) {
      out.push("'use client';");
      out.push("import { useEffect, useRef } from 'react';");
    }
    for (const c of s.css) out.push(`import '@/ui/css/${c}';`);
    out.push('');
    out.push(`export function ${name}() {`);
    if (s.js.length) {
      out.push('  const ref = useRef(null);');
      out.push('  useEffect(() => {');
      for (const j of s.js) {
        out.push(`    import('@/ui/js/${j}').then((m) => m.init(ref.current));`);
      }
      out.push('  }, []);');
      out.push('  return <div ref={ref}>{/* converted markup */}</div>;');
    } else {
      out.push('  return <>{/* converted markup */}</>;');
    }
    out.push('}');
    out.push('```');
    out.push('');

    out.push('### Django / Jinja2');
    out.push('');
    out.push(`Save the markup as \`templates/components/${s.slug}.html\` and include it:`);
    out.push('');
    out.push('```django');
    out.push(`{% include "components/${s.slug}.html" %}`);
    out.push('```');
    out.push('');
  }

  return out.join('\n');
}

/* ---- src/components/index.html ---------------------------------------- */
function renderGallery(snippets) {
  const cssFiles = fs
    .readdirSync(CSS_COMPONENTS_DIR)
    .filter((f) => f.endsWith('.css'))
    .sort();

  const indent = (text, spaces) =>
    text
      .split('\n')
      .map((line) => (line.trim() ? ' '.repeat(spaces) + line : ''))
      .join('\n');

  const links = [
    '../assets/css/tokens.css',
    '../assets/css/base.css',
    ...cssFiles.map((f) => `../assets/css/components/${f}`),
    'gallery.css',
  ];

  const toc = snippets
    .map((s) => `            <li><a href="#${s.slug}">${escapeHtml(s.title)}</a></li>`)
    .join('\n');

  const sections = snippets
    .map(
      (s) => `        <section class="gallery__section" id="${s.slug}" aria-labelledby="${s.slug}-title">
          <div class="gallery__intro">
            <h2 id="${s.slug}-title">${escapeHtml(s.title)}</h2>
            <p class="text-muted">${escapeHtml(s.description)}</p>
            <p class="text-sm"><a href="${s.slug}.html">View snippet source</a> · <a href="../../docs/COMPONENTS.md#${s.slug}">Documentation</a></p>
          </div>
          <div class="gallery__demo stack">
${indent(s.markup, 12)}
          </div>
        </section>`
    )
    .join('\n\n');

  return `<!DOCTYPE html>
<!-- GENERATED FILE. Do not edit by hand: run \`node .claude/skills/generate-doc.js\`. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'">
  <title>Component gallery — vanilla-responsive-ui</title>
  <meta name="description" content="Live gallery of every vanilla-responsive-ui component.">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="../assets/icons/favicon.svg" type="image/svg+xml">
${links.map((href) => `  <link rel="stylesheet" href="${href}">`).join('\n')}
  <script type="module" src="../assets/js/main.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <main id="main" tabindex="-1">
    <div class="container gallery">
      <div class="gallery__header stack">
        <p><a href="../index.html">← All templates</a></p>
        <h1>Component gallery</h1>
        <p class="lead">${snippets.length} accessible, dependency-free components. Each one is a copy-paste snippet in <code>src/components/</code>.</p>
      </div>

      <div class="gallery__layout">
        <nav class="gallery__toc" aria-label="Components">
          <ul class="side-nav__list">
${toc}
          </ul>
        </nav>

        <div class="gallery__sections">
${sections}
        </div>
      </div>
    </div>
  </main>
</body>
</html>
`.replace(/\n\n\n+/g, '\n\n');
}

/* ---- Main -------------------------------------------------------------- */
function main() {
  const check = process.argv.includes('--check');
  const snippets = loadSnippets();
  const outputs = [
    [DOC_FILE, renderMarkdown(snippets) + '\n'],
    [GALLERY_FILE, renderGallery(snippets)],
  ];

  let stale = 0;
  for (const [file, content] of outputs) {
    const rel = path.relative(ROOT, file);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === content) {
      console.log(`✓ ${rel} is up to date`);
      continue;
    }
    if (check) {
      console.error(`✗ ${rel} is out of date. Run: node .claude/skills/generate-doc.js`);
      stale += 1;
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      console.log(`✎ wrote ${rel}`);
    }
  }
  console.log(`${snippets.length} components documented.`);
  if (stale) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`generate-doc: ${error.message}`);
  process.exit(1);
}
