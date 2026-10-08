/**
 * AI templates behaviour. Loaded before main.js so it can configure the chat
 * element before components/chat.js initialises it.
 *
 *   index.html  — saved conversations (sidebar list, ?c=<id> switches)
 *   agent.html  — live run panel fed by "chat:event" events (plan, step,
 *                 tool, artifact) from the agent transport
 */
import { qs, on, createElement } from '../../assets/js/core/dom.js';
import { getItem, setItem, removeItem } from '../../assets/js/core/storage.js';
import { announce } from '../../assets/js/core/announce.js';

/* ---- Conversations (index.html) ---------------------------------------- */
const SESSIONS_KEY = 'vr-ai-sessions';
const history = qs('[data-ai-history]');
const chat = qs('[data-chat][data-chat-storage]');

function readSessions() {
  try {
    const list = JSON.parse(getItem(SESSIONS_KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => s && /^[\w-]{1,40}$/.test(s.id) && typeof s.title === 'string') : [];
  } catch {
    return [];
  }
}

function saveSessions(list) {
  setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, 30)));
}

if (history && chat) {
  const params = new URLSearchParams(location.search);
  const requested = params.get('c');
  const id = requested && /^[\w-]{1,40}$/.test(requested) ? requested : 'default';
  chat.dataset.chatStorage = `vr-chat-ai-${id}`;

  const newLink = qs('[data-ai-new]');
  if (newLink) newLink.href = `?c=${Date.now().toString(36)}`;

  const render = () => {
    const sessions = readSessions();
    if (!sessions.length) return;
    history.replaceChildren(
      ...sessions.map((session) => {
        const link = createElement('a', {
          className: 'side-nav__link ai-history__link',
          text: session.title,
          attrs: { href: `?c=${session.id}` },
        });
        if (session.id === id) link.setAttribute('aria-current', 'page');
        const remove = createElement('button', {
          className: 'btn btn--ghost btn--icon btn--sm',
          attrs: { type: 'button' },
          children: [createElement('span', { text: '×', attrs: { 'aria-hidden': 'true' } }), createElement('span', { className: 'visually-hidden', text: `Delete conversation: ${session.title}` })],
        });
        on(remove, 'click', () => {
          saveSessions(readSessions().filter((s) => s.id !== session.id));
          removeItem(`vr-chat-ai-${session.id}`);
          announce(`Deleted “${session.title}”.`);
          if (session.id === id) location.search = '';
          else render();
        });
        return createElement('li', { className: 'ai-history__item', children: [link, remove] });
      })
    );
  };

  on(chat, 'chat:done', () => {
    const first = chat.chat?.messages.find((m) => m.role === 'user');
    if (!first) return;
    const text = first.parts.map((p) => p.text || '').join(' ').trim();
    const sessions = readSessions().filter((s) => s.id !== id);
    sessions.unshift({ id, title: text.slice(0, 48) || 'New chat', updated: Date.now() });
    saveSessions(sessions);
    render();
  });

  render();
}

/* ---- Agent run panel (agent.html) -------------------------------------- */
const stepsList = qs('[data-agent-steps]');
const agentChat = qs('[data-chat][data-chat-persona="agent"]');

if (stepsList && agentChat) {
  const goal = qs('[data-agent-goal]');
  const status = qs('[data-agent-status]');
  const artifacts = qs('[data-agent-artifacts]');
  const toolCount = qs('[data-agent-tool-count]');
  const steps = new Map();
  const tools = new Set();
  const LABELS = { pending: 'Pending', running: 'In progress', done: 'Done', error: 'Failed' };

  const setStep = (id, state) => {
    const item = steps.get(id);
    if (!item) return;
    item.dataset.status = state;
    item.querySelector('.agent-steps__state').textContent = LABELS[state] || state;
    if (state === 'running' || state === 'done') {
      status.textContent = `${item.querySelector('.agent-steps__title').textContent}: ${LABELS[state].toLowerCase()}.`;
    }
  };

  on(agentChat, 'chat:event', (event) => {
    const e = event.detail;
    if (e.type === 'plan') {
      steps.clear();
      tools.clear();
      toolCount.textContent = '0';
      goal.textContent = `Goal: ${e.goal}`;
      artifacts.replaceChildren(createElement('p', { className: 'text-sm text-muted', text: 'Files the agent creates appear here.' }));
      stepsList.replaceChildren(
        ...e.steps.map((step) => {
          const li = createElement('li', {
            className: 'agent-steps__item',
            attrs: { 'data-status': 'pending' },
            children: [
              createElement('span', { className: 'agent-steps__marker', attrs: { 'aria-hidden': 'true' } }),
              createElement('span', { className: 'agent-steps__title', text: step.title }),
              createElement('span', { className: 'agent-steps__state badge', text: LABELS.pending }),
            ],
          });
          steps.set(step.id, li);
          return li;
        })
      );
    } else if (e.type === 'step') {
      setStep(e.id, e.status);
    } else if (e.type === 'tool') {
      tools.add(e.id);
      toolCount.textContent = String(tools.size);
    } else if (e.type === 'artifact') {
      const id = `artifact-${artifacts.children.length}`;
      const copy = createElement('button', {
        className: 'btn btn--ghost btn--sm',
        attrs: { type: 'button', 'data-copy': '', 'data-copy-target': `#${id}` },
        children: [createElement('span', { text: 'Copy', attrs: { 'data-copy-label': '' } })],
      });
      const block = createElement('div', {
        className: 'code-block',
        children: [
          createElement('div', { className: 'code-block__header', children: [createElement('span', { className: 'path-chip', text: e.title }), copy] }),
          createElement('pre', { attrs: { tabindex: '0', 'aria-label': e.title }, children: [createElement('code', { text: e.content, attrs: { id } })] }),
        ],
      });
      if (artifacts.querySelector('p.text-muted')) artifacts.replaceChildren();
      artifacts.append(block);
      import('../../assets/js/components/copy.js').then((m) => m.init(artifacts));
      announce(`Artifact created: ${e.title}.`);
    }
  });

  on(agentChat, 'chat:clear', () => {
    stepsList.replaceChildren();
    goal.textContent = 'No task yet. Send a message to start.';
    status.textContent = '';
  });
}
