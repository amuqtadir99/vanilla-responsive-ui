---
name: generate-doc
description: Regenerate everything built from source - the documentation website (src/index.html and src/docs/ with live previews, highlighted code, template anatomy, guides and tokens), docs/COMPONENTS.md, the component gallery, catalog.json for AI agents and the page builder canvas. Use after adding or editing any component, block, layout, template page, design token, icon or docs/*.md guide, or when tests report generated docs are stale.
allowed-tools: Bash(node .claude/skills/generate-doc.js:*)
---

# Generate documentation

```bash
node .claude/skills/generate-doc.js          # write the generated files
node .claude/skills/generate-doc.js --check  # exit 1 if any is stale
```

Generated (never edit by hand): `docs/COMPONENTS.md`,
`src/components/index.html`, `catalog.json`, `src/index.html`, everything
under `src/docs/` except `src/docs/assets/docs.css`, `docs.js` and
`preview.css`, and `src/builder/canvas.html`. To change them, edit the
generator: `.claude/skills/generate-doc.js` (sources, catalog, canvas) and
`.claude/skills/docs-site.js` (the docs website). Files that are no longer
produced are deleted automatically.

Each component (`src/components/<name>.html`) and block
(`src/blocks/<name>.html`) starts with a metadata header:

```html
<!--
@component: Tabs                     (blocks use @block: Hero split)
@category: Navigation                (blocks: Hero, Social proof, Features, Commerce, Content, Forms, Call to action)
@description: One sentence describing it.
@css: components/tabs.css            (comma-separated, relative to src/assets/css)
@js: components/tabs.js              (or: none; relative to src/assets/js)
@a11y: Keyboard, ARIA and screen reader notes.
-->
```

A block's markup must be exactly one `<section data-block="<name>">`.
