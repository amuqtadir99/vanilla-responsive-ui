# Layouts, pages and partials

Every page in this repository is built from three pieces:

1. **A layout**: how regions (sidebar, main, aside) are arranged.
2. **Partials**: shared chrome such as headers, footers and sidebars,
   written once and stamped into every page.
3. **Content**: components from [`src/components/`](../src/components/).

Try every layout live in the **layout builder**
([`src/layouts/index.html`](../src/layouts/index.html)): pick a layout,
preview it at desktop, tablet or phone width in any brand colour, then copy
the HTML, a CLI command or a prompt for your AI coding agent.

## The eight layouts

| Layout | Regions | Best for | Example |
| --- | --- | --- | --- |
| `stacked` | main | Home and marketing pages | [website home](../src/templates/website/index.html) |
| `sidebar-left` | sidebar, main | Services, help centres, settings | [services](../src/templates/website/services.html) |
| `sidebar-right` | main, aside | Blogs, news, listings | [blog](../src/templates/website/blog.html), [cart](../src/templates/e-commerce/cart.html) |
| `holy-grail` | sidebar, main, aside | Portals, knowledge bases, catalogues | [layout](../src/layouts/holy-grail.html) |
| `docs` | sidebar, main, aside | Documentation and long articles | [article](../src/templates/website/blog-post.html) |
| `split` | two halves | Contact, product detail, sign-up | [contact](../src/templates/website/contact.html), [product](../src/templates/e-commerce/product.html) |
| `centered` | main | Sign in, checkout steps, focused forms | [layout](../src/layouts/centered.html) |
| `app-shell` | topbar, sidebar, main | Dashboards, admin, AI apps | [dashboard](../src/templates/dashboard/index.html), [AI assistant](../src/templates/ai/index.html) |

Layouts are CSS only (`src/assets/css/layouts.css`). Choose one with an
attribute; regions are ordinary elements:

```html
<div class="container layout" data-layout="sidebar-left">
  <nav class="layout__sidebar layout__sidebar--sticky" aria-label="In this section">…</nav>
  <main class="layout__main" id="main" tabindex="-1">…</main>
</div>

<div class="container layout" data-layout="holy-grail">
  <nav class="layout__sidebar">…</nav>
  <div class="layout__main">…</div>
  <aside class="layout__aside" aria-label="Related">…</aside>
</div>
```

Rules every layout follows:

- **Mobile first.** Regions stack in source order on small screens and
  become columns at `48em` (and `64em` for three-column layouts).
- **Source order = reading order.** Always `sidebar → main → aside`, so
  keyboard and screen reader order match what people see (WCAG 2.4.3).
- **Tunable widths.** Override `--sidebar-size`, `--aside-size` and
  `--layout-gap` on the `.layout` element.
- **Sticky side regions.** Add `layout__sidebar--sticky` or
  `layout__aside--sticky` to keep navigation in view on wide screens.
- **Nesting works.** A section inside a stacked page can use
  `data-layout="split"` (see the website home page).

The app shell uses its own classes: `.app-shell`, `.app-shell__topbar`,
`.app-shell__sidebar` (collapses behind a menu button below `64em`) and
`.app-shell__main`.

## Partials

Partials live in [`src/layouts/partials/`](../src/layouts/partials/):

| Partial | Role | Used by |
| --- | --- | --- |
| `template-switcher` | Demo navigation between templates (remove in production) | every page |
| `theme-panel` | Theme customizer drawer | every page |
| `site-header`, `site-footer` | header / footer | website, layouts |
| `shop-header`, `shop-footer` | header / footer | e-commerce |
| `app-topbar`, `app-sidebar` | header / sidebar | dashboard |
| `ai-topbar` | header | AI templates |
| `auth-header`, `auth-footer` | header / footer | auth |
| `chat-widget` | floating support assistant | website, e-commerce, landing |

Pages embed a partial between markers. Everything between the markers is
generated, so edit the partial, not the page:

```html
<!-- @partial site-header -->
<header class="site-header">…</header>
<!-- @end site-header -->
```

When stamping, `pages.js`:

- replaces `{{root}}` with the page's relative path to `src/`,
- adds `aria-current="page"` to the link that points at the current page,
- adds `aria-current="true"` to links marked `data-section` (the page is
  inside that link's folder) or `data-section-prefix="blog"` (the page's
  file name starts with that prefix).

## The pages CLI

```bash
node .claude/skills/pages.js list                 # layouts, partials, families
node .claude/skills/pages.js new --family website --layout sidebar-left \
     --name careers --title "Careers" --description "Open roles at Acme Studio."
node .claude/skills/pages.js sync                 # re-stamp partials everywhere
node .claude/skills/pages.js sync --check         # CI: fail if any page is stale
```

`new` copies the layout, rewrites relative paths for the new folder, swaps
in the family's header/footer/sidebar partials, adds the family's
stylesheet and scripts, sets the title, description and `<h1>`, and stamps
the partials. Options: `--no-demo` (omit the template switcher),
`--force` (overwrite), `--dry-run` (print instead of writing).

Families decide which partials a page gets:

| Family | Folder | Header | Footer | Sidebar | Widget |
| --- | --- | --- | --- | --- | --- |
| `website` | `src/templates/website/` | `site-header` | `site-footer` | — | `chat-widget` |
| `dashboard` | `src/templates/dashboard/` | `app-topbar` | — | `app-sidebar` | — |
| `e-commerce` | `src/templates/e-commerce/` | `shop-header` | `shop-footer` | — | `chat-widget` |
| `auth` | `src/templates/auth/` | `auth-header` | `auth-footer` | — | — |
| `ai` | `src/templates/ai/` | `ai-topbar` | — | — | — |

After creating a page: replace the placeholder content, add the page to the
family's navigation partial if it should be linked, then run
`pages.js sync`, `generate-doc.js` (updates `catalog.json`) and the
validation skills.

## Adding a layout

1. Add rules for `.layout[data-layout="your-layout"]` to `layouts.css`
   (mobile first, regions in source order).
2. Create `src/layouts/your-layout.html` with the metadata header
   (`@layout`, `@description`, `@regions`) and partial markers; copy an
   existing layout as a starting point.
3. Add it to the builder (`src/layouts/index.html`) and the table above.
4. Run `node .claude/skills/pages.js sync`, `node .claude/skills/generate-doc.js`
   and the validation skills.

## In other frameworks

Partials map directly to layout components: `_Layout.cshtml` + partial
views in ASP.NET Core, `layout.tsx` + components in Next.js, `{% extends %}`
+ `{% include %}` in Django. Keep the same classes and `data-layout`
attributes and the CSS works unchanged. See
[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md).
