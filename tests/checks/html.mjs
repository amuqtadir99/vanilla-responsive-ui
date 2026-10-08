/**
 * HTML standards: document structure, semantics, references, CSP safety and
 * the zero-dependency rule. Applies to every .html file under src/.
 * Complete documents get the document-level checks; snippets get the rest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, elements, attr, hasAttr, idMap, closest, normalize, textContent } from '../lib/html.mjs';
import { SRC, findFiles, read, isFullDocument, rel } from '../lib/util.mjs';

export const name = 'HTML standards';

const IDREF_ATTRS = ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-owns', 'commandfor', 'form', 'list', 'headers'];
const BANNED_LIBS = /(jquery|bootstrap|tailwind|lodash|underscore|popper|alpine|htmx|fontawesome|font-awesome)(\.min)?\.(js|css)|cdn\.|unpkg\.com|jsdelivr|cdnjs/i;

function isExternal(url) {
  return /^(https?:)?\/\//i.test(url);
}

function isLocalPath(url) {
  return url && !isExternal(url) && !/^(mailto|tel|data|javascript):/i.test(url) && !url.startsWith('#') && !url.startsWith('/') && !url.startsWith('?');
}

export function run(report) {
  const files = findFiles(SRC, (n) => n.endsWith('.html'));

  for (const file of files) {
    const source = read(file);
    const full = isFullDocument(source);
    const { root, doctype } = parse(source);
    const all = elements(root);
    const ids = idMap(root);
    // Partials reference ids that live in the pages they are stamped into;
    // the stamped copies are checked there.
    const isPartial = rel(file).startsWith('src/layouts/partials/');

    /* ---- Document-level structure ------------------------------------ */
    if (full) {
      report.assert(doctype && /^<!doctype html>$/i.test(doctype), file, 1, 'doctype', 'Document must start with <!DOCTYPE html>.');

      const html = all.find((e) => e.tag === 'html');
      report.assert(html && attr(html, 'lang'), file, html?.line, 'html-lang', '<html> needs a non-empty lang attribute.');

      const head = all.find((e) => e.tag === 'head');
      const headEls = head ? head.children.filter((c) => c.type === 'element') : [];
      report.assert(
        headEls[0] && headEls[0].tag === 'meta' && (attr(headEls[0], 'charset') || '').toLowerCase() === 'utf-8',
        file, head?.line, 'meta-charset', 'First element in <head> must be <meta charset="utf-8">.'
      );

      const viewport = all.find((e) => e.tag === 'meta' && attr(e, 'name') === 'viewport');
      const vpContent = viewport ? attr(viewport, 'content') || '' : '';
      report.assert(/width=device-width/.test(vpContent), file, viewport?.line, 'meta-viewport', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
      report.assert(!/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(vpContent), file, viewport?.line, 'zoom', 'Viewport must not disable zoom (WCAG 1.4.4).');

      const title = all.find((e) => e.tag === 'title');
      report.assert(title && normalize(textContent(title)), file, title?.line, 'title', 'Document needs a non-empty <title>.');

      const description = all.find((e) => e.tag === 'meta' && attr(e, 'name') === 'description');
      if (!description) report.warn(file, head?.line, 'meta-description', 'Add a <meta name="description">.');

      const csp = all.find((e) => e.tag === 'meta' && (attr(e, 'http-equiv') || '').toLowerCase() === 'content-security-policy');
      if (!csp) report.warn(file, head?.line, 'csp', 'Add a Content-Security-Policy (meta tag or HTTP header).');
      else {
        const policy = attr(csp, 'content') || '';
        report.assert(!/unsafe-inline|unsafe-eval/.test(policy), file, csp.line, 'csp-strict', 'CSP must not allow unsafe-inline or unsafe-eval.');
      }

      const mains = all.filter((e) => e.tag === 'main');
      report.assert(mains.length === 1, file, mains[1]?.line, 'single-main', `Document must have exactly one <main> (found ${mains.length}).`);

      const h1s = all.filter((e) => e.tag === 'h1');
      report.assert(h1s.length === 1, file, h1s[1]?.line, 'single-h1', `Document must have exactly one <h1> (found ${h1s.length}).`);

      // First focusable element should be a skip link to the main content.
      const firstLink = all.find((e) => e.tag === 'a' && closest(e, (n) => n.tag === 'body'));
      const skip = firstLink && attr(firstLink, 'href');
      report.assert(
        skip && skip.startsWith('#') && ids.has(skip.slice(1)) && ids.get(skip.slice(1)).tag === 'main',
        file, firstLink?.line, 'skip-link', 'First link in <body> must be a skip link to the <main> element.'
      );

      // Scripts must not block rendering.
      for (const s of all.filter((e) => e.tag === 'script')) {
        if (!hasAttr(s, 'src')) continue;
        const nonBlocking = attr(s, 'type') === 'module' || hasAttr(s, 'defer') || hasAttr(s, 'async');
        report.assert(nonBlocking, file, s.line, 'render-blocking', 'Scripts must be type="module", defer or async.');
      }
    }

    /* ---- Heading order (no skipped levels) --------------------------- */
    let previous = full ? 0 : null;
    for (const h of all.filter((e) => /^h[1-6]$/.test(e.tag))) {
      const level = Number(h.tag[1]);
      if (previous !== null && level > previous + 1) {
        report.error(file, h.line, 'heading-order', `<${h.tag}> skips a level after <h${previous}>.`);
      } else report.pass();
      if (closest(h, (n) => n.tag === 'dialog') === null) previous = level;
    }

    /* ---- Unique ids and valid references ----------------------------- */
    const seen = new Map();
    for (const el of all) {
      const id = attr(el, 'id');
      if (id === undefined) continue;
      if (seen.has(id)) report.error(file, el.line, 'duplicate-id', `Duplicate id "${id}" (first on line ${seen.get(id)}).`);
      else report.pass();
      seen.set(id, el.line);
    }

    for (const el of all) {
      for (const a of IDREF_ATTRS) {
        const value = attr(el, a);
        if (!value) continue;
        // data-* style references are not IDREFs; `for` on <output> lists ids too.
        if (isPartial) continue;
        for (const ref of value.split(/\s+/)) {
          report.assert(ids.has(ref), file, el.line, 'idref', `${a}="${ref}" references a missing id.`);
        }
      }
      const tabRef = attr(el, 'data-tab');
      if (tabRef) report.assert(ids.has(tabRef), file, el.line, 'idref', `data-tab="${tabRef}" references a missing id.`);
      const matchRef = attr(el, 'data-match');
      if (matchRef) report.assert(ids.has(matchRef), file, el.line, 'idref', `data-match="${matchRef}" references a missing id.`);
    }

    /* ---- Links and resources ----------------------------------------- */
    for (const el of all) {
      for (const a of ['href', 'src']) {
        const url = attr(el, a);
        if (url === undefined) continue;

        if (url.startsWith('#') && url.length > 1 && !isPartial) {
          report.assert(ids.has(decodeURIComponent(url.slice(1))), file, el.line, 'fragment', `${a}="${url}" points to a missing id.`);
        }
        if (isLocalPath(url) && full) {
          const target = path.resolve(path.dirname(file), url.split(/[?#]/)[0]);
          const exists = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
          report.assert(exists, file, el.line, 'broken-link', `${a}="${url}" does not resolve to a file.`);
        }
        if ((el.tag === 'script' || (el.tag === 'link' && /stylesheet|preload|modulepreload/.test(attr(el, 'rel') || ''))) && isExternal(url)) {
          report.error(file, el.line, 'no-external-deps', `External ${el.tag} "${url}" is not allowed (zero-dependency rule).`);
        }
        if (BANNED_LIBS.test(url)) {
          report.error(file, el.line, 'no-external-deps', `"${url}" looks like a third-party library or CDN.`);
        }
      }

      if (attr(el, 'target') === '_blank') {
        report.assert(/noopener|noreferrer/.test(attr(el, 'rel') || ''), file, el.line, 'noopener', 'target="_blank" needs rel="noopener noreferrer".');
      }
    }

    /* ---- CSP safety: no inline handlers, styles or scripts ----------- */
    for (const el of all) {
      for (const a of el.attrs.keys()) {
        if (/^on[a-z]+$/.test(a)) report.error(file, el.line, 'no-inline-handlers', `Inline event handler "${a}" is not allowed; use addEventListener in a module.`);
      }
      if (hasAttr(el, 'style')) report.error(file, el.line, 'no-inline-style', 'Inline style attribute is not allowed; use a CSS class.');
      if (el.tag === 'style') report.error(file, el.line, 'no-inline-style', '<style> blocks are not allowed; use an external stylesheet.');
      if (el.tag === 'script' && !hasAttr(el, 'src') && !['application/ld+json', 'application/json'].includes(attr(el, 'type'))) {
        report.error(file, el.line, 'no-inline-script', 'Inline <script> is not allowed; use an external module.');
      }
      const href = attr(el, 'href') || '';
      if (/^javascript:/i.test(href)) report.error(file, el.line, 'no-javascript-url', 'javascript: URLs are not allowed.');
    }

    /* ---- Semantics ---------------------------------------------------- */
    for (const el of all) {
      if (el.tag === 'b' || el.tag === 'i' || el.tag === 'font' || el.tag === 'center' || el.tag === 'marquee') {
        report.warn(file, el.line, 'semantics', `Prefer semantic elements over <${el.tag}>.`);
      }
      if (el.tag === 'div' && attr(el, 'role') === 'button') {
        report.error(file, el.line, 'semantics', 'Use a <button> instead of <div role="button">.');
      }
      if (el.tag === 'a' && attr(el, 'href') === '#') {
        report.error(file, el.line, 'semantics', 'href="#" is not a real destination; use a <button> for actions.');
      }
    }
  }

  return files.length;
}
