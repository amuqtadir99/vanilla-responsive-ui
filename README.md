# vanilla-responsive-ui

Lightweight, dependency-free responsive UI components, page layouts and
multi-page templates built on modern W3C standards and MDN best practices.
Zero setup required, deployable anywhere, and ready for AI coding agents.

- **Zero dependencies.** Plain HTML5, modular CSS3 and native ES modules. No
  npm, bundler, framework, CDN or web fonts.
- **Accessible by default.** WCAG 2.2 AA: semantic landmarks, full keyboard
  support, visible focus, screen-reader-friendly charts and chat, verified
  colour contrast for every theme preset in light and dark mode.
- **Real multi-page templates.** A website, a dashboard, a shop, AI
  assistants and auth flows, linked by shared navigation.
- **Dynamic theming.** Brand presets, any custom brand colour, density and
  corner style: live in the theme panel, or with one attribute on `<html>`.
- **Layouts on demand.** Eight responsive layouts, a visual layout builder
  and a CLI that creates new pages with the right header, footer and styles.
- **Data and charts.** Interactive SVG charts and data grids fed by JSON:
  sample data included, your API with one setting.
- **AI interfaces.** Chat panels, a floating support widget, a full-page
  assistant and an agent workspace that stream from your own model.
- **Built for AI agents.** `CLAUDE.md`, `llms.txt`, a generated
  `catalog.json` and "Copy path for AI" buttons in the component gallery.
- **Secure.** Strict Content-Security-Policy (no inline scripts, styles or
  handlers) and XSS-safe rendering, including model output.

## Quick start

ES modules do not load from `file://`, so serve the folder with any static
server:

```bash
git clone https://github.com/amuqtadir99/vanilla-responsive-ui.git
cd vanilla-responsive-ui
python3 -m http.server 8080        # or: node tests/lib/server.mjs 8080
```

Open <http://localhost:8080/src/>. The bar at the top of every page
switches between templates and opens the theme panel.

## Templates

| Template | Pages | Highlights |
| --- | --- | --- |
| [Website](src/templates/website/index.html) (`templates/website`) | Home, about, services, blog, article, contact | Each page uses a different layout; support chat widget |
| [Dashboard](src/templates/dashboard/index.html) (`templates/dashboard`) | Overview, analytics, orders, customers, AI assistant, settings | SVG charts with keyboard exploration, data grids, order dialog, data-source settings, "ask your data" analyst |
| [E-commerce](src/templates/e-commerce/index.html) (`templates/e-commerce`) | Listing, product, cart | Instant filters, CSS-only gallery, reviews chart, working cart with promo codes |
| [AI](src/templates/ai/index.html) (`templates/ai`) | Assistant, agent workspace | Streaming chat, saved conversations, attachments, live agent plan and tool calls |
| [Landing page](src/templates/landing-page/index.html) (`templates/landing-page`) | Single page | Hero, features, pricing, testimonials, FAQ, newsletter |
| [Auth](src/templates/auth/index.html) (`templates/auth`) | Sign in, create account, reset password | Accessible validation, password toggle |

Also see the [component gallery](src/components/index.html) (20 components)
and the [layout builder](src/layouts/index.html).

## Build pages

```bash
node .claude/skills/pages.js list
node .claude/skills/pages.js new --family website --layout sidebar-left --name careers --title "Careers"
node .claude/skills/pages.js sync
```

Shared headers, footers and sidebars live once in `src/layouts/partials/`
and are stamped into every page. See [docs/LAYOUTS.md](docs/LAYOUTS.md).

## Theme

```html
<html lang="en" data-brand="teal" data-density="compact" data-radius="round">
```

Or open **Theme** in the top bar, pick any colour, and copy the generated
CSS into `brand.css`. See [docs/THEMING.md](docs/THEMING.md).

## Connect data and AI

- Charts and grids: `data-source="sales"` loads `src/data/sales.json`; point
  every source at your API in Dashboard → Settings → Data sources or with
  `setDataBase()`. See [docs/DATA.md](docs/DATA.md).
- Chat: add `data-chat-endpoint="/api/chat"` and stream NDJSON or SSE events
  from your backend. Node.js and Python examples for Claude are in
  [docs/AI-CHAT.md](docs/AI-CHAT.md).

## Working with AI coding agents

- [`CLAUDE.md`](CLAUDE.md): the rules agents follow in this repository.
- [`llms.txt`](llms.txt): a map of the documentation for language models.
- [`catalog.json`](catalog.json): every component, layout, template page,
  partial, data file and skill with exact file paths (generated).
- The component gallery's **Copy path for AI** button copies the markup,
  CSS, JS and docs paths for one component, ready to paste into a prompt;
  **Copy code** copies the markup itself.
- Claude Code skills in [`.claude/skills/`](.claude/skills/):
  `validate-w3c`, `audit-a11y`, `generate-doc`, `pages`, `add-component`.

## Project structure

```text
.claude/            Claude Code settings and skills (SKILL.md + scripts)
docs/               Architecture, layouts, theming, data, AI chat, accessibility, security, integration, components
src/
├── index.html      Home: links to every template and tool
├── assets/
│   ├── css/        tokens.css, themes.css, base.css, layouts.css, components/
│   ├── js/         main.js, core/ (dom, data, format, theme, markdown, …), components/, demo/
│   ├── icons/      SVG icon library
│   └── images/     Placeholder artwork
├── components/     Copy-paste snippets + generated gallery
├── layouts/        Eight layout pages, the layout builder and partials/
├── data/           Sample JSON for charts, grids and assistants
└── templates/      website/, dashboard/, e-commerce/, ai/, landing-page/, auth/
tests/              Zero-dependency checks + optional Playwright tests
catalog.json        Generated index for tools and AI agents
llms.txt            Documentation map for language models
```

## Validation and tests

The test suite needs only Node.js 18+.

```bash
bash .claude/skills/validate-w3c.sh --install   # Nu HTML Checker (Java 11+) + HTML/CSS/JS standards
bash .claude/skills/audit-a11y.sh               # static a11y audit, contrast, browser checks
node tests/run-all.mjs                          # all static suites incl. docs and partial sync
node tests/browser/smoke.mjs                    # Playwright (optional; skipped if not installed)
```

CI runs all of the above on every pull request
([`.github/workflows/validate.yml`](.github/workflows/validate.yml)).

## Browser support

Last two versions of Chrome, Edge, Firefox and Safari (desktop and mobile).
Newer features (container queries, `:has()`, invoker commands, `closedby`)
are enhancements with fallbacks.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): file layout, CSS and JS conventions, progressive enhancement
- [Layouts](docs/LAYOUTS.md): layouts, partials and the pages CLI
- [Theming](docs/THEMING.md): tokens, presets, custom colours, runtime API
- [Data](docs/DATA.md): data sources, charts and data grids
- [AI chat](docs/AI-CHAT.md): chat components, streaming protocol, backend examples
- [Accessibility](docs/ACCESSIBILITY.md): patterns, testing, manual checklist
- [Security](docs/SECURITY.md): CSP, XSS prevention, server responsibilities
- [Integration guide](docs/INTEGRATION_GUIDE.md): ASP.NET Core, React/Next.js, Vue, Svelte, Angular, Astro, Django, Flask, FastAPI, Laravel, Rails
- [Components](docs/COMPONENTS.md): generated reference with usage for each stack
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE) © 2026 Abdul Muqtadir
