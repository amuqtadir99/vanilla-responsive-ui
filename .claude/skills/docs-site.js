/**
 * docs-site.js — builds the documentation website in src/docs/ (and the
 * home page src/index.html) from the source of truth: component and block
 * snippets, template pages, layouts, design tokens, icons and docs/*.md.
 *
 * Called by generate-doc.js, which writes the files (or checks them with
 * --check). Every page is static HTML that works under the strict CSP:
 * syntax highlighting happens here at build time, and interactivity
 * (search, preview sizing, copy buttons, tabs) comes from main.js and
 * src/docs/assets/docs.js.
 *
 * Zero dependencies: Node.js >= 18 standard library only.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const REPO_URL = 'https://github.com/amuqtadir99/vanilla-responsive-ui';
const BLOB_URL = `${REPO_URL}/blob/main/`;

const posix = (p) => p.split(path.sep).join('/');
const read = (file) => fs.readFileSync(file, 'utf8');

/* ==========================================================================
   Escaping and syntax highlighting (build time, so pages stay CSP-clean)
   ========================================================================== */
function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function attr(text) {
  return esc(text).replace(/\n/g, '&#10;');
}

const tok = (cls, text) => (text ? `<span class="tok-${cls}">${esc(text)}</span>` : '');

function highlightHtml(code) {
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    if (code.startsWith('<!--', i)) {
      const e = code.indexOf('-->', i + 4);
      const end = e < 0 ? n : e + 3;
      out += tok('comment', code.slice(i, end));
      i = end;
      continue;
    }
    if (code[i] === '<' && /[a-zA-Z/!]/.test(code[i + 1] || '')) {
      const m = /^<\/?[!a-zA-Z][\w:-]*/.exec(code.slice(i, i + 64));
      out += tok('tag', m[0]);
      i += m[0].length;
      while (i < n && code[i] !== '>' && !code.startsWith('/>', i)) {
        const rest = code.slice(i, i + 512);
        const ws = /^\s+/.exec(rest);
        if (ws) {
          out += esc(ws[0]);
          i += ws[0].length;
          continue;
        }
        const name = /^[^\s=>/]+/.exec(rest);
        if (name) {
          out += tok('attr', name[0]);
          i += name[0].length;
          if (code[i] === '=') {
            out += tok('punct', '=');
            i += 1;
            const q = code[i];
            if (q === '"' || q === "'") {
              const e = code.indexOf(q, i + 1);
              const end = e < 0 ? n : e + 1;
              out += tok('string', code.slice(i, end));
              i = end;
            } else {
              const v = /^[^\s>]+/.exec(code.slice(i, i + 256));
              if (v) {
                out += tok('string', v[0]);
                i += v[0].length;
              }
            }
          }
          continue;
        }
        out += esc(code[i]);
        i += 1;
      }
      if (code.startsWith('/>', i)) {
        out += tok('tag', '/>');
        i += 2;
      } else if (code[i] === '>') {
        out += tok('tag', '>');
        i += 1;
      }
      continue;
    }
    let e = code.indexOf('<', i + 1);
    if (e < 0) e = n;
    out += esc(code.slice(i, e));
    i = e;
  }
  return out;
}

function highlightCssValue(value) {
  const re = /(--[\w-]+)|("[^"]*"|'[^']*')|(-?\d*\.?\d+(?:rem|em|px|%|vw|vh|dvh|ms|s|deg|fr|ch|ex|cqi)?)\b|(!important)|(#[0-9a-fA-F]{3,8}\b)/g;
  let out = '';
  let last = 0;
  for (const m of value.matchAll(re)) {
    out += esc(value.slice(last, m.index));
    if (m[1]) out += tok('variable', m[1]);
    else if (m[2]) out += tok('string', m[2]);
    else if (m[3]) out += tok('number', m[3]);
    else if (m[4]) out += tok('keyword', m[4]);
    else out += tok('number', m[5]);
    last = m.index + m[0].length;
  }
  return out + esc(value.slice(last));
}

function highlightCss(code) {
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    if (code.startsWith('/*', i)) {
      const e = code.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      out += tok('comment', code.slice(i, end));
      i = end;
      continue;
    }
    const c = code[i];
    if (c === '{' || c === '}' || c === ';') {
      out += tok('punct', c);
      i += 1;
      continue;
    }
    let j = i;
    while (j < n && !'{};'.includes(code[j]) && !code.startsWith('/*', j)) j += 1;
    const seg = code.slice(i, j);
    const lead = /^\s*/.exec(seg)[0];
    const body = seg.slice(lead.length);
    if (code[j] === '{') {
      out += esc(lead) + (body.startsWith('@') ? tok('keyword', (/^@[\w-]+/.exec(body) || [''])[0]) + highlightCssValue(body.replace(/^@[\w-]+/, '')) : tok('selector', body));
    } else {
      const m = /^([\w-]+)(\s*:)([\s\S]*)$/.exec(body);
      out += esc(lead) + (m ? tok('property', m[1]) + tok('punct', m[2]) + highlightCssValue(m[3]) : esc(body));
    }
    i = j;
  }
  return out;
}

const JS_KEYWORDS = new Set('import export from default function return const let if else for of in while do break continue new class extends async await try catch finally throw typeof instanceof switch case this null undefined true false void yield static get set'.split(' '));

function highlightJs(code) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
  let out = '';
  let last = 0;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += tok('comment', m[1]);
    else if (m[2]) out += tok('string', m[2]);
    else if (m[3]) out += tok('number', m[3]);
    else if (m[4]) out += JS_KEYWORDS.has(m[4]) ? tok('keyword', m[4]) : tok('function', m[4]);
    else out += JS_KEYWORDS.has(m[5]) ? tok('keyword', m[5]) : esc(m[5]);
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}

function highlight(lang, code) {
  const l = (lang || '').toLowerCase();
  if (['html', 'xml', 'svg', 'cshtml', 'razor', 'vue', 'svelte', 'astro', 'django', 'jinja', 'blade', 'erb'].includes(l)) return highlightHtml(code);
  if (['css'].includes(l)) return highlightCss(code);
  if (['js', 'javascript', 'mjs', 'jsx', 'ts', 'tsx', 'json'].includes(l)) return highlightJs(code);
  return esc(code);
}

/* ==========================================================================
   Building blocks for pages
   ========================================================================== */
let uid = 0;
const nextId = (prefix) => `${prefix}-${(uid += 1)}`;

const ICONS_DIR = path.join(SRC, 'assets', 'icons');
function icon(name, cls = 'icon') {
  const raw = read(path.join(ICONS_DIR, `${name}.svg`));
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const filled = /fill="currentColor"/.test(raw.split('>')[0]);
  return `<svg class="${cls}${filled ? ' icon--filled' : ''}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

/** A code block with a header, copy button and optional path chip. */
function codeBlock(code, { lang = 'html', label, path: filePath, maxHeight = true } = {}) {
  const id = nextId('code');
  const copyPath = filePath
    ? `<button type="button" class="btn btn--ghost btn--sm" data-copy data-copy-text="${attr(filePath)}" data-copy-success="Path copied" hidden>${icon('link', 'icon icon--sm')} <span data-copy-label>Copy path</span></button>`
    : '';
  return `<div class="docs-code${maxHeight ? '' : ' docs-code--full'}">
  <div class="docs-code__header">
    <span class="docs-code__label">${filePath ? `<span class="docs-code__path">${esc(filePath)}</span>` : esc(label || lang.toUpperCase())}</span>
    <span class="docs-code__actions">${copyPath}<button type="button" class="btn btn--ghost btn--sm" data-copy data-copy-target="#${id}" data-copy-success="Code copied" hidden>${icon('copy', 'icon icon--sm')} <span data-copy-label>Copy code</span></button></span>
  </div>
  <pre tabindex="0" role="region" aria-label="${attr(label || filePath || `${lang} code`)}"><code id="${id}">${highlight(lang, code.replace(/\s+$/, ''))}</code></pre>
</div>`;
}

/** Tabs (existing tabs component). Without JS every panel shows, each with its heading. */
function tabs(label, panels, level = 3) {
  const base = nextId('tabs');
  const buttons = panels.map((p, i) => `      <button type="button" class="tabs__tab" data-tab="${base}-${i}">${esc(p.title)}</button>`).join('\n');
  const sections = panels
    .map(
      (p, i) => `    <section class="tabs__panel" id="${base}-${i}" aria-labelledby="${base}-${i}-h">
      <h${level} class="tabs__heading" id="${base}-${i}-h">${esc(p.title)}</h${level}>
      ${p.html}
    </section>`
    )
    .join('\n');
  return `<div class="tabs docs-tabs" data-tabs>
    <div class="tabs__list" data-tabs-list data-label="${attr(label)}" hidden>
${buttons}
    </div>
${sections}
  </div>`;
}

function copyButton(text, label, { primary = false, success = 'Copied' } = {}) {
  return `<button type="button" class="btn btn--sm${primary ? '' : ' btn--secondary'}" data-copy data-copy-text="${attr(text)}" data-copy-success="${attr(success)}" hidden>${icon(primary ? 'sparkles' : 'copy', 'icon icon--sm')} <span data-copy-label>${esc(label)}</span></button>`;
}

function deviceSwitch(name) {
  const opt = (value, label, ic, checked) =>
    `<label class="segmented__option"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span class="segmented__label">${icon(ic, 'icon icon--sm')} ${label}</span></label>`;
  return `<fieldset class="fieldset docs-device" data-docs-device hidden>
      <legend class="visually-hidden">Preview width</legend>
      <div class="segmented">
        ${opt('desktop', 'Desktop', 'monitor', true)}
        ${opt('tablet', 'Tablet', 'tablet', false)}
        ${opt('mobile', 'Mobile', 'smartphone', false)}
      </div>
    </fieldset>`;
}

/** Live preview frame: an iframe on a same-origin page, sized by docs.js. */
function previewFrame(src, title, { mode = 'auto', openLabel = 'Open in new tab' } = {}) {
  const name = nextId('device');
  return `<div class="docs-preview" data-docs-preview data-mode="${mode}" data-device="desktop">
  <div class="docs-preview__bar">
    ${deviceSwitch(name)}
    <a class="btn btn--ghost btn--sm" href="${attr(src)}" target="_blank" rel="noopener noreferrer">${icon('external-link', 'icon icon--sm')} ${esc(openLabel)}<span class="visually-hidden"> (${esc(title)})</span></a>
  </div>
  <div class="docs-preview__stage" data-docs-stage>
    <iframe class="docs-preview__frame" src="${attr(src)}" title="${attr(title)}" loading="lazy" data-docs-frame></iframe>
  </div>
</div>`;
}

/* ==========================================================================
   Minimal Markdown renderer for docs/*.md guides
   ========================================================================== */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-');
}

function mdInline(text, linkFor) {
  const parts = [];
  // code spans first, so their contents are not formatted
  const re = /`([^`]+)`/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    parts.push({ t: 'text', v: text.slice(last, m.index) });
    parts.push({ t: 'code', v: m[1] });
    last = m.index + m[0].length;
  }
  parts.push({ t: 'text', v: text.slice(last) });
  return parts
    .map((p) => {
      if (p.t === 'code') return `<code>${esc(p.v)}</code>`;
      let s = esc(p.v);
      s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt) => esc(alt));
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (m, label, href) => `<a href="${attr(linkFor(href.replace(/&amp;/g, '&')))}">${label}</a>`);
      s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (m, url) => `<a href="${attr(url)}">${url}</a>`);
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,:;!?]|$)/g, '$1<em>$2</em>');
      return s;
    })
    .join('');
}

