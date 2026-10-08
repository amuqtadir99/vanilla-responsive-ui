---
name: generate-doc
description: Regenerate component documentation from the snippets in src/components - docs/COMPONENTS.md, the live gallery src/components/index.html and the machine-readable catalog.json used by AI agents. Use after adding or editing any component snippet, layout or template page, or when tests report generated docs are stale.
allowed-tools: Bash(node .claude/skills/generate-doc.js:*)
---

# Generate component documentation

```bash
node .claude/skills/generate-doc.js          # write the generated files
node .claude/skills/generate-doc.js --check  # exit 1 if they are stale
```

Never edit `docs/COMPONENTS.md`, `src/components/index.html` or
`catalog.json` by hand: they are rebuilt from source.

Each snippet in `src/components/<name>.html` must start with a metadata
header:

```html
<!--
@component: Tabs
@description: One sentence describing the component.
@css: components/tabs.css            (comma-separated, relative to src/assets/css)
@js: components/tabs.js              (or: none; relative to src/assets/js)
@a11y: Keyboard, ARIA and screen reader notes.
-->
```

Optional keys: `@category:` (groups the gallery, e.g. "AI", "Data") and
`@demo-css:` / `@demo-js:` for files only the gallery needs.
