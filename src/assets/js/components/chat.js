/**
 * AI chat UI: streaming assistant replies, Markdown, code blocks, tool-call
 * cards (agent steps), inline charts, sources, follow-up suggestions,
 * message actions, history persistence and a floating widget.
 *
 * Markup: see src/components/chat.html and chat-widget.html.
 *
 * Connect your own model or agent backend:
 *   1. data-chat-endpoint="/api/chat"  → POST { messages, persona } and stream
 *      the reply as NDJSON, Server-Sent Events or plain text (see below), or
 *   2. registerTransport('my-agent', async function* ({ messages, signal }) { … })
 *      and set data-chat-transport="my-agent".
 *   Without either, a built-in mock (demo/chat-mock.js) answers from the
 *   sample data so the UI can be explored offline.
 *
 * Stream events (one JSON object per NDJSON line or SSE "data:" line):
 *   { "type": "text", "delta": "Hello" }
 *   { "type": "tool", "id": "t1", "name": "search_orders", "status": "running" | "done" | "error",
 *     "input": {…}, "output": "summary text" }
 *   { "type": "chart", "viz": "line", "title": "…", "x": "month", "series": "revenue:Revenue",
 *     "format": "currency-compact", "xFormat": "short-month", "rows": [ … ] }
 *   { "type": "sources", "items": [{ "title": "…", "url": "https://…" }] }
 *   { "type": "suggestions", "items": ["Follow-up question", …] }
 *   { "type": "error", "message": "…" }
 *   { "type": "done" }
 * Every event is also dispatched as a "chat:event" CustomEvent on the chat
 * element, so pages can render extra UI (e.g. an agent run panel).
 *
 * Accessibility: the log is a labelled, focusable region (role="log").
 * Streaming text is not read token by token; when a reply finishes it is
 * announced once through a polite live region, as are tool steps. Enter
 * sends, Shift+Enter adds a line, Escape stops a reply (or closes the
 * widget). All model output is rendered with textContent / createElement.
 *
 * @module components/chat
 */
import { qs, qsa, on, claim, createElement } from '../core/dom.js';
import { renderMarkdown, toPlainText } from '../core/markdown.js';
import { announce } from '../core/announce.js';
import { getItem, setItem, removeItem } from '../core/storage.js';
import { copyText } from '../core/clipboard.js';
import { init as initCopy } from './copy.js';

const transports = new Map();
const MAX_STORED = 40;
const NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  copy: 'M9 9h13v13H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  up: 'M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z',
  down: 'M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z',
  tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  check: 'M20 6 9 17l-5-5',
  bot: 'M3 8h18v12H3zM12 8V4M8 2h8M9 13v2M15 13v2',
};

function icon(name) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'icon icon--sm');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

/**
 * Register a transport usable via data-chat-transport="<name>".
 * A transport is an async generator function receiving
 * { messages: [{ role, text }], persona, signal, element } and yielding events.
 * @param {string} name
 * @param {Function} transport
 */
export function registerTransport(name, transport) {
  transports.set(name, transport);
}

/* ---- HTTP transport ---------------------------------------------------- */

/**
 * Stream a reply from an HTTP endpoint. Supports NDJSON
 * (application/x-ndjson), Server-Sent Events (text/event-stream) and plain
 * text streams.
 * @param {string} endpoint
 * @param {{ headers?: Record<string, string> }} [options]
 */
export function httpTransport(endpoint, { headers = {} } = {}) {
  return async function* stream({ messages, persona, signal }) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson, text/event-stream, text/plain', ...headers },
      body: JSON.stringify({ messages, persona }),
      signal,
    });
    if (!response.ok) throw new Error(`The assistant service returned HTTP ${response.status}.`);

    const type = response.headers.get('content-type') || '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const parse = (payload) => {
      try {
        const event = JSON.parse(payload);
        return typeof event === 'string' ? { type: 'text', delta: event } : event;
      } catch {
        return { type: 'text', delta: payload };
      }
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      if (!type.includes('ndjson') && !type.includes('event-stream') && !type.includes('json')) {
        yield { type: 'text', delta: chunk };
        continue;
      }

      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith(':') || line.startsWith('event:') || line.startsWith('id:')) continue;
        const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
        if (payload === '[DONE]') return;
        yield parse(payload);
      }
    }
    if (buffer.trim()) yield parse(buffer.trim().replace(/^data:\s*/, ''));
  };
}

