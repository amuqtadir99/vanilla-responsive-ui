/**
 * Page builder (src/builder/index.html).
 *
 * The preview is a same-origin iframe (canvas.html) that holds every block
 * as a <template>, generated from src/blocks/ by generate-doc.js. This
 * module clones templates into the canvas, keeps the outline in sync, and
 * stores a snapshot of the page after every change (undo/redo, autosave).
 *
 * Everything is DOM-based: blocks are cloned, moved and serialised, never
 * built from strings with innerHTML. Restoring a saved page parses its
 * HTML with DOMParser (which never runs scripts) inside the canvas.
 */
import { qs, qsa, on, createElement } from '../assets/js/core/dom.js';
import { getItem, setItem } from '../assets/js/core/storage.js';
import { announce } from '../assets/js/core/announce.js';

const STORAGE_KEY = 'vr-builder-project-v1';
const WIDTHS = { desktop: 1280, tablet: 768, mobile: 390 };
const HISTORY_LIMIT = 60;

const PRESETS = [
  { id: 'saas', name: 'SaaS landing page', blocks: ['hero-split', 'logo-cloud', 'feature-bento', 'feature-rows', 'stats-band', 'testimonials', 'pricing', 'faq', 'cta-banner'], header: 'site-header', footer: 'site-footer' },
  { id: 'agency', name: 'Agency home', blocks: ['hero-centered', 'feature-grid', 'stats-band', 'team', 'testimonials', 'blog-posts', 'contact'], header: 'site-header', footer: 'site-footer' },
  { id: 'launch', name: 'Product launch', blocks: ['hero-centered', 'steps', 'feature-bento', 'pricing', 'faq', 'newsletter'], header: 'site-header', footer: 'site-footer' },
  { id: 'store', name: 'Store front', blocks: ['promo-banner', 'category-tiles', 'perks', 'testimonials', 'newsletter'], header: 'shop-header', footer: 'shop-footer' },
  { id: 'about', name: 'About page', blocks: ['hero-centered', 'stats-band', 'team', 'steps', 'cta-banner'], header: 'site-header', footer: 'site-footer' },
  { id: 'blank', name: 'Blank page', blocks: [], header: 'site-header', footer: 'site-footer' },
];

const PARTIAL_CSS = {
  'site-header': ['components/header.css', 'components/button.css'],
  'shop-header': ['components/header.css', 'components/button.css', 'components/feedback.css'],
  'site-footer': ['components/footer.css'],
  'shop-footer': ['components/footer.css'],
};

const IDREF_ATTRS = ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'commandfor', 'popovertarget', 'list', 'form', 'data-tab'];

/* ---- State ---------------------------------------------------------------- */
const frame = qs('[data-canvas-frame]');
const stage = qs('[data-stage]');
const outline = qs('[data-outline]');
const library = qs('[data-library]');
const settingsForm = qs('[data-page-settings]');
const titleInput = qs('[data-builder-title]');

let doc = null; // canvas document
let main = null; // canvas <main>
let catalog = []; // { slug, name, category, description, css }
let selected = null; // uid of the selected section
let counter = 1; // suffix for unique ids
let device = 'desktop';
const past = [];
const future = [];

const settings = { title: 'Untitled page', description: '', header: 'site-header', footer: 'site-footer', brand: '', mode: '', root: '' };

/* ---- Helpers ---------------------------------------------------------------- */
const sections = () => qsa(':scope > [data-builder-uid]', main);
const sectionByUid = (uid) => main.querySelector(`:scope > [data-builder-uid="${CSS.escape(uid)}"]`);
const blockInfo = (slug) => catalog.find((b) => b.slug === slug);
const nameOf = (section) => blockInfo(section.dataset.block)?.name || section.dataset.block || 'Section';

function icon(path) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon icon--sm');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  svg.append(p);
  return svg;
}

const ICONS = {
  up: 'm18 15-6-6-6 6',
  down: 'm6 9 6 6 6-6',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
};

