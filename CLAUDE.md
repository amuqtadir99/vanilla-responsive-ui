# CLAUDE.md — working in vanilla-responsive-ui

Dependency-free, accessible, responsive UI templates in plain HTML5, modular
CSS3 and vanilla JavaScript (ES modules). Anything added here must be usable
unchanged in ASP.NET Core, React/Next.js, Vue, Svelte, Angular, Astro, Django,
Flask, FastAPI, Laravel or Rails.

## Non-negotiable rules

1. **Standalone validity.** Do not add external dependencies: no jQuery,
   Bootstrap, Tailwind, Lodash, icon fonts, web fonts, CDNs, `package.json`
   or `node_modules`. If you need a utility, write a small function in
   `src/assets/js/core/`. `npm install` / `yarn add` / `pnpm add` are denied
   in `.claude/settings.json`.
2. **Automated validation.** Before finishing any task, run:
   ```bash
   bash .claude/skills/validate-w3c.sh      # Nu HTML Checker + HTML/CSS/JS standards
   bash .claude/skills/audit-a11y.sh        # static a11y, contrast, browser checks
   node tests/run-all.mjs                   # everything static, incl. docs sync
   ```
   Use `--install` on the first run of `validate-w3c.sh` to fetch `vnu.jar`
   into `.cache/` (needs Java 11+). Fix every error; do not weaken a check
   to make it pass.
3. **Accessibility (WCAG 2.2 AA).** Every interactive element has an
   accessible name, a visible `:focus-visible` state, a 44×44 px target and
   the right ARIA state (`aria-expanded`, `aria-pressed`, `aria-selected`,
   `aria-current`, `aria-invalid`). Prefer native HTML (`<button>`,
   `<details>`, `<dialog>`, `<fieldset>`) over ARIA.
4. **Documentation synchronicity.** When you add or change a component or
   template, update the docs in the same change:
   - Component snippet header in `src/components/<name>.html`, then run
     `node .claude/skills/generate-doc.js` (regenerates `docs/COMPONENTS.md`
     and the live gallery `src/components/index.html`; never edit those by
     hand).
   - Templates: `README.md` table and `docs/INTEGRATION_GUIDE.md`.
   - New patterns: `docs/ARCHITECTURE.md`, `docs/ACCESSIBILITY.md`,
     `docs/SECURITY.md` as relevant.
5. **Cross-browser and performance.** Target the last two versions of
   evergreen browsers; newer features must degrade gracefully (container
   queries → stacked layout, invoker commands → JS polyfill). No
   render-blocking scripts, no layout thrashing (batch reads before writes),
   `width`/`height` on every image, `loading="lazy"` below the fold.

## Coding standards

**HTML**
- `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="utf-8">` first in
  `<head>`, viewport meta (never disable zoom), a CSP `<meta>`.
- Skip link → `<header>` → `<nav aria-label>` → `<main id="main" tabindex="-1">` → `<footer>`.
- One `<h1>` per page; never skip heading levels.
- No inline `style`, `<style>`, inline `<script>` or `on*=` handlers (CSP).
- Inline SVG icons: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">`.
  Icon-only controls carry the name (`<span class="visually-hidden">`).
- Controls that only work with JavaScript ship with `hidden` and are
  revealed by their module (progressive enhancement).

**CSS**
- All values come from tokens in `src/assets/css/tokens.css`
  (`--color-*`, `--spacing-*`, `--font-size-*`, `--radius-*`, …). No
  hard-coded colours outside that file; no `px` font sizes.
- Layout with Grid and Flexbox only. Component-level responsiveness with
  `@container`, page-level with `@media` (mobile-first, `em` breakpoints:
  48em, 60em, 64em).
- Fluid type with `clamp()` using `rem + vw` so text still zooms.
- BEM-style class names: `.block`, `.block__element`, `.block--modifier`.
- Support `prefers-reduced-motion`, `prefers-color-scheme` and
  `forced-colors`. `!important` only in `base.css` utilities.

**JavaScript**
- Native ES modules only. Each component in `src/assets/js/components/`
  exports `init(root = document)`, guards against double-init with
  `claim()` from `core/dom.js`, and is registered in `src/assets/js/main.js`.
- No globals, no `var`, no `innerHTML`/`insertAdjacentHTML`/`eval`. Insert
  text with `textContent` or `createElement()` from `core/dom.js`.
- Touch `window`/`document` lazily (inside functions) so modules can be
  imported during SSR.
- Wrap `localStorage` with `core/storage.js`; announce dynamic changes with
  `core/announce.js`.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/assets/css/tokens.css` | Design tokens, light/dark themes |
| `src/assets/css/base.css` | Reset, typography, layout primitives, a11y helpers |
| `src/assets/css/components/` | One stylesheet per component family |
| `src/assets/js/main.js` | Entry point; lazy-loads components present on the page |
| `src/assets/js/core/` | `dom.js`, `announce.js`, `storage.js` |
| `src/assets/js/components/` | Interactive behaviour (one module per component) |
| `src/assets/icons/` | SVG icon library (inline them in markup) |
| `src/components/` | Copy-paste snippets with metadata headers (+ generated gallery) |
| `src/templates/` | Complete pages: landing-page, dashboard, e-commerce, auth |
| `tests/` | Zero-dependency checks (`run-all.mjs`), Playwright smoke tests |
| `.claude/skills/` | `validate-w3c.sh`, `audit-a11y.sh`, `generate-doc.js` |
| `docs/` | Architecture, accessibility, security, integration, components |

## Adding a component (checklist)

1. Markup snippet `src/components/<name>.html` with the metadata header
   (`@component`, `@description`, `@css`, `@js`, `@a11y`).
2. Styles in `src/assets/css/components/` using tokens only.
3. Behaviour (if needed) in `src/assets/js/components/<name>.js` exporting
   `init(root)`; add it to the registry in `main.js`.
4. `node .claude/skills/generate-doc.js`.
5. Add browser coverage to `tests/browser/smoke.mjs` for keyboard behaviour.
6. Run the three validation commands above.

## Previewing

ES modules do not load from `file://`. Serve the repository root:
`python3 -m http.server 8080` (or `node tests/lib/server.mjs 8080`) and open
<http://localhost:8080/src/>.