async function resolveTransport(root) {
  if (root.dataset.chatEndpoint) return httpTransport(root.dataset.chatEndpoint);
  const named = root.dataset.chatTransport;
  if (named && transports.has(named)) return transports.get(named);
  const { createMockTransport } = await import('../demo/chat-mock.js');
  return createMockTransport(root.dataset.chatPersona || 'general');
}

/* ---- Rendering --------------------------------------------------------- */
function messageShell(role) {
  const content = createElement('div', { className: 'chat__content' });
  const children = [];
  if (role === 'assistant') {
    children.push(createElement('span', { className: 'avatar avatar--sm avatar--soft chat__avatar', attrs: { 'aria-hidden': 'true' }, children: [icon('bot')] }));
  }
  children.push(
    createElement('div', {
      className: 'chat__bubble',
      children: [createElement('p', { className: 'visually-hidden', text: role === 'user' ? 'You said:' : 'Assistant said:' }), content],
    })
  );
  const el = createElement('div', { className: `chat__message chat__message--${role}`, children });
  return { el, content };
}

function renderToolCard(part) {
  const status = part.status || 'running';
  const label = { running: 'Running', done: 'Completed', error: 'Failed' }[status] || status;
  const details = createElement('details', { className: `chat__tool chat__tool--${status}` });
  const summary = createElement('summary', {
    children: [
      icon(status === 'done' ? 'check' : 'tool'),
      createElement('span', { className: 'chat__tool-name', text: part.title || part.name || 'Tool' }),
      createElement('span', { className: 'chat__tool-status', text: label }),
    ],
  });
  details.append(summary);
  if (part.input !== undefined) {
    details.append(
      createElement('p', { className: 'chat__tool-label', text: 'Input' }),
      createElement('pre', { className: 'chat__tool-io', text: typeof part.input === 'string' ? part.input : JSON.stringify(part.input, null, 2) })
    );
  }
  if (part.output !== undefined) {
    details.append(
      createElement('p', { className: 'chat__tool-label', text: 'Result' }),
      createElement('pre', { className: 'chat__tool-io', text: typeof part.output === 'string' ? part.output : JSON.stringify(part.output, null, 2) })
    );
  }
  return details;
}

function renderSources(part) {
  const list = createElement('ol', { className: 'chat__sources-list' });
  for (const item of part.items || []) {
    let href = null;
    try {
      const url = new URL(item.url, window.location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') href = url.href;
    } catch {
      href = null;
    }
    const external = href && new URL(href).origin !== window.location.origin;
    list.append(
      createElement('li', {
        children: [
          href
            ? createElement('a', {
                text: item.title || href,
                attrs: external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href },
              })
            : createElement('span', { text: item.title || '' }),
        ],
      })
    );
  }
  return createElement('div', {
    className: 'chat__sources',
    children: [createElement('p', { className: 'chat__tool-label', text: 'Sources' }), list],
  });
}

async function renderChartPart(part) {
  const title = part.title || 'Chart';
  const figure = createElement('figure', {
    className: 'chart chat__chart',
    attrs: {
      'data-viz': part.viz || 'line',
      'data-x': part.x || 'label',
      'data-x-format': part.xFormat || 'text',
      'data-series': part.series || 'value:Value',
      'data-format': part.format || 'number',
      'data-height': String(part.height || 200),
    },
    children: [createElement('figcaption', { className: 'chart__caption', children: [createElement('span', { className: 'chart__title', text: title })] })],
  });
  // Render after insertion so the chart can measure its width.
  window.requestAnimationFrame(async () => {
    const { renderChart } = await import('./chart.js');
    renderChart(figure, Array.isArray(part.rows) ? part.rows : []);
  });
  return figure;
}