function iconButton(label, iconName, onClick, extra = {}) {
  const button = createElement('button', {
    className: 'btn btn--ghost btn--icon btn--sm',
    attrs: { type: 'button', ...extra },
    children: [icon(ICONS[iconName]), createElement('span', { className: 'visually-hidden', text: label })],
  });
  on(button, 'click', onClick);
  return button;
}

/** Give every id in a cloned block a unique suffix and update references. */
function uniquify(root) {
  const n = counter++;
  const map = new Map();
  for (const el of [root, ...root.querySelectorAll('[id]')]) {
    if (!el.id) continue;
    const next = `${el.id}-${n}`;
    map.set(el.id, next);
    el.id = next;
  }
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const name of IDREF_ATTRS) {
      const value = el.getAttribute(name);
      if (value) el.setAttribute(name, value.split(/\s+/).map((id) => map.get(id) || id).join(' '));
    }
    const href = el.getAttribute('href');
    if (href && href.startsWith('#') && map.has(href.slice(1))) el.setAttribute('href', `#${map.get(href.slice(1))}`);
    // Keep radio groups and exclusive accordions independent per copy.
    if ((el.tagName === 'INPUT' && el.type === 'radio') || el.tagName === 'DETAILS') {
      const group = el.getAttribute('name');
      if (group) el.setAttribute('name', `${group}-${n}`);
    }
  }
  return root;
}

function cloneBlock(slug) {
  const template = doc.querySelector(`template[data-block-template="${CSS.escape(slug)}"]`);
  if (!template) return null;
  const section = template.content.firstElementChild.cloneNode(true);
  section.dataset.builderUid = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return uniquify(doc.importNode(section, true));
}

/* ---- Snapshots: undo, redo, autosave -------------------------------------- */
/**
 * Copy a canvas node into a detached, script-less document. Images there
 * never load, and runtime state (selection, editing, inline styles set by
 * components through the CSSOM) is dropped.
 */
let inertDoc = null;
function inertCopy(node) {
  inertDoc ||= document.implementation.createHTMLDocument('');
  const copy = inertDoc.importNode(node, true);
  for (const el of [copy, ...copy.querySelectorAll('*')]) {
    el.removeAttribute('data-builder-selected');
    el.removeAttribute('contenteditable');
    el.removeAttribute('style');
  }
  return copy;
}

function snapshot() {
  return {
    settings: { ...settings },
    counter,
    blocks: sections().map((s) => inertCopy(s).outerHTML),
  };
}

function restore(snap) {
  Object.assign(settings, snap.settings || {});
  counter = Math.max(counter, snap.counter || 1);
  for (const s of sections()) s.remove();
  const Parser = frame.contentWindow.DOMParser;
  const parsed = new Parser().parseFromString(`<body>${(snap.blocks || []).join('')}</body>`, 'text/html');
  for (const el of [...parsed.body.children]) {
    if (el.matches('[data-builder-uid][data-block]')) main.append(doc.importNode(el, true));
  }
  if (selected && !sectionByUid(selected)) selected = null;
  applySettings();
  refresh();
}

function commit(message) {
  past.push(currentSnap);
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
  currentSnap = snapshot();
  setItem(STORAGE_KEY, JSON.stringify(currentSnap));
  refresh();
  if (message) announce(message);
}

let currentSnap = null;

function undo() {
  if (!past.length) return;
  future.push(currentSnap);
  currentSnap = past.pop();
  restore(currentSnap);
  setItem(STORAGE_KEY, JSON.stringify(currentSnap));
  announce('Undone');
}

function redo() {
  if (!future.length) return;
  past.push(currentSnap);
  currentSnap = future.pop();
  restore(currentSnap);
  setItem(STORAGE_KEY, JSON.stringify(currentSnap));
  announce('Redone');
}

/* ---- Operations ----------------------------------------------------------- */
function addBlock(slug, { after = selected, quiet = false } = {}) {
  const section = cloneBlock(slug);
  if (!section) return null;
  const ref = after && sectionByUid(after);
  if (ref) ref.after(section);
  else main.append(section);
  select(section.dataset.builderUid, { scroll: true });
  if (!quiet) commit(`Added ${nameOf(section)}`);
  return section;
}

