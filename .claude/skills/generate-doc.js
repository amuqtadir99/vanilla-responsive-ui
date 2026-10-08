#!/usr/bin/env node
/**
 * generate-doc.js — keep documentation and the AI-agent catalog in sync with
 * the source.
 *
 * Reads every snippet in src/components/*.html (metadata header + markup),
 * every layout in src/layouts/, every template page, data file and skill,
 * and regenerates:
 *   - docs/COMPONENTS.md          reference: paths, accessibility notes and
 *                                 usage in vanilla HTML, Razor, React, Django
 *   - src/components/index.html   live gallery with "Copy path for AI" and
 *                                 "Copy code" buttons for every component
 *   - catalog.json                machine-readable index of components,
 *                                 layouts, templates, partials, data and skills
 *
 * Snippet header format (first thing in the file):
 *   <!--
 *   @component: Tabs
 *   @category: Navigation
 *   @description: One sentence.
 *   @css: components/tabs.css          (comma-separated, relative to src/assets/css)
 *   @js: components/tabs.js | none     (relative to src/assets/js)
 *   @a11y: Accessibility notes.
 *   -->
 *
 * Usage:
 *   node .claude/skills/generate-doc.js           write the files
 *   node .claude/skills/generate-doc.js --check   exit 1 if any is stale
 *
 * Zero dependencies: Node.js >= 18 standard library only.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { stamp } = require('./pages.js');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const COMPONENTS_DIR = path.join(SRC, 'components');
const CSS_COMPONENTS_DIR = path.join(SRC, 'assets', 'css', 'components');
const DOC_FILE = path.join(ROOT, 'docs', 'COMPONENTS.md');
const GALLERY_FILE = path.join(COMPONENTS_DIR, 'index.html');
const CATALOG_FILE = path.join(ROOT, 'catalog.json');

const CATEGORY_ORDER = ['Layout', 'Navigation', 'Basics', 'Content', 'Forms', 'Feedback', 'Overlays', 'Data', 'AI', 'Theming'];
const BASE_CSS = ['src/assets/css/tokens.css', 'src/assets/css/themes.css', 'src/assets/css/base.css'];
const REQUIRED_KEYS = ['component', 'category', 'description', 'css', 'js', 'a11y'];

const posix = (p) => p.split(path.sep).join('/');
const rel = (file) => posix(path.relative(ROOT, file));

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/\n/g, '&#10;');
}

/* ---- Sources ----------------------------------------------------------- */
function parseSnippet(file) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^\s*<!--([\s\S]*?)-->\s*/);
  const slug = path.basename(file, '.html');
  if (!match) throw new Error(`${slug}.html: missing metadata comment header`);

  const meta = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^\s*@([a-z0-9-]+):\s*(.*)$/i);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
  }
  for (const key of REQUIRED_KEYS) {
    if (!meta[key]) throw new Error(`${slug}.html: missing "@${key}:" in metadata header`);
  }
  if (!CATEGORY_ORDER.includes(meta.category)) {
    throw new Error(`${slug}.html: @category must be one of ${CATEGORY_ORDER.join(', ')}`);
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
    category: meta.category,
    description: meta.description,
    a11y: meta.a11y,
    css: list(meta.css),
    js: list(meta.js),
    jsNote: meta.js,
    markup: source.slice(match[0].length).trimEnd(),
  };
}

