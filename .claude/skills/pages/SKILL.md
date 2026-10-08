---
name: pages
description: Create new pages from the layout library and keep shared headers, footers and navigation identical across pages. Use when asked to add a page or inner page to a template, choose or change a page layout, or after editing any partial in src/layouts/partials.
allowed-tools: Bash(node .claude/skills/pages.js:*)
---

# Pages, layouts and partials

```bash
node .claude/skills/pages.js list                     # layouts, partials and families
node .claude/skills/pages.js new --family website --layout sidebar-left \
     --name careers --title "Careers"                 # scaffold src/templates/website/careers.html
node .claude/skills/pages.js sync                     # re-stamp partials into every page
node .claude/skills/pages.js sync --check             # exit 1 if any page is out of sync
```

## How it works

- **Layouts** live in `src/layouts/<layout>.html`: complete, valid pages
  with placeholder content and a `<!-- @slot content -->` region.
- **Partials** live in `src/layouts/partials/<name>.html` (header, footer,
  sidebar, template switcher). Pages embed them between markers:
  `<!-- @partial site-header -->` … `<!-- @end site-header -->`.
  `sync` replaces everything between the markers, rewrites `{{root}}` to
  the page's relative path to `src/`, and marks the link to the current
  page with `aria-current="page"`.
- **Families** (`website`, `dashboard`, `e-commerce`, `auth`, `ai`) decide
  which partials and stylesheets a new page gets; see `pages.js list`.

After creating a page:

1. Replace the placeholder content inside `<main>`.
2. Add the page to the family's navigation partial if it should be linked,
   then run `pages.js sync`.
3. Run `node .claude/skills/generate-doc.js` (updates `catalog.json`) and the
   `validate-w3c` and `audit-a11y` skills.