function moveBlock(uid, delta) {
  const s = sectionByUid(uid);
  if (!s) return;
  const list = sections();
  const index = list.indexOf(s);
  const target = list[index + delta];
  if (!target) return;
  if (delta < 0) target.before(s);
  else target.after(s);
  commit(`${nameOf(s)} moved to position ${index + delta + 1} of ${list.length}`);
  qs(`[data-outline-uid="${CSS.escape(uid)}"] [data-move="${delta < 0 ? 'up' : 'down'}"]`, outline)?.focus();
}

function duplicateBlock(uid) {
  const s = sectionByUid(uid);
  if (!s) return;
  const copy = uniquify(s.cloneNode(true));
  copy.dataset.builderUid = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  copy.removeAttribute('data-builder-selected');
  s.after(copy);
  select(copy.dataset.builderUid);
  commit(`Duplicated ${nameOf(s)}`);
}

function removeBlock(uid) {
  const s = sectionByUid(uid);
  if (!s) return;
  const list = sections();
  const index = list.indexOf(s);
  const name = nameOf(s);
  s.remove();
  const next = list[index + 1] || list[index - 1];
  selected = next ? next.dataset.builderUid : null;
  commit(`Removed ${name}. Press Ctrl+Z to undo.`);
  const focusTarget = selected ? qs(`[data-outline-uid="${CSS.escape(selected)}"] .builder-outline__name`, outline) : qs('[data-library-search]');
  focusTarget?.focus();
}

function applyPreset(preset) {
  for (const s of sections()) s.remove();
  selected = null;
  settings.header = preset.header;
  settings.footer = preset.footer;
  for (const slug of preset.blocks) addBlock(slug, { after: null, quiet: true });
  selected = null;
  applySettings();
  syncSettingsForm();
  commit(`Loaded preset: ${preset.name} (${preset.blocks.length} blocks)`);
}

function select(uid, { scroll = false } = {}) {
  selected = uid;
  for (const s of sections()) {
    if (s.dataset.builderUid === uid) s.setAttribute('data-builder-selected', '');
    else s.removeAttribute('data-builder-selected');
  }
  for (const li of qsa('[data-outline-uid]', outline)) {
    const isSel = li.dataset.outlineUid === uid;
    li.classList.toggle('is-selected', isSel);
    qs('.builder-outline__name', li).setAttribute('aria-pressed', String(isSel));
  }
  if (scroll && uid) scrollCanvasTo(sectionByUid(uid));
}

/** Scroll only the canvas (scrollIntoView would also scroll this page). */
function scrollCanvasTo(el) {
  if (!el) return;
  const win = doc.defaultView;
  win.scrollTo({ top: el.getBoundingClientRect().top + win.scrollY, behavior: 'smooth' });
}

/* ---- Settings (header, footer, brand, mode, title) --------------------------- */
function applySettings() {
  if (!doc) return;
  const root = doc.documentElement;
  if (settings.brand) root.dataset.brand = settings.brand;
  else delete root.dataset.brand;
  if (settings.mode) root.dataset.theme = settings.mode;
  else delete root.dataset.theme;
  doc.title = settings.title || 'Untitled page';
  for (const [slot, name] of [['header', settings.header], ['footer', settings.footer]]) {
    const host = qs(`[data-canvas-${slot}]`, doc);
    if (host.dataset.partial === name) continue;
    host.replaceChildren();
    host.dataset.partial = name || '';
    const template = name && doc.querySelector(`template[data-partial-template="${CSS.escape(name)}"]`);
    if (template) host.append(doc.importNode(template.content, true));
  }
  if (titleInput.value !== settings.title) titleInput.value = settings.title;
}

function syncSettingsForm() {
  const f = settingsForm.elements;
  f.description.value = settings.description;
  f.header.value = settings.header;
  f.footer.value = settings.footer;
  f.brand.value = settings.brand;
  f.root.value = settings.root;
  for (const radio of qsa('input[name="mode"]', settingsForm)) radio.checked = radio.value === settings.mode;
}

