# vanilla-responsive-ui

Lightweight, dependency-free responsive UI components and page templates
built on modern W3C standards and MDN best practices. Zero setup required,
deployable anywhere.

- **Zero dependencies.** Plain HTML5, modular CSS3 and native ES modules. No
  npm, no bundler, no framework, no CDN, no web fonts.
- **Accessible by default.** Built to WCAG 2.2 AA: semantic landmarks, full
  keyboard support, visible focus, screen-reader-tested patterns, verified
  colour contrast in light and dark themes.
- **Works everywhere.** Copy into ASP.NET Core, Blazor, React, Next.js, Vue,
  Svelte, Angular, Astro, Django, Flask, FastAPI, Laravel or Rails.
- **Secure.** Runs under a strict Content-Security-Policy (no inline
  scripts, styles or handlers) with XSS-safe DOM helpers.
- **Fast.** No render-blocking scripts, components loaded on demand,
  lazy images, about 10 KB gzipped of CSS for the entire design system.
- **Progressive enhancement.** Every page works without JavaScript.

## Quick start

ES modules do not load from `file://`, so serve the folder with any static
server:

```bash
git clone https://github.com/amuqtadir99/vanilla-responsive-ui.git
cd vanilla-responsive-ui
python3 -m http.server 8080        # or: node tests/lib/server.mjs 8080
```

Open <http://localhost:8080/src/>.

To use a template, copy `src/assets/` and the template folder into your
project and keep the relative paths. See the
[integration guide](docs/INTEGRATION_GUIDE.md) for framework-specific steps.

## Templates

| Template | Path | Highlights |
| --- | --- | --- |
| Landing page | [`src/templates/landing-page/`](src/templates/landing-page/index.html) | Hero, feature grid, pricing, testimonials, FAQ accordion, newsletter form |
| Dashboard | [`src/templates/dashboard/`](src/templates/dashboard/index.html) | Sidebar layout, KPI cards, accessible table chart, sortable table, tabs, modal dialog with validation |
| E-commerce | [`src/templates/e-commerce/`](src/templates/e-commerce/index.html) | Instant filters (GET fallback), sorting, lazy images, cart counter, pagination |
| Auth | [`src/templates/auth/`](src/templates/auth/index.html) | Sign in and registration with inline validation, password toggle, confirm-password matching |

All 14 components are rendered live in the
[component gallery](src/components/index.html) and documented in
[docs/COMPONENTS.md](docs/COMPONENTS.md).

## Project structure

```text
.claude/            Claude Code settings and skills (validation, a11y audit, doc generator)
docs/               Architecture, accessibility, security, integration, components
src/
├── assets/
│   ├── css/        tokens.css (design tokens), base.css, components/
│   ├── js/         main.js, core/ (helpers), components/ (behaviour)
│   ├── icons/      SVG icon library
│   └── images/     Placeholder artwork
├── components/     Copy-paste snippets + generated gallery
└── templates/      landing-page/, dashboard/, e-commerce/, auth/
tests/              Zero-dependency checks + optional Playwright tests
```

## Theming

All colours, type sizes, spacing, radii and motion live in
[`src/assets/css/tokens.css`](src/assets/css/tokens.css). Override them in
your own stylesheet loaded after it:

```css
:root {
  --color-primary: #0f766e;
  --color-primary-hover: #115e59;
  --color-primary-soft: #ccfbf1;
  --font-main: "Inter", system-ui, sans-serif;
}
```

Dark mode follows the operating system and can be toggled by the user. Run
`node tests/run-all.mjs --only contrast` after changing colours: it verifies
WCAG contrast for every token pair in both themes.

## JavaScript

`src/assets/js/main.js` initialises whatever components are on the page,
loading each module only when needed. Modules can also be used individually:

```js
import { init as initTabs } from './assets/js/components/tabs.js';
import { showToast } from './assets/js/components/toast.js';

initTabs(document.querySelector('#settings'));
showToast('Saved', { variant: 'success' });
```

Every component module exports an idempotent `init(root)`. Shared helpers
are in `core/dom.js`, `core/announce.js` and `core/storage.js`. See
[ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Validation and tests

The test suite has no dependencies beyond Node.js 18+.

```bash
bash .claude/skills/validate-w3c.sh --install   # Nu HTML Checker (needs Java 11+) + HTML/CSS/JS standards
bash .claude/skills/audit-a11y.sh               # static a11y audit, contrast, browser checks
node tests/run-all.mjs                          # all static suites incl. docs sync
node tests/browser/smoke.mjs                    # Playwright (optional; skipped if not installed)
```

CI runs all of the above on every pull request
([`.github/workflows/validate.yml`](.github/workflows/validate.yml)).

## Browser support

Last two versions of Chrome, Edge, Firefox and Safari (desktop and mobile).
Newer platform features (container queries, invoker commands, `closedby`)
are used as enhancements with fallbacks.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): file layout, CSS and JS conventions, progressive enhancement
- [Accessibility](docs/ACCESSIBILITY.md): patterns, testing, manual checklist
- [Security](docs/SECURITY.md): CSP, XSS prevention, server responsibilities
- [Integration guide](docs/INTEGRATION_GUIDE.md): ASP.NET Core, React/Next.js, Vue, Svelte, Angular, Astro, Django, Flask, FastAPI, Laravel, Rails
- [Components](docs/COMPONENTS.md): generated reference with usage for each stack
- [Contributing](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md) (rules for AI coding agents)

## License

[MIT](LICENSE) © 2026 Abdul Muqtadir
