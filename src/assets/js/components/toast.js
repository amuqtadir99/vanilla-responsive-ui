/**
 * Toast notifications in a polite live region.
 *
 * Programmatic use:
 *   import { showToast } from './components/toast.js';
 *   showToast('Saved', { variant: 'success' });
 *
 * Declarative use:
 *   <button type="button" data-toast="Link copied" data-toast-variant="success">Copy</button>
 *
 * WCAG 2.2.1: toasts pause while hovered or focused and can be dismissed;
 * messages are plain text (textContent) so they are XSS-safe.
 *
 * @module components/toast
 */
import { qsa, on, claim, createElement } from '../core/dom.js';

const CLOSE_ICON = 'M18 6 6 18M6 6l12 12';

function getRegion() {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = createElement('div', {
      className: 'toast-region',
      attrs: { role: 'status', 'aria-live': 'polite', 'aria-relevant': 'additions' },
    });
    document.body.append(region);
  }
  return region;
}

function closeIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', CLOSE_ICON);
  svg.append(path);
  return svg;
}

/**
 * @param {string} message
 * @param {object} [options]
 * @param {'info' | 'success' | 'danger'} [options.variant='info']
 * @param {number} [options.duration=5000] ms before auto-dismiss (0 = sticky)
 * @returns {HTMLElement} the toast element
 */
export function showToast(message, { variant = 'info', duration = 5000 } = {}) {
  const region = getRegion();

  const dismiss = createElement('button', {
    className: 'btn btn--ghost btn--icon btn--sm',
    attrs: { type: 'button', 'aria-label': 'Dismiss notification' },
    children: [closeIcon()],
  });
  const toast = createElement('div', {
    className: `toast toast--${variant}`,
    children: [createElement('p', { className: 'toast__message', text: message }), dismiss],
  });

  let timer = 0;
  const remove = () => {
    window.clearTimeout(timer);
    toast.remove();
  };
  const start = () => {
    if (duration > 0) timer = window.setTimeout(remove, duration);
  };
  const pause = () => window.clearTimeout(timer);

  on(dismiss, 'click', remove);
  on(toast, 'mouseenter', pause);
  on(toast, 'mouseleave', start);
  on(toast, 'focusin', pause);
  on(toast, 'focusout', start);

  // Insert on the next frame so the (possibly just created) live region is
  // registered by assistive technology before its content changes.
  window.requestAnimationFrame(() => {
    region.append(toast);
    start();
  });

  return toast;
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  getRegion();
  for (const trigger of qsa('[data-toast]', root)) {
    if (!claim(trigger, 'toast')) continue;
    on(trigger, 'click', () => {
      showToast(trigger.dataset.toast || '', { variant: trigger.dataset.toastVariant || 'info' });
    });
  }
}
