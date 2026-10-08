/**
 * Tabs — WAI-ARIA APG "Tabs with Automatic Activation".
 *
 * Markup (no ARIA roles needed in the HTML; they are added here so the
 * no-JS version stays a plain, valid list of sections):
 *
 *   <div class="tabs" data-tabs>
 *     <div class="tabs__list" data-tabs-list data-label="Account settings" hidden>
 *       <button type="button" class="tabs__tab" data-tab="panel-profile">Profile</button>
 *       <button type="button" class="tabs__tab" data-tab="panel-billing">Billing</button>
 *     </div>
 *     <section class="tabs__panel" id="panel-profile" aria-labelledby="panel-profile-h">
 *       <h3 class="tabs__heading" id="panel-profile-h">Profile</h3> …
 *     </section>
 *     …
 *   </div>
 *
 * Keyboard: Left/Right (Up/Down when vertical) move between tabs, Home/End
 * jump to the first/last tab. Only the active tab is in the tab order.
 *
 * @module components/tabs
 */
import { qs, qsa, on, claim, ensureId } from '../core/dom.js';

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const container of qsa('[data-tabs]', root)) {
    if (!claim(container, 'tabs')) continue;

    const list = qs('[data-tabs-list]', container);
    if (!list) continue;

    const tabs = qsa('[data-tab]', list).filter((tab) =>
      document.getElementById(tab.dataset.tab || '')
    );
    if (tabs.length === 0) continue;

    const vertical = list.getAttribute('aria-orientation') === 'vertical';

    list.setAttribute('role', 'tablist');
    if (list.dataset.label) list.setAttribute('aria-label', list.dataset.label);

    for (const tab of tabs) {
      const panel = document.getElementById(tab.dataset.tab);
      ensureId(tab, 'tab');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
    }

    const select = (nextTab, { focus = false } = {}) => {
      for (const tab of tabs) {
        const selected = tab === nextTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        document.getElementById(tab.dataset.tab).hidden = !selected;
      }
      if (focus) nextTab.focus();
    };

    const initial =
      tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ||
      tabs.find((tab) => location.hash === `#${tab.dataset.tab}`) ||
      tabs[0];
    select(initial);

    on(list, 'click', (event) => {
      const tab = /** @type {Element} */ (event.target).closest('[role="tab"]');
      if (tab && tabs.includes(tab)) select(tab);
    });

    on(list, 'keydown', (event) => {
      const current = tabs.indexOf(/** @type {HTMLElement} */ (document.activeElement));
      if (current === -1) return;

      const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
      let next = null;

      if (event.key === prevKey) next = tabs[(current - 1 + tabs.length) % tabs.length];
      else if (event.key === nextKey) next = tabs[(current + 1) % tabs.length];
      else if (event.key === 'Home') next = tabs[0];
      else if (event.key === 'End') next = tabs[tabs.length - 1];

      if (next) {
        event.preventDefault();
        select(next, { focus: true });
      }
    });

    list.hidden = false;
    container.classList.add('tabs--enhanced');
  }
}
