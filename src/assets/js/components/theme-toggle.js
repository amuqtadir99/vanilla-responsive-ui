/**
 * Light / dark theme toggle.
 *
 * Markup:
 *   <button type="button" class="btn btn--ghost btn--icon theme-toggle"
 *           data-theme-toggle aria-pressed="false" hidden>
 *     <svg class="icon theme-toggle__light" aria-hidden="true">…moon…</svg>
 *     <svg class="icon theme-toggle__dark" aria-hidden="true">…sun…</svg>
 *     <span class="visually-hidden">Dark theme</span>
 *   </button>
 *
 * Follows the operating-system preference until the user chooses. The choice
 * is stored by core/theme.js (localStorage + a `vr_theme` cookie so a server
 * can render data-theme on first paint, see docs/THEMING.md).
 *
 * @module components/theme-toggle
 */
import { qsa, on, claim } from '../core/dom.js';
import { effectiveScheme, setMode } from '../core/theme.js';

/** @returns {'light' | 'dark'} */
export function getTheme() {
  return effectiveScheme();
}

/** @param {'light' | 'dark' | 'system'} theme */
export function setTheme(theme) {
  setMode(theme);
}

function sync() {
  const dark = effectiveScheme() === 'dark';
  for (const button of qsa('[data-theme-toggle]')) {
    button.setAttribute('aria-pressed', String(dark));
  }
}

let listening = false;

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const button of qsa('[data-theme-toggle]', root)) {
    if (!claim(button, 'themeToggle')) continue;
    button.hidden = false;
    on(button, 'click', () => setMode(effectiveScheme() === 'dark' ? 'light' : 'dark'));
  }
  sync();

  if (listening) return;
  listening = true;
  on(document, 'vr:themechange', sync);
}