/* ---- Rendering the side panels --------------------------------------------- */
function renderLibrary() {
  const groups = new Map();
  for (const b of catalog) {
    if (!groups.has(b.category)) groups.set(b.category, []);
    groups.get(b.category).push(b);
  }
  const fragments = [];
  for (const [category, items] of groups) {
    const headingId = `lib-${category.toLowerCase().replace(/\W+/g, '-')}`;
    fragments.push(
      createElement('section', {
        className: 'builder-library__group',
        attrs: { 'aria-labelledby': headingId, 'data-library-group': '' },
        children: [
          createElement('h3', { className: 'builder-library__title', text: category, attrs: { id: headingId } }),
          createElement('ul', {
            className: 'builder-library__list',
            attrs: { role: 'list' },
            children: items.map((b) => {
              const add = createElement('button', {
                className: 'btn btn--secondary btn--sm',
                attrs: { type: 'button' },
                children: [icon(ICONS.plus), createElement('span', { text: 'Add' }), createElement('span', { className: 'visually-hidden', text: ` ${b.name}` })],
              });
              on(add, 'click', () => addBlock(b.slug));
              const item = createElement('li', {
                className: 'builder-library__item',
                attrs: { 'data-library-item': `${b.name} ${b.category} ${b.description}`.toLowerCase(), draggable: 'true' },
                children: [
                  createElement('div', {
                    className: 'builder-library__text',
                    children: [
                      createElement('strong', { text: b.name }),
                      createElement('span', { className: 'text-sm text-muted', text: b.description }),
                      createElement('a', { className: 'text-sm', text: 'Docs and code', attrs: { href: `../docs/blocks/${b.slug}.html` } }),
                    ],
                  }),
                  add,
                ],
              });
              on(item, 'dragstart', (event) => {
                event.dataTransfer.setData('text/x-builder-add', b.slug);
                event.dataTransfer.effectAllowed = 'copy';
              });
              return item;
            }),
          }),
        ],
      })
    );
  }
  library.replaceChildren(...fragments);
}

function filterLibrary() {
  const q = qs('[data-library-search]').value.trim().toLowerCase();
  let count = 0;
  for (const item of qsa('[data-library-item]', library)) {
    const hit = !q || item.dataset.libraryItem.includes(q);
    item.hidden = !hit;
    if (hit) count += 1;
  }
  for (const group of qsa('[data-library-group]', library)) group.hidden = !qsa('[data-library-item]:not([hidden])', group).length;
  qs('[data-library-status]').textContent = q ? `${count} block${count === 1 ? '' : 's'} found` : '';
}

function renderPresets() {
  const list = qs('[data-presets]');
  list.replaceChildren(
    ...PRESETS.map((p) => {
      const button = createElement('button', {
        className: 'builder-preset',
        attrs: { type: 'button' },
        children: [
          createElement('strong', { text: p.name }),
          createElement('span', { className: 'text-sm text-muted', text: p.blocks.length ? p.blocks.map((s) => blockInfo(s)?.name || s).join(' · ') : 'Header and footer only' }),
        ],
      });
      on(button, 'click', () => applyPreset(p));
      return createElement('li', { children: [button] });
    })
  );
}

let dragUid = null;

function renderOutline() {
  const list = sections();
  qs('[data-outline-empty]').hidden = list.length > 0;
  outline.replaceChildren(
    ...list.map((s, i) => {
      const uid = s.dataset.builderUid;
      const name = nameOf(s);
      const nameButton = createElement('button', {
        className: 'builder-outline__name',
        attrs: { type: 'button', 'aria-pressed': String(uid === selected) },
        children: [createElement('span', { className: 'builder-outline__index', text: String(i + 1).padStart(2, '0'), attrs: { 'aria-hidden': 'true' } }), createElement('span', { text: name })],
      });
      on(nameButton, 'click', () => select(uid, { scroll: true }));
      const up = iconButton(`Move ${name} up`, 'up', () => moveBlock(uid, -1), { 'data-move': 'up' });
      const down = iconButton(`Move ${name} down`, 'down', () => moveBlock(uid, 1), { 'data-move': 'down' });
      up.disabled = i === 0;
      down.disabled = i === list.length - 1;
      const li = createElement('li', {
        className: `builder-outline__item${uid === selected ? ' is-selected' : ''}`,
        attrs: { 'data-outline-uid': uid, draggable: 'true' },
        children: [
          createElement('span', { className: 'builder-outline__grip', children: [icon(ICONS.grip)] }),
          nameButton,
          createElement('span', { className: 'builder-outline__actions', children: [up, down, iconButton(`Duplicate ${name}`, 'copy', () => duplicateBlock(uid)), iconButton(`Remove ${name}`, 'trash', () => removeBlock(uid))] }),
        ],
      });
      on(li, 'dragstart', (event) => {
        dragUid = uid;
        event.dataTransfer.setData('text/x-builder-move', uid);
        event.dataTransfer.effectAllowed = 'move';
        li.classList.add('is-dragging');
      });
      on(li, 'dragend', () => {
        dragUid = null;
        li.classList.remove('is-dragging');
        qsa('.is-drop-before, .is-drop-after', outline).forEach((el) => el.classList.remove('is-drop-before', 'is-drop-after'));
      });
      return li;
    })
  );
}