function renderMd(md, { linkFor, headingIds }) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let title = '';
  let i = 0;
  const ids = headingIds || new Set();
  const uniqueId = (text) => {
    let id = slugify(text) || 'section';
    let k = 1;
    while (ids.has(id)) id = `${slugify(text)}-${k++}`;
    ids.add(id);
    return id;
  };
  const toc = [];

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    // HTML comments in Markdown
    if (/^<!--/.test(line.trim())) {
      while (i < lines.length && !lines[i].includes('-->')) i += 1;
      i += 1;
      continue;
    }
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[(i += 1) - 1]);
      i += 1;
      out.push(codeBlock(buf.join('\n'), { lang: fence[1] || 'text', label: (fence[1] || 'text').toUpperCase() }));
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      if (level === 1 && !title) {
        title = text;
        i += 1;
        continue;
      }
      const id = uniqueId(text);
      if (level === 2) toc.push({ id, text: text.replace(/`/g, '') });
      out.push(`<h${level} id="${id}">${mdInline(text, linkFor)}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[(i += 1) - 1]);
      const cells = (r) => r.replace(/^\||\|\s*$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(`<div class="table-wrapper" role="region" aria-label="${attr(head.join(', '))}" tabindex="0"><table class="table" aria-label="${attr(head.join(', '))}"><thead><tr>${head
        .map((c) => `<th scope="col">${mdInline(c, linkFor)}</th>`)
        .join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${mdInline(c, linkFor)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[(i += 1) - 1].replace(/^>\s?/, ''));
      out.push(`<blockquote>${renderMd(buf.join('\n'), { linkFor, headingIds: ids }).html}</blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && (lines[i].trim() === '' ? /^\s+([-*]|\d+\.)\s+|^([-*]|\d+\.)\s+/.test(lines[i + 1] || '') && /^\s/.test(lines[i + 1] || '') : true)) {
        const l = lines[i];
        if (!l.trim()) {
          i += 1;
          continue;
        }
        const top = /^([-*]|\d+\.)\s+(.*)$/.exec(l);
        if (top) {
          items.push({ text: top[2], children: [] });
        } else if (/^\s+([-*]|\d+\.)\s+/.test(l) && items.length) {
          items[items.length - 1].children.push(l.replace(/^\s+([-*]|\d+\.)\s+/, ''));
        } else if (/^\s+\S/.test(l) && items.length) {
          const cur = items[items.length - 1];
          if (cur.children.length) cur.children[cur.children.length - 1] += ` ${l.trim()}`;
          else cur.text += ` ${l.trim()}`;
        } else break;
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items
        .map((it) => `<li>${mdInline(it.text, linkFor)}${it.children.length ? `<ul>${it.children.map((c) => `<li>${mdInline(c, linkFor)}</li>`).join('')}</ul>` : ''}</li>`)
        .join('')}</${tag}>`);
      continue;
    }
    // paragraph
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||>|\s*([-*]|\d+\.)\s+)/.test(lines[i])) buf.push(lines[(i += 1) - 1].trim());
    if (!buf.length) {
      buf.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${mdInline(buf.join(' '), linkFor)}</p>`);
  }
  return { title, html: out.join('\n'), toc };
}

/* ==========================================================================
   Source parsing helpers
   ========================================================================== */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Top-level element ranges inside [start, end) of a well-formed HTML string. */
function topLevelElements(html, start, end) {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  re.lastIndex = start;
  const out = [];
  let depth = 0;
  let open = -1;
  let m;
  while ((m = re.exec(html)) && m.index < end) {
    if (m[0].startsWith('<!--')) continue;
    const [, closing, tag] = m;
    const name = tag.toLowerCase();
    if (!closing && (name === 'script' || name === 'template' || name === 'textarea' || name === 'pre')) {
      // skip raw-ish content to the matching close tag
      const close = html.indexOf(`</${name}>`, re.lastIndex);
      if (depth === 0) out.push({ start: m.index, end: close + name.length + 3, tag: name });
      re.lastIndex = close + name.length + 3;
      continue;
    }
    if (VOID.has(name) || m[3]) {
      if (depth === 0) out.push({ start: m.index, end: re.lastIndex, tag: name });
      continue;
    }
    if (!closing) {
      if (depth === 0) open = m.index;
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) out.push({ start: open, end: re.lastIndex, tag: name });
    }
  }
  return out;
}

function dedent(text) {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const first = /^\s*/.exec(lines[0])[0].length;
  const min = Math.min(...lines.filter((l) => l.trim()).map((l, idx) => (idx === 0 ? Infinity : /^\s*/.exec(l)[0].length)), first);
  return lines.map((l, idx) => (idx === 0 ? l.slice(first) : l.slice(Math.min(min, /^\s*/.exec(l)[0].length)))).join('\n');
}

