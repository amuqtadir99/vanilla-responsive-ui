---
name: add-component
description: Step-by-step procedure for adding a new UI component to this repository (snippet, CSS, optional JS module, docs, tests) so it follows the zero-dependency, accessibility and CSP rules. Use when asked to create, add or port a component.
---

# Add a component

1. **Snippet** — create `src/components/<name>.html` starting with the
   metadata header (`@component`, `@description`, `@css`, `@js`, `@a11y`,
   optional `@category`). Use semantic HTML and native elements first.
   Controls that need JavaScript ship with the `hidden` attribute.
2. **Styles** — add `src/assets/css/components/<file>.css`. Use tokens from
   `src/assets/css/tokens.css` only (no literal colours, no `px` font
   sizes), BEM class names, `:focus-visible` states, 44px targets, and
   `prefers-reduced-motion` / `forced-colors` support.
3. **Behaviour** (if needed) — add `src/assets/js/components/<name>.js`:
   ```js
   import { qsa, on, claim } from '../core/dom.js';
   export function init(root = document) {
     for (const el of qsa('[data-<name>]', root)) {
       if (!claim(el, '<name>')) continue;
       // enhance el; write state to ARIA attributes
     }
   }
   ```
   Register it in `src/assets/js/main.js`. Use `textContent` /
   `createElement` (never `innerHTML`), `core/announce.js` for live
   updates, and touch `window` only inside functions.
4. **Docs** — run the `generate-doc` skill (updates `docs/COMPONENTS.md`,
   the gallery and `catalog.json`).
5. **Tests** — add keyboard coverage to `tests/browser/smoke.mjs`.
6. **Validate** — run the `validate-w3c` and `audit-a11y` skills and
   `node tests/run-all.mjs`; fix everything until all pass.