function renderChecks() {
  const list = qs('[data-checks]');
  const items = [];
  const blocks = sections();
  const h1 = blocks.reduce((n, s) => n + s.querySelectorAll('h1').length, 0);
  if (!blocks.length) items.push(['warn', 'Add at least one block.']);
  else if (h1 === 0) items.push(['warn', 'No main heading (h1). Add a hero or promo block first.']);
  else if (h1 > 1) items.push(['warn', `${h1} main headings (h1). Keep one hero and change other h1s to h2.`]);
  else items.push(['ok', 'One main heading (h1).']);
  const ids = new Map();
  for (const el of qsa('[data-canvas-header] [id], [data-builder-uid] [id], [data-builder-uid][id], [data-canvas-footer] [id]', doc)) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  const dupes = [...ids].filter(([, n]) => n > 1).map(([id]) => id);
  items.push(dupes.length ? ['warn', `Duplicate ids: ${dupes.slice(0, 3).join(', ')}`] : ['ok', 'All ids are unique.']);
  items.push(settings.header && settings.footer ? ['ok', 'Header and footer landmarks.'] : ['warn', 'Pages usually need a header and a footer.']);
  const missingAlt = qsa('[data-builder-uid] img:not([alt])', doc).length;
  items.push(missingAlt ? ['warn', `${missingAlt} image(s) without alt text.`] : ['ok', 'Every image has alt text.']);
  list.replaceChildren(
    ...items.map(([kind, text]) =>
      createElement('li', {
        className: `builder-checks__item builder-checks__item--${kind}`,
        children: [icon(kind === 'ok' ? ICONS.check : ICONS.alert), createElement('span', { text: kind === 'ok' ? text : `Warning: ${text}` })],
      })
    )
  );
}

function refresh() {
  renderOutline();
  renderChecks();
  select(selected);
  qs('[data-builder-undo]').disabled = !past.length;
  qs('[data-builder-redo]').disabled = !future.length;
  qs('[data-canvas-empty]', doc).hidden = sections().length > 0;
}

/* ---- Outline drag and drop ------------------------------------------------- */
function initOutlineDnd() {
  on(outline, 'dragover', (event) => {
    const li = event.target.closest('[data-outline-uid]');
    const types = [...event.dataTransfer.types];
    if (!types.includes('text/x-builder-move') && !types.includes('text/x-builder-add')) return;
    event.preventDefault();
    qsa('.is-drop-before, .is-drop-after', outline).forEach((el) => el.classList.remove('is-drop-before', 'is-drop-after'));
    if (li) {
      const box = li.getBoundingClientRect();
      li.classList.add(event.clientY < box.top + box.height / 2 ? 'is-drop-before' : 'is-drop-after');
    }
  });
  on(outline, 'drop', (event) => {
    event.preventDefault();
    const li = event.target.closest('[data-outline-uid]');
    const before = li && li.classList.contains('is-drop-before');
    qsa('.is-drop-before, .is-drop-after', outline).forEach((el) => el.classList.remove('is-drop-before', 'is-drop-after'));
    const addSlug = event.dataTransfer.getData('text/x-builder-add');
    const ref = li && sectionByUid(li.dataset.outlineUid);
    if (addSlug) {
      const section = cloneBlock(addSlug);
      if (!section) return;
      if (ref) (before ? ref.before(section) : ref.after(section));
      else main.append(section);
      select(section.dataset.builderUid, { scroll: true });
      commit(`Added ${nameOf(section)}`);
      return;
    }
    const moving = dragUid && sectionByUid(dragUid);
    if (!moving || !ref || moving === ref) return;
    if (before) ref.before(moving);
    else ref.after(moving);
    commit(`${nameOf(moving)} moved to position ${sections().indexOf(moving) + 1}`);
  });
}

