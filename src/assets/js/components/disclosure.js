/**
 * Disclosure (show/hide) pattern — WAI-ARIA APG "Disclosure".
 * Used by the mobile site menu and the dashboard sidebar.
 *
 * Markup:
 *   <button type="button" data-disclosure aria-expanded="false"
 *           aria-controls="site-menu" hidden>Menu</button>
 *   <div id="site-menu">…</div>
 *
 * Progressive enhancement: the button ships with `hidden` so it is only
 * shown once this script runs. The controlled element gets
 * data-state="open|closed", which CSS uses to collapse it (typically only
 * inside a small-screen media query).
 *
 * Options (data attributes on the button):
 *   data-disclosure="dismissible"  close on outside click and on link click
 *
 * @module components/disclosure
 */
import { qsa, on, claim } from '../core/dom.js';

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const button of qsa('[data-disclosure]', root)) {
    if (!claim(button, 'disclosure')) continue;

    const target = document.getElementById(button.getAttribute('aria-controls') || '');
    if (!target) continue;

    const isOpen = () => button.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      button.setAttribute('aria-expanded', String(open));
      target.dataset.state = open ? 'open' : 'closed';
    };

    setOpen(isOpen());
    button.hidden = false;

    on(button, 'click', () => setOpen(!isOpen()));

    // Escape closes the region and returns focus to the toggle.
    on(document, 'keydown', (event) => {
      if (event.key !== 'Escape' || !isOpen()) return;
      const active = document.activeElement;
      if (active === button || target.contains(active)) {
        setOpen(false);
        button.focus();
      }
    });

    if (button.dataset.disclosure === 'dismissible') {
      on(document, 'click', (event) => {
        const clicked = /** @type {Node} */ (event.target);
        if (isOpen() && !button.contains(clicked) && !target.contains(clicked)) {
          setOpen(false);
        }
      });

      on(target, 'click', (event) => {
        const link = /** @type {Element} */ (event.target).closest('a[href]');
        if (link) setOpen(false);
      });
    }
  }
}
