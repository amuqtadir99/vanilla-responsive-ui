/**
 * Minimal, forgiving HTML tokenizer + tree builder for static checks.
 * Not a spec-complete parser (the Nu validator covers conformance); it is
 * good enough to walk well-formed templates and report line numbers.
 * Zero dependencies.
 */

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr',
]);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);
// Elements whose end tag may be omitted; closed implicitly by a sibling.
const AUTO_CLOSE = {
  p: new Set(['p', 'div', 'ul', 'ol', 'section', 'article', 'header', 'footer', 'nav', 'form', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
  li: new Set(['li']),
  option: new Set(['option']),
  dt: new Set(['dt', 'dd']),
  dd: new Set(['dt', 'dd']),
  tr: new Set(['tr']),
  td: new Set(['td', 'th', 'tr']),
  th: new Set(['td', 'th', 'tr']),
};

const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

/**
 * @typedef {object} Element
 * @property {'element'} type
 * @property {string} tag
 * @property {Map<string, string>} attrs
 * @property {Array<Element | Text>} children
 * @property {Element | null} parent
 * @property {number} line
 *
 * @typedef {object} Text
 * @property {'text'} type
 * @property {string} value
 * @property {Element} parent
 * @property {number} line
 */

/**
 * Parse an HTML string.
 * @param {string} source
 * @returns {{ root: Element, doctype: string | null, comments: Array<{value: string, line: number}> }}
 */
export function parse(source) {
  const root = { type: 'element', tag: '#root', attrs: new Map(), children: [], parent: null, line: 1 };
  const comments = [];
  let doctype = null;
  let current = root;
  let i = 0;
  let line = 1;

  const advance = (to) => {
    for (let k = i; k < to; k++) if (source.charCodeAt(k) === 10) line++;
    i = to;
  };

  const pushText = (value) => {
    if (value) current.children.push({ type: 'text', value: decodeEntities(value), parent: current, line });
  };

  while (i < source.length) {
    const lt = source.indexOf('<', i);
    if (lt === -1) {
      pushText(source.slice(i));
      advance(source.length);
      break;
    }
    if (lt > i) {
      const startLine = line;
      const text = source.slice(i, lt);
      advance(lt);
      if (text) current.children.push({ type: 'text', value: decodeEntities(text), parent: current, line: startLine });
    }

    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      const stop = end === -1 ? source.length : end + 3;
      comments.push({ value: source.slice(i + 4, end === -1 ? source.length : end), line });
      advance(stop);
      continue;
    }

    if (/^<!doctype/i.test(source.slice(i, i + 9))) {
      const end = source.indexOf('>', i);
      doctype = source.slice(i, end + 1);
      advance(end + 1);
      continue;
    }

    const closing = source[i + 1] === '/';
    const tagMatch = source.slice(i).match(closing ? /^<\/([a-zA-Z][\w:-]*)\s*>/ : /^<([a-zA-Z][\w:-]*)/);
    if (!tagMatch) {
      pushText('<');
      advance(i + 1);
      continue;
    }

    const tag = tagMatch[1].toLowerCase();

    if (closing) {
      advance(i + tagMatch[0].length);
      // Pop to the matching open element (tolerates omitted end tags).
      let node = current;
      while (node && node !== root && node.tag !== tag) node = node.parent;
      if (node && node !== root) current = node.parent;
      continue;
    }

    // Find the end of the start tag, respecting quoted attribute values.
    let j = i + tagMatch[0].length;
    let quote = null;
    for (; j < source.length; j++) {
      const ch = source[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
    }
    const rawAttrs = source.slice(i + tagMatch[0].length, j).replace(/\/\s*$/, '');
    const selfClosing = /\/\s*$/.test(source.slice(i + tagMatch[0].length, j));
    const startLine = line;
    advance(j + 1);

    const attrs = new Map();
    for (const m of rawAttrs.matchAll(ATTR_RE)) {
      const name = m[1].toLowerCase();
      if (!attrs.has(name)) attrs.set(name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ''));
    }

    // Implicitly close elements with optional end tags.
    while (AUTO_CLOSE[current.tag] && AUTO_CLOSE[current.tag].has(tag)) current = current.parent;

    const el = { type: 'element', tag, attrs, children: [], parent: current, line: startLine };
    current.children.push(el);

    if (VOID.has(tag) || (selfClosing && current.tag !== '#root' && isForeign(current, tag))) continue;

    if (RAW_TEXT.has(tag)) {
      const endRe = new RegExp(`</${tag}\\s*>`, 'i');
      const rest = source.slice(i);
      const m = rest.match(endRe);
      const end = m ? i + m.index : source.length;
      const text = source.slice(i, end);
      if (text) el.children.push({ type: 'text', value: tag === 'script' || tag === 'style' ? text : decodeEntities(text), parent: el, line });
      advance(m ? end + m[0].length : source.length);
      continue;
    }

    current = el;
  }

  return { root, doctype, comments };
}

function isForeign(parent, tag) {
  // Self-closing syntax is meaningful only inside SVG/MathML.
  for (let n = parent; n; n = n.parent) if (n.tag === 'svg' || n.tag === 'math') return true;
  return tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'rect';
}

/* ---- Tree helpers ------------------------------------------------------ */

/**
 * Depth-first list of all elements. The contents of <template> are inert
 * document fragments (not part of the page), so they are skipped; the
 * markup they hold is validated in its own source file (src/blocks/,
 * src/layouts/partials/).
 */
export function elements(node) {
  const out = [];
  const walk = (n) => {
    for (const child of n.children) {
      if (child.type === 'element') {
        out.push(child);
        if (child.tag !== 'template') walk(child);
      }
    }
  };
  walk(node);
  return out;
}

export function ancestors(el) {
  const out = [];
  for (let n = el.parent; n && n.tag !== '#root'; n = n.parent) out.push(n);
  return out;
}

export function closest(el, predicate) {
  for (let n = el; n && n.tag !== '#root'; n = n.parent) if (predicate(n)) return n;
  return null;
}

export function hasAttr(el, name) {
  return el.attrs.has(name);
}

export function attr(el, name) {
  return el.attrs.get(name);
}

export function classes(el) {
  return new Set((el.attrs.get('class') || '').split(/\s+/).filter(Boolean));
}

/** True if the element (or an ancestor) is hidden from assistive tech. */
export function isAriaHidden(el) {
  return Boolean(closest(el, (n) => n.attrs.get('aria-hidden') === 'true'));
}

/**
 * Visible text content, skipping aria-hidden subtrees (approximation of
 * the accessible name from content).
 */
export function textContent(node, { skipAriaHidden = true } = {}) {
  let out = '';
  for (const child of node.children) {
    if (child.type === 'text') out += child.value;
    else if (!(skipAriaHidden && child.attrs.get('aria-hidden') === 'true')) {
      if (child.tag === 'img') out += child.attrs.get('alt') || '';
      else out += textContent(child, { skipAriaHidden });
    }
  }
  return out;
}

export function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** Build an id → element map for the document. */
export function idMap(root) {
  const map = new Map();
  for (const el of elements(root)) {
    const id = el.attrs.get('id');
    if (id !== undefined && !map.has(id)) map.set(id, el);
  }
  return map;
}

/** Approximate accessible name computation. */
export function accessibleName(el, ids) {
  const labelledby = el.attrs.get('aria-labelledby');
  if (labelledby) {
    return normalize(
      labelledby
        .split(/\s+/)
        .map((id) => (ids.get(id) ? textContent(ids.get(id), { skipAriaHidden: false }) : ''))
        .join(' ')
    );
  }
  const label = el.attrs.get('aria-label');
  if (label && label.trim()) return normalize(label);
  if (el.tag === 'img') return normalize(el.attrs.get('alt') || '');
  if (el.tag === 'input' && ['submit', 'button', 'reset'].includes(el.attrs.get('type'))) {
    return normalize(el.attrs.get('value') || '');
  }
  const text = normalize(textContent(el));
  if (text) return text;
  return normalize(el.attrs.get('title') || '');
}

/** Elements that can receive keyboard focus. */
export function isFocusable(el) {
  if (el.attrs.has('disabled') || el.attrs.has('hidden')) return false;
  const tabindex = el.attrs.get('tabindex');
  if (tabindex !== undefined) return Number(tabindex) >= 0;
  if (el.tag === 'a' || el.tag === 'area') return el.attrs.has('href');
  if (el.tag === 'input') return el.attrs.get('type') !== 'hidden';
  return ['button', 'select', 'textarea', 'summary', 'iframe'].includes(el.tag);
}
