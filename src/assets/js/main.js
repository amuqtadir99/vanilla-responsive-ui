/**
 * Entry point. Load with:
 *   <script type="module" src="assets/js/main.js"></script>
 *
 * Module scripts are deferred by default, so this never blocks rendering.
 * Each component is fetched only if its markup is present on the page.
 * Call initAll(container) again after inserting new markup (components
 * guard against double initialisation).
 *
 * @module main
 */
import { initTheme } from './core/theme.js';

// Apply stored colour mode, brand, density and radius before anything else.
initTheme();

const registry = [
  ['[data-theme-toggle]', () => import('./components/theme-toggle.js')],
  ['[data-disclosure]', () => import('./components/disclosure.js')],
  ['[data-tabs]', () => import('./components/tabs.js')],
  ['button[commandfor], dialog[closedby]', () => import('./components/dialog.js')],
  ['form[data-validate]', () => import('./components/form-validation.js')],
  ['[data-password-toggle]', () => import('./components/password-toggle.js')],
  ['[data-toast]', () => import('./components/toast.js')],
  ['table[data-sortable]', () => import('./components/table-sort.js')],
  ['table[data-chart]', () => import('./components/data-chart.js')],
  ['[data-copy]', () => import('./components/copy.js')],
  ['[data-viz]', () => import('./components/chart.js')],
  ['[data-grid]', () => import('./components/data-grid.js')],
  ['[data-chat], [data-chat-widget]', () => import('./components/chat.js')],
  ['[data-theme-customizer], [data-theme-panel-trigger]', () => import('./components/theme-customizer.js')],
];

/**
 * Initialise every component found inside `root`.
 * @param {ParentNode} [root=document]
 * @returns {Promise<void>}
 */
export async function initAll(root = document) {
  const pending = registry
    .filter(([selector]) => root.querySelector(selector))
    .map(async ([selector, load]) => {
      try {
        const module = await load();
        module.init(root);
      } catch (error) {
        // One failing component must never break the others.
        console.error(`[vanilla-responsive-ui] Failed to initialise "${selector}"`, error);
      }
    });
  await Promise.all(pending);
}

initAll();
