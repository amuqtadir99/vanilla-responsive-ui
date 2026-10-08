# Contributing

Thanks for helping improve vanilla-responsive-ui. The project has a few firm
rules that keep it portable, accessible and secure.

## Ground rules

1. **No dependencies.** No packages, CDNs, frameworks, web fonts or icon
   fonts. Write small vanilla helpers instead (`src/assets/js/core/`).
2. **Standards first.** Valid HTML5 (checked with the Nu HTML Checker),
   semantic elements, native controls before ARIA.
3. **WCAG 2.2 AA.** Keyboard operable, visible focus, labelled controls,
   sufficient contrast, works at 320 px and 400% zoom.
4. **CSP safe.** No inline scripts, styles or event handlers.
5. **Docs in the same change.** Components and templates are documented
   when they are added or modified.

The full coding standards are in [CLAUDE.md](CLAUDE.md) (they apply equally
to people and AI agents) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Workflow

```bash
python3 -m http.server 8080                    # preview at http://localhost:8080/src/
node .claude/skills/pages.js sync              # after editing src/layouts/partials/*.html
node .claude/skills/generate-doc.js            # after editing components, layouts or pages (gallery, docs, catalog.json)
bash .claude/skills/validate-w3c.sh --install  # W3C + standards
bash .claude/skills/audit-a11y.sh              # accessibility
node tests/run-all.mjs                         # everything static
```

Before opening a pull request:

- [ ] All commands above pass.
- [ ] Tested with keyboard only.
- [ ] Tested with at least one screen reader (NVDA, VoiceOver or TalkBack).
- [ ] Checked light and dark themes and 320 px width.
- [ ] Updated `README.md` / `docs/` as needed.

## Adding a component

1. Create `src/components/<name>.html` starting with the metadata header:
   ```html
   <!--
   @component: Name
   @category: Basics | Content | Forms | Feedback | Overlays | Data | AI | …
   @description: One sentence.
   @css: components/<file>.css
   @js: components/<name>.js   (or: none)
   @a11y: Keyboard, ARIA and screen reader notes.
   -->
   ```
2. Add styles in `src/assets/css/components/` using tokens only.
3. If it needs behaviour, add `src/assets/js/components/<name>.js` exporting
   `init(root = document)` and register it in `src/assets/js/main.js`.
4. Run `node .claude/skills/generate-doc.js` to update
   `docs/COMPONENTS.md` and the gallery.
5. Cover its keyboard behaviour in `tests/browser/smoke.mjs`.

## Adding a page or layout

Use the pages CLI rather than copying a page by hand, so the partials,
paths and stylesheets are right:

```bash
node .claude/skills/pages.js new --family website --layout sidebar-left --name careers --title "Careers"
```

See [docs/LAYOUTS.md](docs/LAYOUTS.md). Never edit generated files
(`docs/COMPONENTS.md`, `src/components/index.html`, `catalog.json`) or the
text between `@partial` markers; CI fails if they drift.

## Commit messages

Use the imperative mood and explain why: `Add sortable table component`,
`Fix focus return when the dialog closes`.