function headingText(html) {
  const m = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/.exec(html);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/* ==========================================================================
   Site model
   ========================================================================== */
const GUIDES = [
  { slug: 'theming', file: 'docs/THEMING.md', title: 'Theming' },
  { slug: 'layouts', file: 'docs/LAYOUTS.md', title: 'Layouts and pages' },
  { slug: 'data', file: 'docs/DATA.md', title: 'Data and charts' },
  { slug: 'ai-chat', file: 'docs/AI-CHAT.md', title: 'AI chat' },
  { slug: 'accessibility', file: 'docs/ACCESSIBILITY.md', title: 'Accessibility' },
  { slug: 'security', file: 'docs/SECURITY.md', title: 'Security' },
  { slug: 'integration', file: 'docs/INTEGRATION_GUIDE.md', title: 'Framework integration' },
  { slug: 'architecture', file: 'docs/ARCHITECTURE.md', title: 'Architecture' },
];

const FOUNDATIONS = [
  { slug: 'colors', title: 'Colours' },
  { slug: 'typography', title: 'Typography' },
  { slug: 'spacing', title: 'Spacing and shape' },
  { slug: 'icons', title: 'Icons' },
];

const FAMILY_NAMES = {
  'landing-page': 'Landing page',
  website: 'Website',
  dashboard: 'Dashboard',
  'e-commerce': 'E-commerce',
  ai: 'AI apps',
  auth: 'Authentication',
};
const FAMILY_ORDER = ['landing-page', 'website', 'dashboard', 'e-commerce', 'ai', 'auth'];

function loadTemplates() {
  const dir = path.join(SRC, 'templates');
  return FAMILY_ORDER.filter((f) => fs.existsSync(path.join(dir, f))).map((family) => {
    const files = fs.readdirSync(path.join(dir, family)).filter((f) => f.endsWith('.html'));
    files.sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
    const pages = files.map((f) => {
      const file = path.join(dir, family, f);
      const source = read(file);
      const rawTitle = ((/<title>([\s\S]*?)<\/title>/.exec(source) || [])[1] || f).trim();
      const name = decodeEntities(rawTitle.split(/\s+[—–|-]\s+/)[0]);
      return {
        family,
        file: posix(path.relative(ROOT, file)),
        srcPath: posix(path.relative(SRC, file)),
        slug: `${family}-${path.basename(f, '.html')}`,
        name,
        title: decodeEntities(rawTitle),
        description: decodeEntities((/<meta name="description" content="([^"]*)"/.exec(source) || [])[1] || ''),
        source,
      };
    });
    const assets = fs.readdirSync(path.join(dir, family)).filter((f) => /\.(css|js)$/.test(f)).map((f) => `src/templates/${family}/${f}`);
    return { family, name: FAMILY_NAMES[family] || family, pages, assets };
  });
}

function loadLayouts() {
  const dir = path.join(SRC, 'layouts');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .map((f) => {
      const source = read(path.join(dir, f));
      const meta = (k) => ((new RegExp(`@${k}:\\s*(.+)`).exec(source) || [])[1] || '').trim();
      return { id: path.basename(f, '.html'), name: meta('layout'), description: meta('description'), regions: meta('regions'), file: `src/layouts/${f}`, source };
    });
}

/** Parse --token: value pairs from a CSS block body. */
function tokenValues(css, selectorRe) {
  const m = selectorRe.exec(css);
  if (!m) return {};
  let depth = 0;
  let i = css.indexOf('{', m.index);
  const start = i + 1;
  for (; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const body = css.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = {};
  for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].replace(/\s+/g, ' ').trim();
  return out;
}

/* ==========================================================================
   Page shell
   ========================================================================== */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'";

const DOC_CSS = ['tokens.css', 'themes.css', 'base.css', 'layouts.css'];
const DOC_COMPONENT_CSS = ['button.css', 'form.css', 'feedback.css', 'tabs.css', 'table.css', 'code.css', 'accordion.css', 'card.css', 'navigation.css'];

function navModel(site) {
  const groups = [
    {
      title: 'Get started',
      items: [
        { title: 'Introduction', href: 'index.html' },
        { title: 'Getting started', href: 'docs/getting-started.html' },
        { title: 'Page builder', href: 'builder/index.html' },
        { title: 'Working with AI agents', href: 'docs/ai-agents.html' },
      ],
    },
    { title: 'Templates', items: [{ title: 'All templates', href: 'docs/templates/index.html' }, ...site.templates.map((t) => ({ title: t.name, href: `docs/templates/${t.pages[0].slug}.html`, match: `docs/templates/${t.family}-` })), { title: 'Layouts', href: 'docs/layouts.html' }] },
    { title: 'Blocks', items: site.blocks.map((b) => ({ title: b.title, href: `docs/blocks/${b.slug}.html`, tag: b.category })) },
    { title: 'Components', items: site.components.map((c) => ({ title: c.title, href: `docs/components/${c.slug}.html`, tag: c.category })) },
    { title: 'Foundations', items: FOUNDATIONS.map((f) => ({ title: f.title, href: `docs/foundations/${f.slug}.html` })) },
    { title: 'Guides', items: GUIDES.map((g) => ({ title: g.title, href: `docs/guides/${g.slug}.html` })) },
  ];
  return groups;
}

function renderNav(site, current, r) {
  return navModel(site)
    .map((g) => {
      const id = `nav-${slugify(g.title)}`;
      const items = g.items
        .map((it) => {
          const active = it.href === current || (it.match && current.startsWith(it.match));
          return `<li><a class="docs-nav__link" href="${r}${it.href}"${active ? (it.href === current ? ' aria-current="page"' : ' aria-current="true"') : ''}>${esc(it.title)}</a></li>`;
        })
        .join('\n          ');
      return `<div class="docs-nav__group" data-docs-group>
        <p class="docs-nav__title" id="${id}">${esc(g.title)}</p>
        <ul class="docs-nav__list" role="list" aria-labelledby="${id}">
          ${items}
        </ul>
      </div>`;
    })
    .join('\n      ');
}

function shell(site, { file, title, description, body, toc = [], bodyClass = '', wide = false }) {
  const depth = posix(file).split('/').length - 1;
  const r = depth ? '../'.repeat(depth) : '';
  const current = posix(file);
  const tocHtml = toc.length
    ? `<aside class="docs-toc" aria-labelledby="toc-title">
      <h2 class="docs-toc__title" id="toc-title">On this page</h2>
      <ul class="docs-toc__list" role="list">
        ${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('\n        ')}
      </ul>
    </aside>`
    : '';
  const css = [...DOC_CSS.map((c) => `${r}assets/css/${c}`), ...DOC_COMPONENT_CSS.map((c) => `${r}assets/css/components/${c}`), `${r}assets/css/blocks.css`, `${r}docs/assets/foundations.css`, `${r}docs/assets/docs.css`];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${esc(title)} — vanilla-responsive-ui docs</title>
  <meta name="description" content="${attr(description)}">
  <meta name="color-scheme" content="light dark">
  <meta name="generator" content="node .claude/skills/generate-doc.js (do not edit by hand)">
  <link rel="icon" href="${r}assets/icons/favicon.svg" type="image/svg+xml">
${css.map((c) => `  <link rel="stylesheet" href="${c}">`).join('\n')}
  <script type="module" src="${r}assets/js/main.js"></script>
  <script type="module" src="${r}docs/assets/docs.js"></script>
</head>
<body class="docs-body${bodyClass ? ` ${bodyClass}` : ''}">
  <a class="skip-link" href="#main">Skip to content</a>
  <p class="needs-server">${icon('alert-triangle', 'icon icon--sm')} <span>You opened this file from disk, so browsers block its JavaScript (copy buttons, previews, the builder). Run <code>python3 -m http.server 8080</code> in the repository folder and open <a href="http://localhost:8080/src/">localhost:8080/src/</a>, or use the <a href="https://amuqtadir99.github.io/vanilla-responsive-ui/src/">hosted docs</a>.</span></p>
  <header class="docs-topbar">
    <div class="docs-topbar__inner">
      <button type="button" class="btn btn--ghost btn--icon docs-topbar__menu" data-disclosure="dismissible" aria-expanded="false" aria-controls="docs-sidebar" hidden>
        ${icon('menu')}
        <span class="visually-hidden">Documentation menu</span>
      </button>
      <a class="docs-brand" href="${r}index.html">
        <span class="docs-brand__mark">${icon('layers')}</span>
        <span>vanilla-responsive-ui</span>
      </a>
      <nav class="docs-topnav" aria-label="Main">
        <ul class="docs-topnav__list" role="list">
          <li><a href="${r}docs/getting-started.html"${current.startsWith('docs/getting') ? ' aria-current="page"' : ''}>Docs</a></li>
          <li><a href="${r}docs/components/${site.components[0].slug}.html"${current.startsWith('docs/components/') ? ' aria-current="true"' : ''}>Components</a></li>
          <li><a href="${r}docs/blocks/${site.blocks[0].slug}.html"${current.startsWith('docs/blocks/') ? ' aria-current="true"' : ''}>Blocks</a></li>
          <li><a href="${r}docs/templates/index.html"${current.startsWith('docs/templates/') ? ' aria-current="true"' : ''}>Templates</a></li>
          <li><a href="${r}builder/index.html">Builder</a></li>
        </ul>
      </nav>
      <div class="docs-topbar__actions">
        <a class="btn btn--ghost btn--sm" href="${REPO_URL}">${icon('code', 'icon icon--sm')} <span class="docs-topbar__label">GitHub</span></a>
        <button type="button" class="btn btn--ghost btn--icon theme-toggle" data-theme-toggle aria-pressed="false" hidden>
          ${icon('moon', 'icon theme-toggle__light')}
          ${icon('sun', 'icon theme-toggle__dark')}
          <span class="visually-hidden">Dark theme</span>
        </button>
      </div>
    </div>
  </header>

  <div class="docs-layout${wide ? ' docs-layout--wide' : ''}">
    <nav class="docs-sidebar" id="docs-sidebar" aria-label="Documentation">
      <div class="docs-search" data-docs-search hidden>
        <label class="visually-hidden" for="docs-search-input">Search the documentation</label>
        ${icon('search', 'icon icon--sm docs-search__icon')}
        <input class="input docs-search__input" id="docs-search-input" type="search" placeholder="Search…" autocomplete="off" aria-describedby="docs-search-hint">
        <kbd class="docs-search__kbd" id="docs-search-hint"><span class="visually-hidden">Press </span>/<span class="visually-hidden"> to search</span></kbd>
        <p class="docs-search__empty text-sm text-muted" role="status" data-docs-search-status></p>
      </div>
      ${renderNav(site, current, r)}
    </nav>

    <main class="docs-main" id="main" tabindex="-1">
${body}
    </main>
    ${tocHtml}
  </div>

  <footer class="docs-footer">
    <p>MIT licensed · Built with plain HTML, CSS and JavaScript · <a href="${REPO_URL}">Source on GitHub</a> · Generated by <code>node .claude/skills/generate-doc.js</code></p>
  </footer>
</body>
</html>
`;
}

/* ==========================================================================
   Content helpers
   ========================================================================== */
function pageHeader({ eyebrow, title, lead, actions = '', meta = '' }) {
  return `      <header class="docs-header">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
        <h1 class="docs-header__title">${esc(title)}</h1>
        ${lead ? `<p class="docs-header__lead">${lead}</p>` : ''}
        ${meta}
        ${actions ? `<div class="docs-header__actions">${actions}</div>` : ''}
      </header>`;
}

function section(id, title, html, level = 2) {
  return `      <section class="docs-section" aria-labelledby="${id}">
        <h${level} class="docs-section__title" id="${id}">${esc(title)}</h${level}>
        ${html}
      </section>`;
}

function fileList(files) {
  return `<ul class="docs-files" role="list">
          ${files
            .map(
              (f) => `<li><span class="path-chip">${esc(f.path)}</span> <span class="text-muted text-sm">${esc(f.note || '')}</span> <button type="button" class="btn btn--ghost btn--sm" data-copy data-copy-text="${attr(f.path)}" data-copy-success="Path copied" hidden>${icon('copy', 'icon icon--sm')} <span data-copy-label>Copy</span><span class="visually-hidden"> ${esc(f.path)}</span></button></li>`
            )
            .join('\n          ')}
        </ul>`;
}

function prevNext(list, index, hrefFor) {
  const prev = list[index - 1];
  const next = list[index + 1];
  return `      <nav class="docs-pager" aria-label="Previous and next">
        ${prev ? `<a class="docs-pager__link" href="${hrefFor(prev)}" rel="prev"><span class="text-sm text-muted">Previous</span> <span>${esc(prev.title)}</span></a>` : '<span></span>'}
        ${next ? `<a class="docs-pager__link docs-pager__link--next" href="${hrefFor(next)}" rel="next"><span class="text-sm text-muted">Next</span> <span>${esc(next.title)}</span></a>` : ''}
      </nav>`;
}

function usagePanels(item, kind) {
  const css = [...['tokens.css', 'themes.css', 'base.css'].map((c) => `assets/css/${c}`), ...(kind === 'block' ? ['assets/css/layouts.css'] : []), ...item.css.map((c) => `assets/css/${c}`)];
  const unique = [...new Set(css)];
  const head = [...unique.map((c) => `<link rel="stylesheet" href="/${c}">`), ...(item.js.length ? ['<script type="module" src="/assets/js/main.js"></script>'] : [])].join('\n');
  const name = item.slug.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const react = [
    ...(item.js.length ? ["'use client';", "import { useEffect, useRef } from 'react';"] : []),
    ...item.css.map((c) => `import '@/ui/css/${c}';`),
    '',
    `export function ${name}() {`,
    ...(item.js.length
      ? ['  const ref = useRef(null);', '  useEffect(() => {', ...item.js.map((j) => `    import('@/ui/js/${j}').then((m) => m.init(ref.current));`), '  }, []);', '  return <div ref={ref}>{/* paste the markup, converted to JSX */}</div>;']
      : ['  return <>{/* paste the markup, converted to JSX */}</>;']),
    '}',
  ].join('\n');
  return [
    { title: 'HTML page', html: `<p>Add the stylesheets${item.js.length ? ' and the module entry point' : ''} to <code>&lt;head&gt;</code> once, then paste the markup anywhere in <code>&lt;body&gt;</code>. Paths assume <code>src/</code> is your web root.</p>\n${codeBlock(head, { lang: 'html', label: 'In <head>' })}` },
    { title: 'React / Next.js', html: `<p>Copy <code>src/assets/</code> to <code>ui/</code>, convert the markup to JSX (<code>class</code> → <code>className</code>, <code>for</code> → <code>htmlFor</code>) and call <code>init()</code> after render.</p>\n${codeBlock(react, { lang: 'jsx', label: 'JSX' })}` },
    { title: 'ASP.NET Core', html: `<p>Save the markup as <code>Pages/Shared/Components/_${name}.cshtml</code> (escape a literal <code>@</code> as <code>@@</code>), render it with <code>&lt;partial name="Components/_${name}" /&gt;</code>, and reference the stylesheets in <code>_Layout.cshtml</code>.</p>` },
    { title: 'Django / Jinja2', html: `<p>Save the markup as <code>templates/${kind === 'block' ? 'blocks' : 'components'}/${item.slug}.html</code> and use <code>{% include "${kind === 'block' ? 'blocks' : 'components'}/${item.slug}.html" %}</code>. Load the stylesheets in your base template.</p>` },
  ];
}

function aiReference(item, kind) {
  const css = [...new Set(['src/assets/css/tokens.css', 'src/assets/css/themes.css', 'src/assets/css/base.css', ...item.css.map((c) => `src/assets/css/${c}`)])];
  return [
    `${kind === 'block' ? 'Block' : 'Component'}: ${item.title} (vanilla-responsive-ui)`,
    `Markup: src/${kind === 'block' ? 'blocks' : 'components'}/${item.slug}.html`,
    `CSS: ${css.join(', ')}`,
    `JS: ${item.js.length ? `${item.js.map((j) => `src/assets/js/${j}`).join(', ')} (auto-initialised by src/assets/js/main.js)` : 'none'}`,
    `Docs: src/docs/${kind === 'block' ? 'blocks' : 'components'}/${item.slug}.html`,
    `Accessibility: ${item.a11y}`,
    'Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)',
  ].join('\n');
}

/* ==========================================================================
   Pages
   ========================================================================== */
function itemPage(site, item, index, kind) {
  const list = kind === 'block' ? site.blocks : site.components;
  const folder = kind === 'block' ? 'blocks' : 'components';
  const file = `docs/${folder}/${item.slug}.html`;
  const sourcePath = `src/${folder}/${item.slug}.html`;
  const previewSrc = `../preview/${folder}/${item.slug}.html`;

  const cssFiles = item.css.map((c) => `src/assets/css/${c}`);
  const jsFiles = item.js.map((j) => `src/assets/js/${j}`);
  const codePanels = [{ title: 'HTML', html: codeBlock(item.markup, { lang: 'html', path: sourcePath }) }];
  for (const c of cssFiles) {
    const full = path.join(ROOT, c);
    if (fs.existsSync(full)) codePanels.push({ title: path.basename(c), html: codeBlock(read(full), { lang: 'css', path: c }) });
  }
  for (const j of jsFiles) {
    const full = path.join(ROOT, j);
    if (fs.existsSync(full)) codePanels.push({ title: path.basename(j), html: codeBlock(read(full), { lang: 'js', path: j }) });
  }

  const files = [
    { path: sourcePath, note: 'markup' },
    ...['src/assets/css/tokens.css', 'src/assets/css/themes.css', 'src/assets/css/base.css'].map((p) => ({ path: p, note: 'required by everything' })),
    ...cssFiles.filter((c) => !/tokens|themes|base\.css/.test(c)).map((p) => ({ path: p, note: 'styles' })),
    ...jsFiles.map((p) => ({ path: p, note: 'behaviour (loaded by main.js)' })),
  ];

  const toc = [
    { id: 'preview', text: 'Preview' },
    { id: 'code', text: 'Code' },
    { id: 'files', text: 'Files' },
    { id: 'accessibility', text: 'Accessibility' },
    { id: 'usage', text: 'Use it in your stack' },
  ];

  const actions = [
    copyButton(aiReference(item, kind), 'Copy path for AI', { primary: true, success: 'Reference copied' }),
    `<button type="button" class="btn btn--sm btn--secondary" data-copy data-copy-text="${attr(item.markup)}" data-copy-success="Markup copied" hidden>${icon('copy', 'icon icon--sm')} <span data-copy-label>Copy HTML</span></button>`,
    kind === 'block' ? `<a class="btn btn--sm btn--secondary" href="../../builder/index.html?add=${item.slug}">${icon('layout', 'icon icon--sm')} Open in page builder</a>` : '',
  ].join('\n          ');

  const meta = `<ul class="docs-meta" role="list">
          <li><span class="badge">${esc(item.category)}</span></li>
          <li><span class="badge${item.js.length ? ' badge--primary' : ''}">${item.js.length ? 'HTML + CSS + JS' : 'HTML + CSS only'}</span></li>
          <li><span class="path-chip">${esc(sourcePath)}</span></li>
        </ul>`;

  const body = [
    pageHeader({ eyebrow: kind === 'block' ? `Block · ${item.category}` : `Component · ${item.category}`, title: item.title, lead: esc(item.description), actions, meta }),
    section('preview', 'Preview', previewFrame(previewSrc, `${item.title} preview`, { mode: kind })),
    section('code', 'Code', tabs(`${item.title} source`, codePanels, 3)),
    section('files', 'Files', `<p class="text-muted">Everything this ${kind} needs. Paste these paths into a prompt so an AI agent works with the real files.</p>\n        ${fileList(files)}`),
    section('accessibility', 'Accessibility', `<div class="docs-callout">${icon('accessibility')}<p>${esc(item.a11y)}</p></div>`),
    section('usage', 'Use it in your stack', tabs('Frameworks', usagePanels(item, kind), 3)),
    prevNext(list, index, (x) => `${x.slug}.html`),
  ].join('\n\n');

  return [file, shell(site, { file, title: `${item.title} ${kind}`, description: item.description, body, toc })];
}

function previewPage(site, item, kind) {
  const folder = kind === 'block' ? 'blocks' : 'components';
  const file = `docs/preview/${folder}/${item.slug}.html`;
  const r = '../../../';
  // Blocks are authored relative to src/blocks/; components to src/components/.
  const markup = rebase(item.markup, path.join(SRC, folder), path.join(SRC, 'docs', 'preview', folder));
  const hasH1 = /<h1\b/.test(markup);
  const minLevel = Math.min(...[...markup.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1])), 7);
  const headings = [];
  if (!hasH1) headings.push(`<h1 class="visually-hidden">${esc(item.title)} preview</h1>`);
  for (let l = 2; l < minLevel && minLevel < 7; l += 1) headings.push(`<h${l} class="visually-hidden">Example</h${l}>`);
  const css = [...DOC_CSS.map((c) => `${r}assets/css/${c}`), ...fs.readdirSync(path.join(SRC, 'assets', 'css', 'components')).filter((c) => c.endsWith('.css')).sort().map((c) => `${r}assets/css/components/${c}`), `${r}assets/css/blocks.css`, `${r}docs/assets/preview.css`];
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <title>${esc(item.title)} preview — vanilla-responsive-ui</title>
  <meta name="description" content="${attr(`Live preview of the ${item.title} ${kind}.`)}">
  <meta name="color-scheme" content="light dark">
  <meta name="vr-data-base" content="${r}data/">
  <meta name="generator" content="node .claude/skills/generate-doc.js (do not edit by hand)">
  <link rel="icon" href="${r}assets/icons/favicon.svg" type="image/svg+xml">
${css.map((c) => `  <link rel="stylesheet" href="${c}">`).join('\n')}
  <script type="module" src="${r}assets/js/main.js"></script>
</head>
<body class="preview-body preview-body--${kind}">
  <a class="skip-link" href="#main">Skip to content</a>
  <main id="main" tabindex="-1" class="preview-main">
    ${headings.join('\n    ')}
${markup.split('\n').map((l) => (l.trim() ? `    ${l}` : '')).join('\n')}
  </main>
</body>
</html>
`;
  return [file, html];
}

function rebase(html, fromDir, toDir) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (match, a, value) => {
    if (/^(#|[a-z]+:|\/|\{\{)/i.test(value)) return match;
    const [p, ...rest] = value.split(/(?=[?#])/);
    const next = posix(path.relative(toDir, path.resolve(fromDir, p))) || './';
    return `${a}="${next}${rest.join('')}"`;
  });
}

/* ---- Templates ----------------------------------------------------------- */
const PARTIAL_LABELS = {
  'template-switcher': 'Demo bar (remove in production)',
  'theme-panel': 'Theme panel',
  'site-header': 'Site header',
  'site-footer': 'Site footer',
  'shop-header': 'Shop header',
  'shop-footer': 'Shop footer',
  'app-topbar': 'App top bar',
  'app-sidebar': 'App sidebar',
  'ai-topbar': 'AI top bar',
  'auth-header': 'Auth header',
  'auth-footer': 'Auth footer',
  'chat-widget': 'Chat widget',
};

function anatomy(site, page) {
  const src = page.source;
  const parts = [];
  const bodyStart = src.indexOf('<body');
  const bodyOpenEnd = src.indexOf('>', bodyStart) + 1;
  const bodyEnd = src.lastIndexOf('</body>');
  const blocksBySlug = new Map(site.blocks.map((b) => [b.slug, b]));
  const componentsBySlug = new Map(site.components.map((c) => [c.slug, c]));

  // Partials (in document order) and the children of <main>.
  const partialRe = /<!-- @partial ([\w-]+) -->([\s\S]*?)<!-- @end \1 -->/g;
  const markers = [...src.matchAll(partialRe)].map((m) => ({ index: m.index, name: m[1], html: m[2] }));
  const mainOpen = /<main\b[^>]*>/.exec(src);
  let mainChildren = [];
  if (mainOpen) {
    const mainEnd = src.lastIndexOf('</main>');
    mainChildren = topLevelElements(src, mainOpen.index + mainOpen[0].length, mainEnd).filter((e) => e.tag !== 'script' || true);
  }
  const mainIndex = mainOpen ? mainOpen.index : bodyEnd;
  let k = 0;
  for (const mk of markers.filter((m) => m.index < mainIndex)) parts.push({ kind: 'partial', ...mk });
  const mainTag = mainOpen ? mainOpen[0] : '';
  for (const el of mainChildren) {
    k += 1;
    const html = src.slice(el.start, el.end);
    if (el.tag === 'script' || el.tag === 'template') continue;
    const block = (/data-block="([\w-]+)"/.exec(html.slice(0, 300)) || [])[1];
    parts.push({ kind: 'section', html, block, nth: k, tag: el.tag });
  }
  for (const mk of markers.filter((m) => m.index > mainIndex)) parts.push({ kind: 'partial', ...mk });
  if (!mainTag) return '';

  const items = parts
    .map((p, idx) => {
      const id = `${page.slug}-part-${idx}`;
      let name;
      let link = '';
      let locate;
      if (p.kind === 'partial') {
        name = PARTIAL_LABELS[p.name] || p.name;
        link = `<span class="path-chip">src/layouts/partials/${esc(p.name)}.html</span>`;
        const root = /<([a-z][\w-]*)\b[^>]*?(?:class="([^"]+)")?[^>]*>/i.exec(p.html.trim());
        const firstClass = root && root[2] ? `.${root[2].split(/\s+/)[0]}` : '';
        const idMatch = root ? /\bid="([^"]+)"/.exec(root[0]) : null;
        locate = idMatch ? `#${idMatch[1]}` : root ? `${root[1]}${firstClass}` : '';
      } else {
        const heading = headingText(p.html);
        const block = p.block && blocksBySlug.get(p.block);
        name = heading || (block ? block.title : `Section ${p.nth}`);
        if (block) link = `<a class="badge badge--primary" href="../blocks/${block.slug}.html">Block: ${esc(block.title)}</a>`;
        else {
          const comps = [...componentsBySlug.values()].filter((c) => new RegExp(`class="[^"]*\\b${c.slug}\\b`).test(p.html)).slice(0, 3);
          link = comps.map((c) => `<a class="badge" href="../components/${c.slug}.html">${esc(c.title)}</a>`).join(' ');
        }
        locate = `main > :nth-child(${p.nth})`;
      }
      const code = dedent(p.kind === 'partial' ? p.html : p.html);
      return `<li class="docs-anatomy__item">
            <details class="docs-anatomy__details">
              <summary class="docs-anatomy__summary">
                <span class="docs-anatomy__index" aria-hidden="true">${String(idx + 1).padStart(2, '0')}</span>
                <span class="docs-anatomy__name">${esc(name)}</span>
                <span class="docs-anatomy__kind">${p.kind === 'partial' ? 'Shared partial' : esc(`<${p.tag}>`)}</span>
                ${icon('chevron-down', 'icon icon--sm docs-anatomy__chevron')}
              </summary>
              <div class="docs-anatomy__body">
                <div class="docs-anatomy__tools">
                  ${link}
                  ${locate ? `<button type="button" class="btn btn--ghost btn--sm" data-docs-locate="${attr(locate)}" hidden>${icon('eye', 'icon icon--sm')} Show in preview</button>` : ''}
                </div>
                ${codeBlock(code, { lang: 'html', label: name })}
              </div>
            </details>
          </li>`;
    })
    .join('\n          ');
  return `<ol class="docs-anatomy" role="list" id="${page.slug}-anatomy">
          ${items}
        </ol>`;
}

function templatePage(site, family, page, flat, index) {
  const file = `docs/templates/${page.slug}.html`;
  const pageSrc = `../../${page.srcPath}`;
  const familyAssets = family.assets;
  const files = [
    { path: page.file, note: 'this page' },
    ...familyAssets.map((p) => ({ path: p, note: p.endsWith('.css') ? 'template styles' : 'template behaviour' })),
    { path: 'src/layouts/partials/', note: 'shared header, footer and sidebar (stamped by pages.js)' },
  ];
  const prompt = [
    `Template page: ${page.title} (vanilla-responsive-ui)`,
    `File: ${page.file}`,
    `Template folder: src/templates/${family.family}/ (${familyAssets.map((a) => path.basename(a)).join(', ') || 'no page assets'})`,
    'Shared chrome: src/layouts/partials/*.html — edit there, then run node .claude/skills/pages.js sync',
    'Blocks: src/blocks/*.html (sections carry data-block="name")',
    'Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA); validate with the three commands in CLAUDE.md',
  ].join('\n');
  const otherPages = family.pages
    .map((p) => `<li><a class="docs-chip-link" href="${p.slug}.html"${p === page ? ' aria-current="page"' : ''}>${esc(p.name)}</a></li>`)
    .join('\n          ');
  const actions = [
    `<a class="btn btn--sm" href="${pageSrc}">${icon('eye', 'icon icon--sm')} Open live page</a>`,
    copyButton(prompt, 'Copy path for AI', { success: 'Reference copied' }),
    `<button type="button" class="btn btn--sm btn--secondary" data-copy data-copy-text="${attr(page.source)}" data-copy-success="Page copied" hidden>${icon('copy', 'icon icon--sm')} <span data-copy-label>Copy full page HTML</span></button>`,
  ].join('\n          ');
  const body = [
    pageHeader({
      eyebrow: `Template · ${family.name}`,
      title: page.name,
      lead: esc(page.description),
      actions,
      meta: `<ul class="docs-chip-list" role="list" aria-label="Pages in the ${esc(family.name)} template">
          ${otherPages}
        </ul>`,
    }),
    section('preview', 'Live preview', previewFrame(pageSrc, `${page.title} live preview`, { mode: 'page', openLabel: 'Open full page' })),
    section('anatomy', 'Page anatomy', `<p class="text-muted">Every part of this page, in source order. Open a part to copy its code, or show it in the preview above. Sections built from a block link to that block.</p>\n        ${anatomy(site, page)}`),
    section('files', 'Files', fileList(files)),
    prevNext(flat, index, (x) => `${x.slug}.html`),
  ].join('\n\n');
  return [file, shell(site, { file, title: `${page.name} template`, description: page.description || page.title, body, toc: [{ id: 'preview', text: 'Live preview' }, { id: 'anatomy', text: 'Page anatomy' }, { id: 'files', text: 'Files' }] })];
}

function thumb(src, title) {
  return `<div class="docs-thumb" aria-hidden="true" data-docs-thumb><iframe src="${attr(src)}" title="${attr(title)}" loading="lazy" tabindex="-1"></iframe></div>`;
}

function templatesIndex(site) {
  const file = 'docs/templates/index.html';
  const groups = site.templates
    .map(
      (t) => `      <section class="docs-section" aria-labelledby="family-${t.family}">
        <h2 class="docs-section__title" id="family-${t.family}">${esc(t.name)} <span class="text-muted text-sm">${t.pages.length} page${t.pages.length > 1 ? 's' : ''}</span></h2>
        <ul class="docs-cards" role="list">
          ${t.pages
            .map(
              (p) => `<li class="docs-card">
            ${thumb(`../../${p.srcPath}`, `${p.title} thumbnail`)}
            <div class="docs-card__body">
              <h3 class="docs-card__title"><a href="${p.slug}.html">${esc(p.name)}</a></h3>
              <p class="text-sm text-muted">${esc(p.description)}</p>
            </div>
          </li>`
            )
            .join('\n          ')}
        </ul>
      </section>`
    )
    .join('\n\n');
  const body = [
    pageHeader({ eyebrow: 'Templates', title: 'Live templates', lead: `${site.templates.reduce((n, t) => n + t.pages.length, 0)} complete pages in ${site.templates.length} families. Every thumbnail is the real page running live. Open one to see it at any screen size, break it into parts and copy any section.` }),
    groups,
  ].join('\n\n');
  return [file, shell(site, { file, title: 'Templates', description: 'All template pages with live previews.', body, wide: true })];
}

function layoutsPage(site) {
  const file = 'docs/layouts.html';
  const items = site.layouts
    .map(
      (l) => `      <section class="docs-section" aria-labelledby="layout-${l.id}">
        <h2 class="docs-section__title" id="layout-${l.id}">${esc(l.name)}</h2>
        <p class="text-muted">${esc(l.description)} <strong>Regions:</strong> ${esc(l.regions)}.</p>
        ${previewFrame(`../${l.file.replace(/^src\//, '')}`, `${l.name} layout preview`, { mode: 'page', openLabel: 'Open layout' })}
        ${codeBlock(`node .claude/skills/pages.js new --family website --layout ${l.id} --name my-page --title "My page"`, { lang: 'bash', label: 'Create a page with this layout' })}
        <details class="docs-details">
          <summary>Full layout HTML</summary>
          ${codeBlock(l.source, { lang: 'html', path: l.file })}
        </details>
      </section>`
    )
    .join('\n\n');
  const body = [
    pageHeader({ eyebrow: 'Templates', title: 'Layouts', lead: 'Eight responsive page layouts. Each is a complete, valid page in <code>src/layouts/</code> that you can copy, preview at any width, or use as the starting point for a new page.', actions: `<a class="btn btn--sm" href="../builder/index.html">${icon('layout', 'icon icon--sm')} Open the page builder</a>` }),
    items,
  ].join('\n\n');
  return [file, shell(site, { file, title: 'Layouts', description: 'Eight responsive page layouts with live previews and code.', body, toc: site.layouts.map((l) => ({ id: `layout-${l.id}`, text: l.name })) })];
}

/* ---- Guides (docs/*.md) ---------------------------------------------------- */
function guideLink(fromFile) {
  const guideByFile = new Map(GUIDES.map((g) => [path.basename(g.file), g.slug]));
  return (href) => {
    if (/^(https?:|mailto:|#)/.test(href)) return href;
    const [p, hash = ''] = href.split('#');
    const frag = hash ? `#${hash}` : '';
    const abs = posix(path.normalize(path.join(path.dirname(fromFile), p)));
    const base = path.basename(abs);
    if (abs.startsWith('docs/') && guideByFile.has(base)) return `${guideByFile.get(base)}.html${frag}`;
    if (abs === 'docs/COMPONENTS.md') return `../components/${'button'}.html`;
    if (abs.startsWith('src/')) {
      const target = abs.replace(/^src\//, '');
      const full = path.join(SRC, target);
      if (fs.existsSync(full) && fs.statSync(full).isDirectory()) return `${BLOB_URL.replace('/blob/', '/tree/')}${abs}`;
      return `../../${target}${frag}`;
    }
    return `${BLOB_URL}${abs}${frag}`;
  };
}

function guidePage(site, guide) {
  const file = `docs/guides/${guide.slug}.html`;
  const md = read(path.join(ROOT, guide.file));
  const { title, html, toc } = renderMd(md, { linkFor: guideLink(guide.file) });
  const body = [
    pageHeader({ eyebrow: 'Guide', title: title || guide.title, actions: `<a class="btn btn--ghost btn--sm" href="${BLOB_URL}${guide.file}">${icon('edit', 'icon icon--sm')} Edit ${esc(path.basename(guide.file))} on GitHub</a>` }),
    `      <div class="docs-prose">\n${html}\n      </div>`,
  ].join('\n\n');
  return [file, shell(site, { file, title: title || guide.title, description: `${guide.title} guide for vanilla-responsive-ui.`, body, toc })];
}

/* ---- Foundations ------------------------------------------------------------ */
function foundationsPages(site) {
  const css = read(path.join(SRC, 'assets', 'css', 'tokens.css'));
  const light = tokenValues(css, /^:root\s*\{/m);
  const dark = tokenValues(css, /:root\[data-theme="dark"\]\s*\{/);
  const pages = [];
  const generatedCss = ['/* GENERATED by node .claude/skills/generate-doc.js — swatches and samples for the foundations pages. Do not edit. */'];

  // Colours
  const groups = [
    ['Surfaces', /^--color-(bg|surface|border)/],
    ['Text', /^--color-(text|link)/],
    ['Brand', /^--color-(primary|on-primary|focus|selection|accent)/],
    ['Status', /^--color-(success|warning|danger|info)/],
    ['Inverse bands', /^--color-inverse/],
    ['Charts', /^--chart-/],
  ];
  const colorTokens = Object.keys(light).filter((k) => /^--(color|chart)-/.test(k) && !/glow|sheen|overlay/.test(k));
  for (const t of colorTokens) generatedCss.push(`.sw${t.slice(1)} { background-color: var(${t}); }`);
  const colourTables = groups
    .map(([g, re]) => {
      const rows = colorTokens.filter((t) => re.test(t));
      if (!rows.length) return '';
      const id = `colors-${slugify(g)}`;
      return section(
        id,
        g,
        `<div class="table-wrapper" role="region" aria-labelledby="${id}" tabindex="0">
          <table class="table docs-token-table">
            <caption class="visually-hidden">${esc(g)} colour tokens</caption>
            <thead><tr><th scope="col">Swatch</th><th scope="col">Token</th><th scope="col">Light</th><th scope="col">Dark</th><th scope="col"><span class="visually-hidden">Copy</span></th></tr></thead>
            <tbody>
              ${rows
                .map(
                  (t) => `<tr><td><span class="docs-swatch sw${t.slice(1)}"></span></td><td><code>${esc(t)}</code></td><td><code>${esc(light[t] || '')}</code></td><td><code>${esc(dark[t] || light[t] || '')}</code></td><td><button type="button" class="btn btn--ghost btn--sm" data-copy data-copy-text="var(${esc(t)})" data-copy-success="Copied" hidden>${icon('copy', 'icon icon--sm')} <span data-copy-label>Copy</span><span class="visually-hidden"> var(${esc(t)})</span></button></td></tr>`
                )
                .join('\n              ')}
            </tbody>
          </table>
        </div>`
      );
    })
    .join('\n\n');
  const brands = ['indigo', 'teal', 'violet', 'rose', 'amber', 'slate'];
  pages.push([
    'docs/foundations/colors.html',
    {
      title: 'Colours',
      description: 'Colour tokens for light and dark themes, brand presets and the chart palette.',
      body: [
        pageHeader({ eyebrow: 'Foundations', title: 'Colours', lead: 'Every colour is a CSS custom property in <code>src/assets/css/tokens.css</code>, with light and dark values. Swatches below are live: switch the theme or a brand preset and they update. Contrast for each pair is verified by the test suite.' }),
        section('brand-presets', 'Brand presets', `<p class="text-muted">Set <code>data-brand</code> on <code>&lt;html&gt;</code>, or pick any colour in the theme panel.</p>\n        <ul class="docs-presets" role="list">${brands.map((b) => `<li><span class="swatch__chip swatch__chip--${b}"></span> <code>data-brand="${b}"</code></li>`).join('')}</ul>\n        ${codeBlock('<html lang="en" data-brand="teal" data-density="compact" data-radius="round">', { lang: 'html', label: 'Preset attributes' })}`),
        colourTables,
      ].join('\n\n'),
      toc: [{ id: 'brand-presets', text: 'Brand presets' }, ...groups.map(([g]) => ({ id: `colors-${slugify(g)}`, text: g }))],
    },
  ]);

  // Typography
  const sizes = Object.keys(light).filter((k) => k.startsWith('--font-size-'));
  for (const s of sizes) generatedCss.push(`.fs${s.slice(1)} { font-size: var(${s}); }`);
  const weights = Object.keys(light).filter((k) => k.startsWith('--font-weight-'));
  for (const w of weights) generatedCss.push(`.fw${w.slice(1)} { font-weight: var(${w}); }`);
  pages.push([
    'docs/foundations/typography.html',
    {
      title: 'Typography',
      description: 'Fluid type scale, weights, line heights and font stacks.',
      body: [
        pageHeader({ eyebrow: 'Foundations', title: 'Typography', lead: 'System font stacks (no web fonts) and a fluid type scale built with <code>clamp()</code> using <code>rem + vw</code>, so text scales with the viewport and still zooms to 200%.' }),
        section('scale', 'Type scale', `<ul class="docs-type-scale" role="list">
          ${sizes.map((s) => `<li><code>${esc(s)}</code> <span class="text-muted text-sm">${esc(light[s])}</span><span class="docs-type-sample fs${s.slice(1)}">Accessible by default</span></li>`).join('\n          ')}
        </ul>`),
        section('weights', 'Weights', `<ul class="docs-type-scale" role="list">${weights.map((w) => `<li><code>${esc(w)}</code> <span class="text-muted text-sm">${esc(light[w])}</span><span class="docs-type-sample fw${w.slice(1)}">The quick brown fox</span></li>`).join('')}</ul>`),
        section('fonts', 'Font stacks', codeBlock(`--font-main: ${light['--font-main']};\n--font-mono: ${light['--font-mono']};`, { lang: 'css', label: 'tokens.css' })),
      ].join('\n\n'),
      toc: [{ id: 'scale', text: 'Type scale' }, { id: 'weights', text: 'Weights' }, { id: 'fonts', text: 'Font stacks' }],
    },
  ]);

  // Spacing and shape
  const spacing = Object.keys(light).filter((k) => /^--spacing-(3xs|2xs|xs|sm|md|lg|xl|2xl|3xl)$/.test(k));
  for (const s of spacing) generatedCss.push(`.sp${s.slice(1)} { inline-size: var(${s}); }`);
  const radii = Object.keys(light).filter((k) => k.startsWith('--radius-'));
  for (const s of radii) generatedCss.push(`.rd${s.slice(1)} { border-radius: var(${s}); }`);
  const shadows = Object.keys(light).filter((k) => k.startsWith('--shadow-'));
  for (const s of shadows) generatedCss.push(`.sh${s.slice(1)} { box-shadow: var(${s}); }`);
  pages.push([
    'docs/foundations/spacing.html',
    {
      title: 'Spacing and shape',
      description: 'Spacing scale, radii and elevation tokens.',
      body: [
        pageHeader({ eyebrow: 'Foundations', title: 'Spacing and shape', lead: 'Spacing uses a 4px base in <code>rem</code>, so it grows with the user’s font size. Radii and shadows complete the shape language; density and corner presets change them globally.' }),
        section('spacing', 'Spacing', `<ul class="docs-scale" role="list">${spacing.map((s) => `<li><code>${esc(s)}</code><span class="text-muted text-sm">${esc(light[s])}</span><span class="docs-bar sp${s.slice(1)}"></span></li>`).join('')}</ul>`),
        section('radius', 'Radius', `<ul class="docs-shapes" role="list">${radii.map((s) => `<li><span class="docs-shape rd${s.slice(1)}"></span><code>${esc(s)}</code><span class="text-muted text-sm">${esc(light[s])}</span></li>`).join('')}</ul>`),
        section('elevation', 'Elevation', `<ul class="docs-shapes" role="list">${shadows.map((s) => `<li><span class="docs-shape docs-shape--raised sh${s.slice(1)}"></span><code>${esc(s)}</code></li>`).join('')}</ul>`),
      ].join('\n\n'),
      toc: [{ id: 'spacing', text: 'Spacing' }, { id: 'radius', text: 'Radius' }, { id: 'elevation', text: 'Elevation' }],
    },
  ]);

  // Icons
  const icons = fs.readdirSync(ICONS_DIR).filter((f) => f.endsWith('.svg') && f !== 'favicon.svg').sort();
  pages.push([
    'docs/foundations/icons.html',
    {
      title: 'Icons',
      description: 'The inline SVG icon library with copyable markup.',
      body: [
        pageHeader({ eyebrow: 'Foundations', title: 'Icons', lead: `${icons.length} stroke icons in <code>src/assets/icons/</code>. Inline them so they inherit <code>currentColor</code>; decorative icons get <code>aria-hidden="true"</code> and icon-only buttons carry a visually hidden name.` }),
        section('library', 'Library', `<ul class="docs-icons" role="list">
          ${icons
            .map((f) => {
              const name = path.basename(f, '.svg');
              const markup = icon(name);
              return `<li class="docs-icon">${markup}<span class="docs-icon__name">${esc(name)}</span><button type="button" class="btn btn--ghost btn--sm" data-copy data-copy-text="${attr(markup)}" data-copy-success="SVG copied" hidden>${icon('copy', 'icon icon--sm')} <span data-copy-label>Copy SVG</span><span class="visually-hidden"> for ${esc(name)}</span></button></li>`;
            })
            .join('\n          ')}
        </ul>`),
        section('usage', 'Usage', codeBlock('<!-- Decorative, next to visible text -->\n<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>\n\n<!-- Icon-only button: the name lives on the button -->\n<button type="button" class="btn btn--ghost btn--icon">\n  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">…</svg>\n  <span class="visually-hidden">Search</span>\n</button>', { lang: 'html', label: 'Accessible icons' })),
      ].join('\n\n'),
      toc: [{ id: 'library', text: 'Library' }, { id: 'usage', text: 'Usage' }],
    },
  ]);

  return {
    pages: pages.map(([file, p]) => [file, shell(site, { file, ...p })]),
    css: `${generatedCss.join('\n')}\n`,
  };
}

/* ---- Getting started, AI agents and home ------------------------------------ */
function gettingStarted(site) {
  const file = 'docs/getting-started.html';
  const body = [
    pageHeader({ eyebrow: 'Get started', title: 'Getting started', lead: 'Everything is plain HTML, CSS and JavaScript modules. There is nothing to install: serve the folder, open a page, copy what you need.' }),
    section('run', '1. Run it locally', `<p>Browsers block JavaScript modules on pages opened straight from disk (<code>file://</code>), which disables copy buttons, previews, charts and the page builder. Serve the repository with any static server instead:</p>
        ${codeBlock('git clone https://github.com/amuqtadir99/vanilla-responsive-ui.git\ncd vanilla-responsive-ui\npython3 -m http.server 8080        # or: node tests/lib/server.mjs 8080\n# open http://localhost:8080/src/', { lang: 'bash', label: 'Terminal' })}
        <p>Or use the hosted copy at <a href="https://amuqtadir99.github.io/vanilla-responsive-ui/src/">amuqtadir99.github.io/vanilla-responsive-ui</a>, published from <code>main</code> by GitHub Pages.</p>`),
    section('component', '2. Use a component', `<ol class="docs-steps">
          <li>Find it under <a href="components/${site.components[0].slug}.html">Components</a> and check the live preview.</li>
          <li>Copy the <strong>HTML</strong> tab into your page, and link the stylesheets listed under <strong>Files</strong>.</li>
          <li>Components with behaviour are initialised by <code>assets/js/main.js</code>, loaded once as a module.</li>
        </ol>
        ${codeBlock('<link rel="stylesheet" href="/assets/css/tokens.css">\n<link rel="stylesheet" href="/assets/css/themes.css">\n<link rel="stylesheet" href="/assets/css/base.css">\n<link rel="stylesheet" href="/assets/css/components/button.css">\n<script type="module" src="/assets/js/main.js"></script>', { lang: 'html', label: 'Minimal <head>' })}`),
    section('page', '3. Build a page', `<p>Three ways, from fastest to most flexible:</p>
        <ul class="docs-link-cards" role="list">
          <li><a href="../builder/index.html"><strong>Page builder</strong><span>Pick blocks, reorder them, preview at any width and download a finished HTML page.</span></a></li>
          <li><a href="templates/index.html"><strong>Start from a template</strong><span>Open a live template, copy the whole page or just the sections you need.</span></a></li>
          <li><a href="guides/layouts.html"><strong>Pages CLI</strong><span><code>node .claude/skills/pages.js new</code> creates a page with the right header, footer and styles.</span></a></li>
        </ul>`),
    section('theme', '4. Make it yours', `<p>Pick a brand preset with one attribute, or open <strong>Theme</strong> on any template page to try any colour and copy the generated CSS. See <a href="guides/theming.html">Theming</a> and <a href="foundations/colors.html">Colours</a>.</p>
        ${codeBlock('<html lang="en" data-brand="violet" data-density="comfortable" data-radius="round">', { lang: 'html', label: 'Presets' })}`),
    section('stack', '5. Move to your stack', `<p>The markup ports one to one to Razor, JSX, Vue, Svelte, Django and Blade. The <a href="guides/integration.html">integration guide</a> covers each framework, and every component page has a <strong>Use it in your stack</strong> section.</p>`),
    section('structure', 'Project structure', codeBlock(`src/
├── index.html          Documentation home
├── docs/               This documentation site (generated)
├── builder/            Page builder app
├── blocks/             ${site.blocks.length} page sections (hero, pricing, FAQ, …)
├── components/         ${site.components.length} UI components
├── layouts/            8 page layouts + shared partials
├── templates/          Complete multi-page templates
├── data/               Sample JSON for charts and grids
└── assets/             css/ (tokens, themes, base, layouts, blocks, components) · js/ · icons/ · images/`, { lang: 'text', label: 'Folders' })),
  ].join('\n\n');
  return [file, shell(site, { file, title: 'Getting started', description: 'Run the kit locally and use components, blocks and templates.', body, toc: [{ id: 'run', text: 'Run it locally' }, { id: 'component', text: 'Use a component' }, { id: 'page', text: 'Build a page' }, { id: 'theme', text: 'Make it yours' }, { id: 'stack', text: 'Move to your stack' }, { id: 'structure', text: 'Project structure' }] })];
}

function aiAgentsPage(site) {
  const file = 'docs/ai-agents.html';
  const prompt = `You are working in the vanilla-responsive-ui repository.
Read CLAUDE.md first (rules) and catalog.json (exact paths of every component, block, layout, template page and partial).
Task: <describe the page or change>.
Use existing blocks from src/blocks/ and components from src/components/; create new pages with node .claude/skills/pages.js new.
No dependencies, no inline scripts/styles/handlers, WCAG 2.2 AA.
Before finishing run: bash .claude/skills/validate-w3c.sh, bash .claude/skills/audit-a11y.sh, node tests/run-all.mjs.`;
  const body = [
    pageHeader({ eyebrow: 'Get started', title: 'Working with AI agents', lead: 'The repository is designed to be read by coding agents as well as people: rules in one file, a machine-readable index of everything, and copy buttons that give an agent exact file paths instead of vague descriptions.' }),
    section('files', 'What agents read', fileList([
      { path: 'CLAUDE.md', note: 'rules and coding standards' },
      { path: 'catalog.json', note: 'every component, block, layout, template page, partial, data file and skill, with paths (generated)' },
      { path: 'llms.txt', note: 'map of the documentation' },
      { path: '.claude/skills/', note: 'validate-w3c, audit-a11y, generate-doc, pages, add-component' },
    ])),
    section('copy', 'Copy path for AI', `<p>Every component, block and template page in these docs has a <strong>Copy path for AI</strong> button. It copies a short reference with the markup, CSS and JS paths, the accessibility notes and the rules, ready to paste into a prompt. Template pages also let you copy each section on its own.</p>`),
    section('prompt', 'Starter prompt', `${codeBlock(prompt, { lang: 'text', label: 'Prompt' })}`),
    section('builder', 'From the page builder', `<p>The <a href="../builder/index.html">page builder</a> exports the composed page as HTML, and also as an <strong>AI prompt</strong> that lists the blocks in order, so an agent can create the same page in your framework.</p>`),
  ].join('\n\n');
  return [file, shell(site, { file, title: 'Working with AI agents', description: 'Use the catalog, rules and copy buttons to work with AI coding agents.', body, toc: [{ id: 'files', text: 'What agents read' }, { id: 'copy', text: 'Copy path for AI' }, { id: 'prompt', text: 'Starter prompt' }, { id: 'builder', text: 'From the page builder' }] })];
}

function homePage(site) {
  const file = 'index.html';
  const families = site.templates
    .map(
      (t) => `<li class="docs-card">
            ${thumb(t.pages[0].srcPath, `${t.name} template thumbnail`)}
            <div class="docs-card__body">
              <h3 class="docs-card__title"><a href="docs/templates/${t.pages[0].slug}.html">${esc(t.name)}</a></h3>
              <p class="text-sm text-muted">${t.pages.length} page${t.pages.length > 1 ? 's' : ''} · ${esc(t.pages[0].description)}</p>
            </div>
          </li>`
    )
    .join('\n          ');
  const pageCount = site.templates.reduce((n, t) => n + t.pages.length, 0);
  const explore = [
    ['Components', `docs/components/${site.components[0].slug}.html`, 'grid', `${site.components.length} accessible UI components with live previews, code and framework usage.`],
    ['Blocks', `docs/blocks/${site.blocks[0].slug}.html`, 'layers', `${site.blocks.length} page sections: heroes, features, pricing, FAQ, CTAs and more.`],
    ['Page builder', 'builder/index.html', 'layout', 'Compose a page from blocks, preview it at any width and download the HTML.'],
    ['Foundations', 'docs/foundations/colors.html', 'sliders', 'Colours, type, spacing, shape and icons, all as design tokens.'],
    ['Guides', 'docs/guides/theming.html', 'file-text', 'Theming, layouts, data and charts, AI chat, accessibility and security.'],
    ['AI agents', 'docs/ai-agents.html', 'bot', 'Rules, a catalog of every file and copy-ready references for prompts.'],
  ]
    .map(([t, h, ic, d]) => `<li class="docs-feature"><span class="block-icon">${icon(ic)}</span><h3 class="docs-feature__title"><a href="${h}">${t}</a></h3><p class="text-sm text-muted">${d}</p></li>`)
    .join('\n          ');
  const body = `      <section class="docs-hero" aria-labelledby="home-title">
        <a class="announce" href="builder/index.html"><span class="announce__tag">New</span> Page builder and live docs ${icon('arrow-right', 'icon icon--sm')}</a>
        <h1 class="docs-hero__title" id="home-title">Accessible UI in <span class="text-gradient">plain HTML, CSS and JavaScript</span></h1>
        <p class="docs-hero__lead">Components, page blocks and complete templates with zero dependencies. Copy the code, compose pages in the builder, or hand exact file paths to your AI agent.</p>
        <div class="hero__actions">
          <a class="btn btn--lg" href="docs/getting-started.html">Get started ${icon('arrow-right')}</a>
          <a class="btn btn--lg btn--secondary" href="builder/index.html">${icon('layout')} Open the page builder</a>
        </div>
        <dl class="docs-stats">
          <div><dt>Components</dt><dd>${site.components.length}</dd></div>
          <div><dt>Blocks</dt><dd>${site.blocks.length}</dd></div>
          <div><dt>Template pages</dt><dd>${pageCount}</dd></div>
          <div><dt>Dependencies</dt><dd>0</dd></div>
        </dl>
      </section>

      <section class="docs-section" aria-labelledby="home-templates">
        <div class="docs-section__head">
          <h2 class="docs-section__title" id="home-templates">Live templates</h2>
          <a class="btn btn--ghost btn--sm" href="docs/templates/index.html">All ${pageCount} pages ${icon('arrow-right', 'icon icon--sm')}</a>
        </div>
        <ul class="docs-cards" role="list">
          ${families}
        </ul>
      </section>

      <section class="docs-section" aria-labelledby="home-explore">
        <h2 class="docs-section__title" id="home-explore">Explore</h2>
        <ul class="docs-features" role="list">
          ${explore}
        </ul>
      </section>

      <section class="docs-section" aria-labelledby="home-quick">
        <h2 class="docs-section__title" id="home-quick">Quick start</h2>
        ${codeBlock('git clone https://github.com/amuqtadir99/vanilla-responsive-ui.git\ncd vanilla-responsive-ui\npython3 -m http.server 8080\n# open http://localhost:8080/src/', { lang: 'bash', label: 'Terminal' })}
      </section>`;
  return [file, shell(site, { file, title: 'Introduction', description: 'Dependency-free, accessible UI components, blocks and templates in plain HTML, CSS and JavaScript, with a page builder and live documentation.', body, bodyClass: 'docs-home', wide: true })];
}

/* ==========================================================================
   Entry point
   ========================================================================== */
function build({ components, blocks }) {
  uid = 0;
  const site = { components, blocks, templates: loadTemplates(), layouts: loadLayouts() };
  const files = [];

  files.push(homePage(site));
  files.push(gettingStarted(site));
  files.push(aiAgentsPage(site));
  components.forEach((c, i) => files.push(itemPage(site, c, i, 'component')));
  blocks.forEach((b, i) => files.push(itemPage(site, b, i, 'block')));
  for (const c of components) files.push(previewPage(site, c, 'component'));
  for (const b of blocks) files.push(previewPage(site, b, 'block'));
  files.push(templatesIndex(site));
  const flat = site.templates.flatMap((t) => t.pages.map((p) => ({ ...p, t, title: `${t.name}: ${p.name}` })));
  flat.forEach((p, i) => files.push(templatePage(site, p.t, p, flat, i)));
  files.push(layoutsPage(site));
  for (const g of GUIDES) files.push(guidePage(site, g));
  const foundations = foundationsPages(site);
  files.push(...foundations.pages);
  files.push(['docs/assets/foundations.css', foundations.css]);

  return files.map(([file, content]) => [path.join(SRC, file), content]);
}

/** Generated files live under these paths; anything else there is stale. */
const GENERATED_DIRS = ['docs/components', 'docs/blocks', 'docs/templates', 'docs/guides', 'docs/foundations', 'docs/preview'].map((d) => path.join(SRC, d));
const GENERATED_TOP = ['docs/getting-started.html', 'docs/ai-agents.html', 'docs/layouts.html', 'docs/assets/foundations.css'].map((f) => path.join(SRC, f));

module.exports = { build, GENERATED_DIRS, GENERATED_TOP, highlight, renderMd, topLevelElements };
