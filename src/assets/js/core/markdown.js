/**
 * Minimal, safe Markdown → DOM renderer for chat messages.
 *
 * Supports paragraphs, line breaks, headings (rendered as bold lines so they
 * never disturb the page heading outline), bullet and numbered lists,
 * blockquotes, fenced code blocks with a copy button, inline code, bold,
 * italic and links.
 *
 * Safety: the output is built with createElement/textContent only — no
 * innerHTML — so model output can never inject markup or scripts. Links are
 * restricted to http(s), mailto and same-origin relative URLs.
 *
 * Works on partial input, so it can re-render while a reply streams in.
 *
 * @module core/markdown
 */
import { createElement, uniqueId } from './dom.js';

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function safeHref(url) {
  try {
    const parsed = new URL(url, window.location.href);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/g;

/** Render inline Markdown into an array of nodes. */
export function renderInline(text) {
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push(document.createTextNode(text.slice(last, match.index)));
    const [token] = match;
    if (match[1]) {
      nodes.push(createElement('code', { text: token.slice(1, -1) }));
    } else if (match[2]) {
      nodes.push(createElement('strong', { children: renderInline(token.slice(2, -2)) }));
    } else if (match[3]) {
      nodes.push(createElement('em', { children: renderInline(token.slice(1, -1)) }));
    } else if (match[4]) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const href = safeHref(url);
      if (href) {
        const external = new URL(href).origin !== window.location.origin;
        const attrs = { href };
        if (external) Object.assign(attrs, { target: '_blank', rel: 'noopener noreferrer' });
        const link = createElement('a', { attrs, children: renderInline(label) });
        if (external) link.append(createElement('span', { className: 'visually-hidden', text: ' (opens in a new tab)' }));
        nodes.push(link);
      } else {
        nodes.push(document.createTextNode(label));
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
  return nodes;
}

function codeBlock(code, lang) {
  const id = uniqueId('code');
  const copy = createElement('button', {
    className: 'btn btn--ghost btn--sm',
    attrs: { type: 'button', 'data-copy': '', 'data-copy-target': `#${id}` },
    children: [createElement('span', { text: 'Copy code', attrs: { 'data-copy-label': '' } })],
  });
  return createElement('div', {
    className: 'code-block',
    children: [
      createElement('div', { className: 'code-block__header', children: [createElement('span', { text: lang || 'code' }), copy] }),
      createElement('pre', {
        attrs: { tabindex: '0', role: 'region', 'aria-label': `${lang || 'Code'} example` },
        children: [createElement('code', { text: code, attrs: { id } })],
      }),
    ],
  });
}

/**
 * Render a Markdown string to a DocumentFragment.
 * @param {string} source
 * @returns {DocumentFragment}
 */
export function renderMarkdown(source) {
  const fragment = document.createDocumentFragment();
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const p = createElement('p');
    paragraph.forEach((line, index) => {
      if (index) p.append(createElement('br'));
      p.append(...renderInline(line));
    });
    fragment.append(p);
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      flushParagraph();
      const body = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      fragment.append(codeBlock(body.join('\n'), fence[1]));
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      fragment.append(createElement('p', { className: 'md-heading', children: [createElement('strong', { children: renderInline(heading[2]) })] }));
      i += 1;
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      flushParagraph();
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const list = createElement(ordered ? 'ol' : 'ul');
      while (i < lines.length && re.test(lines[i])) {
        list.append(createElement('li', { children: renderInline(lines[i].match(re)[1]) }));
        i += 1;
      }
      fragment.append(list);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      fragment.append(createElement('blockquote', { children: [createElement('p', { children: renderInline(quote.join(' ')) })] }));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
    i += 1;
  }
  flushParagraph();
  return fragment;
}

/** Plain text version of Markdown (for announcements and copying). */
export function toPlainText(source) {
  return String(source)
    .replace(/```[\w+-]*\n?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}
