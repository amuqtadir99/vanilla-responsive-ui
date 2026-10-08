/**
 * Show / hide password toggle.
 *
 * Markup:
 *   <div class="input-group">
 *     <input class="input" id="password" type="password" autocomplete="current-password">
 *     <button type="button" class="btn btn--secondary" data-password-toggle
 *             aria-controls="password" aria-pressed="false" hidden>
 *       Show<span class="visually-hidden"> password</span>
 *     </button>
 *   </div>
 *
 * The accessible name stays constant ("Show password") and aria-pressed
 * conveys the state, as recommended for toggle buttons.
 *
 * @module components/password-toggle
 */
import { qsa, on, claim } from '../core/dom.js';

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const button of qsa('[data-password-toggle]', root)) {
    if (!claim(button, 'passwordToggle')) continue;

    const input = document.getElementById(button.getAttribute('aria-controls') || '');
    if (!(input instanceof HTMLInputElement)) continue;

    button.setAttribute('aria-pressed', 'false');
    button.hidden = false;

    on(button, 'click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
    });

    // Never submit a password field as type="text".
    if (input.form) {
      on(input.form, 'submit', () => {
        input.type = 'password';
        button.setAttribute('aria-pressed', 'false');
      });
    }
  }
}