function loadSnippets() {
  const snippets = fs
    .readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .map((f) => parseSnippet(path.join(COMPONENTS_DIR, f)));
  const rank = (s) => CATEGORY_ORDER.indexOf(s.category);
  return snippets.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

/** Full file paths a component needs, for humans and agents. */
function filesFor(s) {
  return {
    markup: `src/components/${s.slug}.html`,
    css: [...BASE_CSS, ...s.css.map((c) => `src/assets/css/${c}`)],
    js: s.js.map((j) => `src/assets/js/${j}`),
    docs: `docs/COMPONENTS.md#${s.slug}`,
  };
}

function aiReference(s) {
  const f = filesFor(s);
  return [
    `Component: ${s.title} (vanilla-responsive-ui)`,
    `Markup: ${f.markup}`,
    `CSS: ${f.css.join(', ')}`,
    `JS: ${f.js.length ? `${f.js.join(', ')} (auto-initialised by src/assets/js/main.js)` : 'none'}`,
    `Docs: ${f.docs}`,
    'Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)',
  ].join('\n');
}

function readHead(file) {
  const source = fs.readFileSync(file, 'utf8');
  const title = (source.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const description = (source.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const layouts = [...new Set([...source.matchAll(/data-layout="([\w-]+)"/g)].map((m) => m[1]))];
  if (source.includes('class="app-shell')) layouts.unshift('app-shell');
  const partials = [...new Set([...source.matchAll(/<!-- @partial ([\w-]+) -->/g)].map((m) => m[1]))];
  const meta = (key) => ((source.match(new RegExp(`@${key}:\\s*(.+)`)) || [])[1] || '').trim();
  return { source, title: title.trim(), description, layouts, partials, meta };
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/* ---- docs/COMPONENTS.md ------------------------------------------------ */
function pascal(slug) {
  return slug.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function renderMarkdown(snippets) {
  const out = [];
  out.push('# Components');
  out.push('');
  out.push('<!-- GENERATED FILE. Do not edit by hand: update the snippet in src/components/ and run `node .claude/skills/generate-doc.js`. -->');
  out.push('');
  out.push('Every component is a plain HTML snippet in [`src/components/`](../src/components/) plus CSS and, where needed, a JavaScript module. Try them live in the [component gallery](../src/components/index.html) (serve the repository over HTTP), which has **Copy path for AI** and **Copy code** buttons for each one. The same information is available to tools in [`catalog.json`](../catalog.json).');
  out.push('');
  out.push('All components need `tokens.css`, `themes.css` and `base.css`. Components with JavaScript are initialised automatically by `main.js`, or individually by importing the module and calling `init(rootElement)`. See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for framework setup.');
  out.push('');
  out.push('| Component | Category | CSS | JavaScript |');
  out.push('| --- | --- | --- | --- |');
  for (const s of snippets) {
    const css = s.css.map((c) => `\`${c}\``).join(', ');
    const js = s.js.length ? s.js.map((j) => `\`${j}\``).join(', ') : '—';
    out.push(`| [${s.title}](#${s.slug}) | ${s.category} | ${css} | ${js} |`);
  }
  out.push('');

  for (const s of snippets) {
    const name = pascal(s.slug);
    out.push(`<h2 id="${s.slug}">${s.title}</h2>`);
    out.push('');
    out.push(`*${s.category}.* ${s.description}`);
    out.push('');
    out.push(`- **Accessibility:** ${s.a11y}`);
    out.push(`- **JavaScript:** ${s.js.length ? s.jsNote.replace(/([\w/-]+\.js)/g, '`src/assets/js/$1`') : 'none (HTML and CSS only)'}`);
    out.push('');
    out.push('**Reference for AI agents** (paste into your prompt):');
    out.push('');
    out.push('```text');
    out.push(aiReference(s));
    out.push('```');
    out.push('');

    out.push('### Vanilla HTML');
    out.push('');
    out.push('```html');
    out.push('<!-- In <head> -->');
    for (const c of filesFor(s).css) out.push(`<link rel="stylesheet" href="/${c.replace(/^src\//, '')}">`);
    if (s.js.length) out.push('<script type="module" src="/assets/js/main.js"></script>');
    out.push('');
    out.push('<!-- In <body> -->');
    out.push(s.markup);
    out.push('```');
    out.push('');

    out.push('### ASP.NET Core (Razor Pages / MVC)');
    out.push('');
    out.push(`Save the markup as \`Pages/Shared/Components/_${name}.cshtml\` (escape any literal \`@\` as \`@@\`) and render it with \`<partial name="Components/_${name}" />\`. Reference the stylesheets in \`_Layout.cshtml\`${s.js.length ? ' and load `~/assets/js/main.js` once as a module' : ''}.`);
    out.push('');

    out.push('### React / Next.js');
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
      for (const j of s.js) out.push(`    import('@/ui/js/${j}').then((m) => m.init(ref.current));`);
      out.push('  }, []);');
      out.push('  return <div ref={ref}>{/* markup converted to JSX */}</div>;');
    } else {
      out.push('  return <>{/* markup converted to JSX */}</>;');
    }
    out.push('}');
    out.push('```');
    out.push('');

    out.push('### Django / Jinja2');
    out.push('');
    out.push(`Save the markup as \`templates/components/${s.slug}.html\` and use \`{% include "components/${s.slug}.html" %}\`.`);
    out.push('');
  }
  return `${out.join('\n')}\n`;
}

/* ---- src/components/index.html ----------------------------------------- */
function renderGallery(snippets) {
  const cssFiles = fs.readdirSync(CSS_COMPONENTS_DIR).filter((f) => f.endsWith('.css')).sort();
  // Indent markup for readability, but never inside <pre>, where
  // whitespace is content.
  const indent = (text, spaces) => {
    let inPre = false;
    return text
      .split('\n')
      .map((line) => {
        const out = inPre || !line.trim() ? line : ' '.repeat(spaces) + line;
        const opens = (line.match(/<pre[\s>]/g) || []).length;
        const closes = (line.match(/<\/pre>/g) || []).length;
        if (opens !== closes) inPre = opens > closes;
        return out;
      })
      .join('\n');
  };

  const links = [
    '../assets/css/tokens.css',
    '../assets/css/themes.css',
    '../assets/css/base.css',
    '../assets/css/layouts.css',
    ...cssFiles.map((f) => `../assets/css/components/${f}`),
    'gallery.css',
  ];

  const categories = CATEGORY_ORDER.filter((c) => snippets.some((s) => s.category === c));
  const toc = categories
    .map((c) => {
      const items = snippets
        .filter((s) => s.category === c)
        .map((s) => `              <li><a class="side-nav__link" href="#${s.slug}">${escapeHtml(s.title)}</a></li>`)
        .join('\n');
      const id = `toc-${c.toLowerCase()}`;
      return `          <p class="side-nav__heading" id="${id}">${c}</p>\n          <ul class="side-nav__list" aria-labelledby="${id}">\n${items}\n          </ul>`;
    })
    .join('\n');

  const section = (s) => `        <section class="gallery__section" id="${s.slug}" aria-labelledby="${s.slug}-title">
          <div class="gallery__intro">
            <p class="eyebrow">${s.category}</p>
            <h2 id="${s.slug}-title">${escapeHtml(s.title)}</h2>
            <p class="text-muted">${escapeHtml(s.description)}</p>
            <p class="path-chip">src/components/${s.slug}.html</p>
            <div class="cluster">
              <button type="button" class="btn btn--sm" data-copy data-copy-text="${escapeAttr(aiReference(s))}" data-copy-success="Copied paths" hidden><span data-copy-label>Copy path for AI</span></button>
              <button type="button" class="btn btn--sm btn--secondary" data-copy data-copy-target="#code-${s.slug}" hidden><span data-copy-label>Copy code</span></button>
              <a class="btn btn--sm btn--ghost" href="../../docs/COMPONENTS.md#${s.slug}">Docs</a>
            </div>
          </div>
          <div class="gallery__demo stack">
${indent(s.markup, 12)}
          </div>
          <details class="gallery__code">
            <summary>View code</summary>
            <div class="code-block">
              <div class="code-block__header"><span>HTML</span></div>
              <pre tabindex="0" role="region" aria-label="${escapeHtml(s.title)} markup"><code id="code-${s.slug}">${escapeHtml(s.markup)}</code></pre>
            </div>
          </details>
        </section>`;

  const html = `<!DOCTYPE html>
<!-- GENERATED FILE. Do not edit by hand: run \`node .claude/skills/generate-doc.js\`. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'">
  <title>Component gallery — vanilla-responsive-ui</title>
  <meta name="description" content="Live gallery of every vanilla-responsive-ui component, with copyable file paths for AI agents and copyable code.">
  <meta name="color-scheme" content="light dark">
  <meta name="vr-data-base" content="../data/">
  <link rel="icon" href="../assets/icons/favicon.svg" type="image/svg+xml">
${links.map((href) => `  <link rel="stylesheet" href="${href}">`).join('\n')}
  <script type="module" src="../assets/js/main.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <!-- @partial template-switcher -->
  <!-- @end template-switcher -->

  <main id="main" tabindex="-1">
    <div class="container gallery">
      <div class="gallery__header stack">
        <h1>Component gallery</h1>
        <p class="lead">${snippets.length} accessible, dependency-free components. Each is a copy-paste snippet in <code>src/components/</code>. Use <strong>Copy path for AI</strong> to give a coding agent the exact files to read, or <strong>Copy code</strong> to grab the markup.</p>
        <p class="text-sm text-muted">Tools can read the same information from <a href="../../catalog.json">catalog.json</a>.</p>
      </div>

      <div class="gallery__layout">
        <nav class="gallery__toc" aria-label="Components">
${toc}
        </nav>

        <div class="gallery__sections">
${snippets.map(section).join('\n\n')}
        </div>
      </div>
    </div>
  </main>

  <!-- @partial theme-panel -->
  <!-- @end theme-panel -->
</body>
</html>
`;
  return stamp(html, GALLERY_FILE);
}

/* ---- catalog.json ------------------------------------------------------ */
function renderCatalog(snippets) {
  const layouts = fs
    .readdirSync(path.join(SRC, 'layouts'))
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .map((f) => {
      const file = path.join(SRC, 'layouts', f);
      const head = readHead(file);
      return {
        id: path.basename(f, '.html'),
        name: head.meta('layout'),
        description: head.meta('description'),
        regions: head.meta('regions').split(',').map((r) => r.trim()).filter(Boolean),
        file: rel(file),
      };
    });

  const templatesDir = path.join(SRC, 'templates');
  const templates = fs
    .readdirSync(templatesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((family) => {
      const dir = path.join(templatesDir, family);
      const files = fs.readdirSync(dir).sort();
      return {
        family,
        directory: rel(dir),
        pages: files
          .filter((f) => f.endsWith('.html'))
          .map((f) => {
            const head = readHead(path.join(dir, f));
            return { file: rel(path.join(dir, f)), title: head.title, description: head.description, layouts: head.layouts, partials: head.partials };
          }),
        assets: files.filter((f) => /\.(css|js)$/.test(f)).map((f) => rel(path.join(dir, f))),
      };
    });

  const partialsDir = path.join(SRC, 'layouts', 'partials');
  const { ROLES } = require('./pages.js');
  const partials = fs
    .readdirSync(partialsDir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => ({ name: path.basename(f, '.html'), role: ROLES[path.basename(f, '.html')] || 'shared', file: rel(path.join(partialsDir, f)) }));

  const dataDir = path.join(SRC, 'data');
  const data = fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const json = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
      const shape = Array.isArray(json)
        ? { type: 'array', length: json.length, fields: Object.keys(json[0] || {}) }
        : { type: 'object', keys: Object.keys(json) };
      return { name: path.basename(f, '.json'), file: rel(path.join(dataDir, f)), ...shape };
    });

  const skillsDir = path.join(ROOT, '.claude', 'skills');
  const skills = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
    .map((d) => {
      const text = fs.readFileSync(path.join(skillsDir, d.name, 'SKILL.md'), 'utf8');
      const field = (key) => ((text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm')) || [])[1] || '').trim();
      return { name: field('name') || d.name, description: field('description'), file: rel(path.join(skillsDir, d.name, 'SKILL.md')) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const jsModules = walk(path.join(SRC, 'assets', 'js'))
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map(rel);

  const catalog = {
    $comment: 'GENERATED by node .claude/skills/generate-doc.js — do not edit by hand.',
    name: 'vanilla-responsive-ui',
    description: 'Dependency-free, accessible (WCAG 2.2 AA), responsive UI components, layouts and page templates in plain HTML, CSS and ES modules.',
    rules: 'CLAUDE.md',
    docs: {
      readme: 'README.md',
      llms: 'llms.txt',
      architecture: 'docs/ARCHITECTURE.md',
      components: 'docs/COMPONENTS.md',
      layouts: 'docs/LAYOUTS.md',
      theming: 'docs/THEMING.md',
      data: 'docs/DATA.md',
      aiChat: 'docs/AI-CHAT.md',
      accessibility: 'docs/ACCESSIBILITY.md',
      security: 'docs/SECURITY.md',
      integration: 'docs/INTEGRATION_GUIDE.md',
    },
    entry: { css: [...BASE_CSS, 'src/assets/css/layouts.css'], js: 'src/assets/js/main.js', tokens: 'src/assets/css/tokens.css', themes: 'src/assets/css/themes.css' },
    components: snippets.map((s) => ({
      id: s.slug,
      name: s.title,
      category: s.category,
      description: s.description,
      accessibility: s.a11y,
      ...filesFor(s),
    })),
    layouts,
    templates,
    partials,
    data,
    modules: jsModules,
    skills,
  };
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

/* ---- Main -------------------------------------------------------------- */
function main() {
  const check = process.argv.includes('--check');
  const snippets = loadSnippets();
  const outputs = [
    [DOC_FILE, renderMarkdown(snippets)],
    [GALLERY_FILE, renderGallery(snippets)],
    [CATALOG_FILE, renderCatalog(snippets)],
  ];

  let stale = 0;
  for (const [file, content] of outputs) {
    const name = rel(file);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === content) {
      console.log(`✓ ${name} is up to date`);
      continue;
    }
    if (check) {
      console.error(`✗ ${name} is out of date. Run: node .claude/skills/generate-doc.js`);
      stale += 1;
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      console.log(`✎ wrote ${name}`);
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