/* ---- Controller -------------------------------------------------------- */
function setupChat(root) {
  const log = qs('[data-chat-log]', root);
  const form = qs('[data-chat-form]', root);
  const input = qs('[data-chat-input]', root) || qs('textarea', form);
  const send = qs('[data-chat-send]', root);
  const stop = qs('[data-chat-stop]', root);
  const clear = qs('[data-chat-clear]', root);
  const suggestionsBox = qs('[data-chat-suggestions]', root);
  const attach = qs('[data-chat-attach]', root);
  const fileInput = qs('[data-chat-file]', root);
  const attachments = qs('[data-chat-attachments]', root);
  const storageKey = root.dataset.chatStorage || '';
  const welcome = Array.from(log.children).map((node) => node.cloneNode(true));

  const state = { messages: [], controller: null, streaming: false, files: [] };

  if (clear) clear.hidden = false;
  if (suggestionsBox) suggestionsBox.hidden = false;
  if (attach && fileInput) attach.hidden = false;

  /* Auto-growing textarea (CSSOM, CSP-safe) */
  const grow = () => {
    input.style.setProperty('height', 'auto');
    input.style.setProperty('height', `${Math.min(input.scrollHeight, 200)}px`);
  };
  on(input, 'input', grow);

  let pinned = true;
  on(log, 'scroll', () => {
    pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  });
  const scroll = (force = false) => {
    if (force || pinned) log.scrollTop = log.scrollHeight;
  };

  function persist() {
    if (!storageKey) return;
    const data = state.messages.slice(-MAX_STORED).map((m) => ({
      role: m.role,
      parts: m.parts.filter((p) => ['text', 'tool', 'chart', 'sources', 'error'].includes(p.type)),
    }));
    setItem(storageKey, JSON.stringify(data));
  }

  function setStreaming(on_) {
    state.streaming = on_;
    log.setAttribute('aria-busy', String(on_));
    root.classList.toggle('chat--streaming', on_);
    if (stop) stop.hidden = !on_;
    if (send) send.hidden = on_;
  }

  function setSuggestions(items) {
    if (!suggestionsBox) return;
    suggestionsBox.replaceChildren(
      ...items.slice(0, 4).map((text) =>
        createElement('button', { className: 'chip', text, attrs: { type: 'button', 'data-chat-suggestion': '' } })
      )
    );
    suggestionsBox.hidden = items.length === 0;
  }

  function textOf(message) {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }

  function renderUser(message) {
    const { el, content } = messageShell('user');
    content.append(createElement('p', { className: 'chat__user-text', text: textOf(message) }));
    for (const file of message.files || []) {
      content.append(createElement('p', { className: 'chat__file-chip', children: [icon('copy'), createElement('span', { text: file })] }));
    }
    log.append(el);
    scroll(true);
  }

  function actionsFor(message, index) {
    const bar = createElement('div', { className: 'chat__message-actions' });
    const copyBtn = createElement('button', {
      className: 'btn btn--ghost btn--icon btn--sm',
      attrs: { type: 'button' },
      children: [icon('copy'), createElement('span', { className: 'visually-hidden', text: 'Copy response' })],
    });
    on(copyBtn, 'click', async () => {
      const ok = await copyText(toPlainText(textOf(message)));
      announce(ok ? 'Response copied to clipboard.' : 'Copy failed.');
    });
    const regenerate = createElement('button', {
      className: 'btn btn--ghost btn--icon btn--sm',
      attrs: { type: 'button' },
      children: [icon('refresh'), createElement('span', { className: 'visually-hidden', text: 'Regenerate response' })],
    });
    on(regenerate, 'click', () => {
      if (state.streaming) return;
      const userIndex = index - 1;
      const user = state.messages[userIndex];
      if (!user || user.role !== 'user') return;
      state.messages.splice(index, 1);
      bar.closest('.chat__message').remove();
      respond();
    });
    const vote = (dir, label) => {
      const b = createElement('button', {
        className: 'btn btn--ghost btn--icon btn--sm',
        attrs: { type: 'button', 'aria-pressed': 'false' },
        children: [icon(dir), createElement('span', { className: 'visually-hidden', text: label })],
      });
      on(b, 'click', () => {
        const pressed = b.getAttribute('aria-pressed') === 'true';
        for (const other of qsa('[aria-pressed]', bar)) other.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-pressed', String(!pressed));
        if (!pressed) announce('Thanks for the feedback.');
        root.dispatchEvent(new CustomEvent('chat:feedback', { bubbles: true, detail: { message, value: pressed ? null : dir } }));
      });
      return b;
    };
    bar.append(copyBtn, regenerate, vote('up', 'Good response'), vote('down', 'Bad response'));
    return bar;
  }

  async function renderPart(part, container) {
    if (part.type === 'text') {
      const el = createElement('div', { className: 'chat__markdown' });
      el.append(renderMarkdown(part.text));
      container.append(el);
      initCopy(el);
      return el;
    }
    let el;
    if (part.type === 'tool') el = renderToolCard(part);
    else if (part.type === 'chart') el = await renderChartPart(part);
    else if (part.type === 'sources') el = renderSources(part);
    else if (part.type === 'error') el = createElement('p', { className: 'chat__error', attrs: { role: 'alert' }, text: part.message });
    if (el) container.append(el);
    return el;
  }

  async function renderAssistant(message, index) {
    const { el, content } = messageShell('assistant');
    log.append(el);
    for (const part of message.parts) await renderPart(part, content);
    el.querySelector('.chat__bubble').append(actionsFor(message, index));
  }

  async function respond() {
    const message = { role: 'assistant', parts: [] };
    state.messages.push(message);
    const index = state.messages.length - 1;
    const { el, content } = messageShell('assistant');
    const typing = createElement('div', {
      className: 'chat__typing',
      children: [createElement('span'), createElement('span'), createElement('span'), createElement('span', { className: 'visually-hidden', text: 'Assistant is typing' })],
    });
    content.append(typing);
    log.append(el);
    scroll(true);

    const elements = new Map();
    let currentText = null;
    let textEl = null;
    state.controller = new AbortController();
    setStreaming(true);
    setSuggestions([]);

    const history = state.messages.slice(0, -1).map((m) => ({ role: m.role, text: textOf(m), files: m.files || [] }));

    try {
      const transport = await resolveTransport(root);
      for await (const raw of transport({ messages: history, persona: root.dataset.chatPersona || 'general', signal: state.controller.signal, element: root })) {
        const event = raw && typeof raw === 'object' ? raw : { type: 'text', delta: String(raw) };
        if (!event.type && event.delta) event.type = 'text';
        root.dispatchEvent(new CustomEvent('chat:event', { bubbles: true, detail: event }));
        typing.remove();

        if (event.type === 'text') {
          if (!currentText) {
            currentText = { type: 'text', text: '' };
            message.parts.push(currentText);
            textEl = createElement('div', { className: 'chat__markdown' });
            content.append(textEl);
          }
          currentText.text += event.delta || '';
          textEl.replaceChildren(renderMarkdown(currentText.text));
        } else if (event.type === 'tool') {
          currentText = null;
          const existing = message.parts.find((p) => p.type === 'tool' && p.id === event.id);
          const part = existing ? Object.assign(existing, event) : { ...event };
          if (!existing) message.parts.push(part);
          const card = renderToolCard(part);
          if (elements.has(part.id)) elements.get(part.id).replaceWith(card);
          else content.append(card);
          elements.set(part.id, card);
          announce(`${part.title || part.name}: ${part.status === 'done' ? 'completed' : part.status === 'error' ? 'failed' : 'running'}.`);
        } else if (event.type === 'chart' || event.type === 'sources' || event.type === 'error') {
          currentText = null;
          const part = { ...event };
          message.parts.push(part);
          await renderPart(part, content);
        } else if (event.type === 'suggestions') {
          setSuggestions(event.items || []);
        } else if (event.type === 'done') {
          break;
        }
        scroll();
      }
    } catch (error) {
      typing.remove();
      if (error.name === 'AbortError') {
        message.parts.push({ type: 'text', text: '\n\n*Stopped.*' });
        if (textEl) textEl.replaceChildren(renderMarkdown(textOf(message)));
        else content.append(renderMarkdown('*Stopped.*'));
      } else {
        const part = { type: 'error', message: error.message || 'Something went wrong. Please try again.' };
        message.parts.push(part);
        await renderPart(part, content);
      }
    } finally {
      setStreaming(false);
      state.controller = null;
      if (textEl) initCopy(textEl);
      el.querySelector('.chat__bubble').append(actionsFor(message, index));
      const summary = toPlainText(textOf(message));
      announce(summary ? `Assistant: ${summary.slice(0, 400)}` : 'Assistant replied.');
      persist();
      root.dispatchEvent(new CustomEvent('chat:done', { bubbles: true, detail: { message } }));
      scroll();
    }
  }

  async function submit(text) {
    const value = text.trim();
    if (!value || state.streaming) return;
    const files = state.files.map((f) => f.name);
    const message = { role: 'user', parts: [{ type: 'text', text: value }], files };
    state.messages.push(message);
    renderUser(message);
    input.value = '';
    grow();
    state.files = [];
    if (attachments) attachments.replaceChildren();
    await respond();
  }

  on(form, 'submit', (event) => {
    event.preventDefault();
    submit(input.value);
  });

  on(input, 'keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submit(input.value);
    } else if (event.key === 'Escape' && state.streaming) {
      event.preventDefault();
      event.stopPropagation();
      state.controller.abort();
    }
  });

  if (stop) on(stop, 'click', () => state.controller && state.controller.abort());

  on(root, 'click', (event) => {
    const chip = /** @type {Element} */ (event.target).closest('[data-chat-suggestion]');
    if (chip && root.contains(chip)) submit(chip.textContent);
  });

  if (clear) {
    on(clear, 'click', () => {
      if (state.controller) state.controller.abort();
      state.messages = [];
      if (storageKey) removeItem(storageKey);
      log.replaceChildren(...welcome.map((node) => node.cloneNode(true)));
      announce('Started a new conversation.');
      root.dispatchEvent(new CustomEvent('chat:clear', { bubbles: true }));
      input.focus();
    });
  }

  if (attach && fileInput && attachments) {
    on(attach, 'click', () => fileInput.click());
    on(fileInput, 'change', () => {
      state.files = Array.from(fileInput.files || []).slice(0, 3);
      attachments.replaceChildren(
        ...state.files.map((file, i) => {
          const remove = createElement('button', {
            className: 'chip__remove',
            attrs: { type: 'button' },
            children: [createElement('span', { text: '×', attrs: { 'aria-hidden': 'true' } }), createElement('span', { className: 'visually-hidden', text: `Remove ${file.name}` })],
          });
          on(remove, 'click', () => {
            state.files.splice(i, 1);
            remove.closest('.chip').remove();
            input.focus();
          });
          return createElement('span', { className: 'chip chip--static', children: [createElement('span', { text: file.name }), remove] });
        })
      );
      announce(`${state.files.length} file${state.files.length === 1 ? '' : 's'} attached.`);
      fileInput.value = '';
    });
  }

  // Restore history.
  if (storageKey) {
    try {
      const saved = JSON.parse(getItem(storageKey) || '[]');
      if (Array.isArray(saved) && saved.length) {
        (async () => {
          for (const m of saved) {
            if (!m || !Array.isArray(m.parts) || !['user', 'assistant'].includes(m.role)) continue;
            const message = { role: m.role, parts: m.parts };
            state.messages.push(message);
            if (m.role === 'user') renderUser(message);
            else await renderAssistant(message, state.messages.length - 1);
          }
          scroll(true);
        })();
      }
    } catch {
      removeItem(storageKey);
    }
  }

  // Public API on the element for page scripts.
  root.chat = {
    send: submit,
    stop: () => state.controller && state.controller.abort(),
    get messages() {
      return state.messages.slice();
    },
  };
}

/* ---- Floating widget --------------------------------------------------- */
function setupWidget(widget) {
  const launcher = qs('[data-chat-launcher]', widget);
  const panel = document.getElementById(launcher.getAttribute('aria-controls') || '');
  if (!panel) return;
  const close = qs('[data-chat-close]', panel);
  const input = qs('textarea', panel);
  launcher.hidden = false;

  const setOpen = (open, { returnFocus = true } = {}) => {
    launcher.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    widget.classList.toggle('chat-widget--open', open);
    if (open) {
      if (input) input.focus();
      const log = qs('[data-chat-log]', panel);
      if (log) log.scrollTop = log.scrollHeight;
    } else if (returnFocus) {
      launcher.focus();
    }
  };

  on(launcher, 'click', () => setOpen(launcher.getAttribute('aria-expanded') !== 'true'));
  if (close) on(close, 'click', () => setOpen(false));
  on(panel, 'keydown', (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) setOpen(false);
  });
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const chat of qsa('[data-chat]', root)) {
    if (!claim(chat, 'chat')) continue;
    setupChat(chat);
  }
  for (const widget of qsa('[data-chat-widget]', root)) {
    if (!claim(widget, 'chatWidget')) continue;
    setupWidget(widget);
  }
}