/* ---- Canvas interaction: select and inline text editing ---------------------- */
const EDITABLE = 'h1, h2, h3, h4, p, li, dt, dd, figcaption span, blockquote, .btn, .announce, .eyebrow, .badge, strong';

function initCanvasEvents() {
  on(doc, 'click', (event) => {
    const section = event.target.closest('[data-builder-uid]');
    if (event.target.closest('a, button, input, select, textarea, label, summary') && !event.target.closest('[contenteditable]')) {
      // Keep the preview on this page; native widgets (accordions, tabs) still work.
      if (event.target.closest('a[href]')) event.preventDefault();
    }
    if (section && section.dataset.builderUid !== selected) select(section.dataset.builderUid);
  });
  on(doc, 'submit', (event) => event.preventDefault());

  on(doc, 'dblclick', (event) => {
    const el = event.target.closest(EDITABLE);
    const section = event.target.closest('[data-builder-uid]');
    if (!el || !section || el.isContentEditable) return;
    // Only edit elements whose children are text or inline formatting.
    if ([...el.children].some((c) => !/^(SPAN|STRONG|EM|B|I|CODE|SVG|BR|TIME|KBD)$/i.test(c.tagName))) return;
    event.preventDefault();
    const original = el.cloneNode(true);
    el.setAttribute('contenteditable', 'plaintext-only');
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
    el.focus();
    const finish = (save) => {
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('keydown', onKey);
      el.removeAttribute('contenteditable');
      if (!save) {
        el.replaceWith(original);
        announce('Edit cancelled');
      } else if (el.textContent !== original.textContent) {
        commit('Text updated');
      }
    };
    const onBlur = () => finish(true);
    const onKey = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        el.removeEventListener('blur', onBlur);
        finish(false);
      }
    };
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKey);
    announce('Editing text. Press Enter to save or Escape to cancel.');
  });

  for (const target of [document, doc]) {
    on(target, 'keydown', (event) => {
      const typing = event.target.closest && event.target.closest('input, textarea, select, [contenteditable]');
      if (typing) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (mod && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && selected) {
        event.preventDefault();
        moveBlock(selected, event.key === 'ArrowUp' ? -1 : 1);
      }
    });
  }
}

/* ---- Stage sizing --------------------------------------------------------------- */
function sizeStage() {
  const width = WIDTHS[device];
  const available = stage.clientWidth;
  const scale = Math.min(1, available / width);
  const height = stage.clientHeight;
  frame.style.width = `${width}px`;
  frame.style.height = `${height / scale}px`;
  frame.style.transform = scale < 1 ? `scale(${scale})` : '';
  frame.style.marginInline = scale < 1 ? '0' : 'auto';
}

/* ---- Export ------------------------------------------------------------------------ */
function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cleanClone(node) {
  const copy = inertCopy(node);
  for (const el of [copy, ...copy.querySelectorAll('*')]) {
    el.removeAttribute('data-builder-uid');
    for (const name of ['href', 'src']) {
      const value = el.getAttribute(name);
      if (value && value.startsWith('../')) el.setAttribute(name, `${settings.root}${value.slice(3)}`);
    }
  }
  return copy;
}

function reindent(html, spaces) {
  const lines = html.split('\n');
  const indents = lines.slice(1).filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length);
  const strip = indents.length ? Math.min(...indents) - 2 : 0;
  return lines
    .map((l, i) => (i === 0 ? l : l.slice(Math.max(0, Math.min(strip, /^\s*/.exec(l)[0].length)))))
    .map((l) => (l.trim() ? ' '.repeat(spaces) + l : ''))
    .join('\n');
}

