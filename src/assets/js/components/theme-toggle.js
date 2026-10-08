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
 * Follows the operating-system preference until the user chooses; the
 * choice is persisted in localStorage and applied as <html data-theme>.
 * It is also written to a `vr_theme` cookie so a server can render
 * data-theme on first paint (see docs/INTEGRATION_GUIDE.md).
 *
 * @module components/theme-toggle
 */
import { qsa, on, claim } from '../core/dom.js';
import { getItem, setItem } from '../core/storage.js';

const STORAGE_KEY = 'vr-theme';
// Resolved lazily so the module can be imported during SSR (no window).
const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)');
let mediaBound = false;

/** @returns {'light' | 'dark'} */
export function getTheme() {
  const stored = getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark().matches ? 'dark' : 'light';
}

/**
 * @param {'light' | 'dark'} theme
 * @param {{ persist?: boolean }} [options]
 */
export function setTheme(theme, { persist = true } = {}) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    setItem(STORAGE_KEY, theme);
    document.cookie = `vr_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }
  for (const button of qsa('[data-theme-toggle]')) {
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  }
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  const stored = getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') setTheme(stored, { persist: false });

  for (const button of qsa('[data-theme-toggle]', root)) {
    if (!claim(button, 'themeToggle')) continue;
    button.setAttribute('aria-pressed', String(getTheme() === 'dark'));
    button.hidden = false;
    on(button, 'click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
  }

  // Keep buttons in sync with the OS setting until the user picks a theme.
  if (mediaBound) return;
  mediaBound = true;
  const media = prefersDark();
  on(media, 'change', () => {
    if (!getItem(STORAGE_KEY)) {
      for (const button of qsa('[data-theme-toggle]')) {
        button.setAttribute('aria-pressed', String(media.matches));
      }
    }
  });
}
