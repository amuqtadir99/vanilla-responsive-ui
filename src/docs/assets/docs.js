/**
 * Documentation site behaviour (src/index.html and src/docs/).
 *
 * - Sidebar search: filters the navigation as you type ("/" focuses it).
 * - Live previews: sizes each preview iframe. Pages and blocks render at a
 *   real device width (1280, 768 or 390 CSS px) and are scaled to fit, so
 *   you see the true desktop layout; components fill the available width.
 * - Template thumbnails: scales full pages down into cards.
 * - "Show in preview": scrolls a template preview to one section.
 *
 * Copy buttons, tabs, the theme toggle and the mobile menu come from the
 * shared components loaded by main.js.
 */
import { qs, qsa, on } from '../../assets/js/core/dom.js';
import { announce } from '../../assets/js/core/announce.js';

const WIDTHS = { desktop: 1280, tablet: 768, mobile: 390 };

/* ---- Search ------------------------------------------------------------- */
function initSearch() {
  const box = qs('[data-docs-search]');
  if (!box) return;
  const input = qs('input', box);
  const status = qs('[data-docs-search-status]', box);
  const groups = qsa('[data-docs-group]');
  box.hidden = false;

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    let matches = 0;
    for (const group of groups) {
      let visible = 0;
      for (const li of qsa('li', group)) {
        const hit = !q || li.textContent.toLowerCase().includes(q) || qs('.docs-nav__title', group).textContent.toLowerCase().includes(q);
        li.hidden = !hit;
        if (hit) visible += 1;
      }
      group.hidden = visible === 0;
      matches += visible;
    }
    status.textContent = q ? (matches ? `${matches} result${matches === 1 ? '' : 's'}` : 'No results') : '';
  };

  on(input, 'input', filter);
  on(input, 'keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      filter();
    }
  });
  on(document, 'keydown', (event) => {
    const typing = event.target.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      input.focus();
    }
  });
}

/* ---- Previews ------------------------------------------------------------ */
function frameDocument(frame) {
  try {
    return frame.contentDocument;
  } catch {
    return null; // cross-origin: leave the fallback size
  }
}

function sizePreview(preview) {
  const stage = qs('[data-docs-stage]', preview);
  const frame = qs('[data-docs-frame]', preview);
  if (!stage || !frame) return;
  const mode = preview.dataset.mode;
  const device = preview.dataset.device || 'desktop';
  const style = getComputedStyle(stage);
  const available = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

  // Components fill the stage on desktop; pages and blocks use real widths.
  const target = mode === 'component' && device === 'desktop' ? available : WIDTHS[device];
  const scale = Math.min(1, available / target);
  const doc = frameDocument(frame);

  let height;
  if (mode === 'page') {
    height = Math.min(Math.round(window.innerHeight * 0.75), 760) / scale;
  } else {
    // The body (not the document, which is at least the iframe height) tells
    // us how tall the content is.
    height = doc && doc.body ? Math.max(Math.ceil(doc.body.getBoundingClientRect().height), 80) : 448;
  }

  frame.style.width = `${target}px`;
  frame.style.height = `${height}px`;
  frame.style.transform = scale < 1 ? `scale(${scale})` : '';
  frame.style.marginInline = scale < 1 ? '0' : 'auto';
  stage.style.height = `${Math.ceil(height * scale) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)}px`;
}

function initPreviews() {
  for (const preview of qsa('[data-docs-preview]')) {
    const frame = qs('[data-docs-frame]', preview);
    const switcher = qs('[data-docs-device]', preview);
    if (switcher) {
      switcher.hidden = false;
      on(switcher, 'change', (event) => {
        preview.dataset.device = event.target.value;
        sizePreview(preview);
        announce(`Preview width: ${event.target.value}`);
      });
    }
    const watch = () => {
      sizePreview(preview);
      const doc = frameDocument(frame);
      if (!doc || preview.dataset.mode === 'page') return;
      // Re-measure when the previewed content changes size (fonts, JS, data).
      const Observer = frame.contentWindow && frame.contentWindow.ResizeObserver;
      if (Observer && doc.body) new Observer(() => sizePreview(preview)).observe(doc.body);
    };
    on(frame, 'load', watch);
    if (frameDocument(frame)?.readyState === 'complete') watch();
  }

  let pending = 0;
  on(window, 'resize', () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      qsa('[data-docs-preview]').forEach(sizePreview);
      qsa('[data-docs-thumb]').forEach(sizeThumb);
    });
  });
}

/* ---- Thumbnails ------------------------------------------------------------ */
function sizeThumb(thumb) {
  const frame = qs('iframe', thumb);
  if (!frame) return;
  const scale = thumb.clientWidth / frame.offsetWidth;
  frame.style.transform = `scale(${scale})`;
}

function initThumbs() {
  const thumbs = qsa('[data-docs-thumb]');
  thumbs.forEach(sizeThumb);
  // Keep keyboard focus out of decorative thumbnails once they load.
  for (const thumb of thumbs) {
    const frame = qs('iframe', thumb);
    on(frame, 'load', () => {
      const doc = frameDocument(frame);
      if (doc && doc.documentElement) doc.documentElement.setAttribute('inert', '');
    });
  }
}

/* ---- Show a template section in the preview -------------------------------- */
function initLocate() {
  const buttons = qsa('[data-docs-locate]');
  if (!buttons.length) return;
  const preview = qs('[data-docs-preview]');
  const frame = preview && qs('[data-docs-frame]', preview);
  for (const button of buttons) {
    button.hidden = false;
    on(button, 'click', () => {
      const doc = frame && frameDocument(frame);
      const target = doc && doc.querySelector(button.dataset.docsLocate);
      if (!target) {
        announce('That part is not visible in the preview at this width.');
        return;
      }
      preview.scrollIntoView({ block: 'start', behavior: 'smooth' });
      // Scroll the preview's own window; scrollIntoView would move this page.
      const win = frame.contentWindow;
      win.scrollTo({ top: target.getBoundingClientRect().top + win.scrollY });
      const previous = target.style.outline;
      target.style.outline = '4px solid var(--color-focus)';
      target.style.outlineOffset = '-4px';
      window.setTimeout(() => {
        target.style.outline = previous;
        target.style.outlineOffset = '';
      }, 2000);
      announce(`Showing ${button.closest('details').querySelector('.docs-anatomy__name').textContent} in the preview.`);
    });
  }
}

initSearch();
initPreviews();
initThumbs();
initLocate();