function exportHtml() {
  const r = settings.root;
  const css = new Set(['tokens.css', 'themes.css', 'base.css', 'layouts.css']);
  const extra = new Set();
  for (const name of [settings.header, settings.footer]) for (const c of PARTIAL_CSS[name] || []) extra.add(c);
  for (const s of sections()) for (const c of (blockInfo(s.dataset.block)?.css || [])) if (c !== 'blocks.css') extra.add(c);
  const links = [...css].map((c) => `assets/css/${c}`).concat([...extra].sort().map((c) => `assets/css/${c}`), ['assets/css/blocks.css']);
  const header = qs('[data-canvas-header]', doc).firstElementChild;
  const footer = qs('[data-canvas-footer]', doc).firstElementChild;
  const attrs = `${settings.brand ? ` data-brand="${settings.brand}"` : ''}${settings.mode ? ` data-theme="${settings.mode}"` : ''}`;
  const body = sections().map((s) => reindent(cleanClone(s).outerHTML, 4)).join('\n\n');
  return `<!DOCTYPE html>
<html lang="en"${attrs}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'">
  <title>${escapeText(settings.title)}</title>
  <meta name="description" content="${escapeText(settings.description)}">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="${r}assets/icons/favicon.svg" type="image/svg+xml">
${links.map((l) => `  <link rel="stylesheet" href="${r}${l}">`).join('\n')}
  <script type="module" src="${r}assets/js/main.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${header ? `${reindent(cleanClone(header).outerHTML, 2)}\n` : ''}
  <main id="main" tabindex="-1">
${body}
  </main>
${footer ? `\n${reindent(cleanClone(footer).outerHTML, 2)}` : ''}
</body>
</html>
`;
}

function exportPrompt() {
  const list = sections();
  const lines = [
    `Create a page titled "${settings.title}" in the vanilla-responsive-ui repository.`,
    '',
    'Blocks, in order (each is one <section> in src/blocks/):',
    ...list.map((s, i) => `${i + 1}. ${nameOf(s)} — src/blocks/${s.dataset.block}.html`),
    '',
    `Header: ${settings.header ? `src/layouts/partials/${settings.header}.html` : 'none'}`,
    `Footer: ${settings.footer ? `src/layouts/partials/${settings.footer}.html` : 'none'}`,
    `Theme: ${settings.brand ? `data-brand="${settings.brand}"` : 'default brand'}${settings.mode ? `, data-theme="${settings.mode}"` : ', follows the system colour mode'}`,
    '',
    'Steps:',
    `1. node .claude/skills/pages.js new --family ${settings.header === 'shop-header' ? 'e-commerce' : 'website'} --layout stacked --name <file-name> --title "${settings.title}"`,
    '2. Replace the placeholder <main> content with the blocks above, in order, and link src/assets/css/blocks.css.',
    '3. Adapt the copy and links to the product. If text was edited in the builder, use the exported HTML as the source.',
    '4. Keep one h1 (the first hero), unique ids, and no inline scripts or styles (CLAUDE.md).',
    '5. Run bash .claude/skills/validate-w3c.sh, bash .claude/skills/audit-a11y.sh and node tests/run-all.mjs.',
  ];
  return lines.join('\n');
}

function exportJson() {
  return JSON.stringify(
    {
      title: settings.title,
      description: settings.description,
      header: settings.header ? `src/layouts/partials/${settings.header}.html` : null,
      footer: settings.footer ? `src/layouts/partials/${settings.footer}.html` : null,
      brand: settings.brand || 'indigo',
      mode: settings.mode || 'system',
      blocks: sections().map((s) => ({ block: s.dataset.block, name: nameOf(s), file: `src/blocks/${s.dataset.block}.html` })),
    },
    null,
    2
  );
}

function fillExport() {
  qs('[data-export-html]').textContent = exportHtml();
  qs('[data-export-ai]').textContent = exportPrompt();
  qs('[data-export-json]').textContent = exportJson();
}

function download() {
  const blob = new Blob([exportHtml()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const name = `${(settings.title || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'}.html`;
  const a = createElement('a', { attrs: { href: url, download: name } });
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Downloaded ${name}`);
}

/* ---- Start-up ------------------------------------------------------------------------ */
function initControls() {
  for (const el of qsa('[data-builder-tools]')) el.hidden = false;

  on(qs('[data-builder-undo]'), 'click', undo);
  on(qs('[data-builder-redo]'), 'click', redo);

  for (const radio of qsa('input[name="device"]')) {
    on(radio, 'change', () => {
      device = radio.value;
      sizeStage();
      announce(`Preview width: ${device}`);
    });
  }

  const focusButton = qs('[data-builder-focus]');
  on(focusButton, 'click', () => {
    const builder = qs('[data-builder]');
    const next = focusButton.getAttribute('aria-pressed') !== 'true';
    focusButton.setAttribute('aria-pressed', String(next));
    builder.toggleAttribute('data-focus', next);
    requestAnimationFrame(sizeStage);
  });

  let titleTimer = 0;
  on(titleInput, 'input', () => {
    settings.title = titleInput.value;
    applySettings();
    clearTimeout(titleTimer);
    titleTimer = window.setTimeout(() => commit(), 500);
  });

  on(settingsForm, 'change', () => {
    const f = settingsForm.elements;
    settings.description = f.description.value;
    settings.header = f.header.value;
    settings.footer = f.footer.value;
    settings.brand = f.brand.value;
    settings.mode = qs('input[name="mode"]:checked', settingsForm)?.value || '';
    settings.root = f.root.value.trim() && !f.root.value.trim().endsWith('/') ? `${f.root.value.trim()}/` : f.root.value.trim();
    applySettings();
    commit('Page settings updated');
  });
  on(settingsForm, 'submit', (event) => event.preventDefault());

  on(qs('[data-library-search]'), 'input', filterLibrary);
  on(qs('[commandfor="builder-export"][command="show-modal"]'), 'click', fillExport);
  on(qs('[data-export-download]'), 'click', download);

  on(window, 'resize', () => requestAnimationFrame(sizeStage));
  if ('ResizeObserver' in window) new ResizeObserver(() => sizeStage()).observe(stage);
}

function start() {
  doc = frame.contentDocument;
  main = qs('[data-canvas]', doc);
  if (!main) return;
  catalog = qsa('template[data-block-template]', doc).map((t) => ({
    slug: t.dataset.blockTemplate,
    name: t.dataset.name,
    category: t.dataset.category,
    description: t.dataset.description,
    css: (t.dataset.css || '').split(',').map((c) => c.trim()).filter(Boolean),
  }));

  renderLibrary();
  renderPresets();
  initOutlineDnd();
  initCanvasEvents();
  initControls();

  let saved = null;
  try {
    saved = JSON.parse(getItem(STORAGE_KEY) || 'null');
  } catch {
    saved = null;
  }
  if (saved && Array.isArray(saved.blocks)) {
    restore(saved);
  } else {
    const preset = PRESETS[0];
    settings.title = 'Acme Cloud';
    settings.description = 'Accessible UI templates for every stack.';
    settings.header = preset.header;
    settings.footer = preset.footer;
    for (const slug of preset.blocks) addBlock(slug, { after: null, quiet: true });
    selected = null;
    applySettings();
  }
  syncSettingsForm();
  currentSnap = snapshot();
  setItem(STORAGE_KEY, JSON.stringify(currentSnap));

  // ?add=block-name (from the docs "Open in page builder" buttons)
  const params = new URLSearchParams(window.location.search);
  const add = params.get('add');
  if (add && blockInfo(add)) {
    const section = addBlock(add, { after: null });
    if (section) window.setTimeout(() => scrollCanvasTo(section), 300);
    window.history.replaceState(null, '', window.location.pathname);
  }

  refresh();
  sizeStage();
}

if (frame.contentDocument && frame.contentDocument.readyState === 'complete' && frame.contentDocument.querySelector('[data-canvas]')) start();
else on(frame, 'load', start, { once: true });
