# Components

<!-- GENERATED FILE. Do not edit by hand: update the snippet in src/components/ and run `node .claude/skills/generate-doc.js`. -->

Every component is a plain HTML snippet in [`src/components/`](../src/components/) plus CSS and, where needed, a JavaScript module. Try them live in the [component gallery](../src/components/index.html) (serve the repository over HTTP), which has **Copy path for AI** and **Copy code** buttons for each one. The same information is available to tools in [`catalog.json`](../catalog.json).

All components need `tokens.css`, `themes.css` and `base.css`. Components with JavaScript are initialised automatically by `main.js`, or individually by importing the module and calling `init(rootElement)`. See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for framework setup.

| Component | Category | CSS | JavaScript |
| --- | --- | --- | --- |
| [Site footer](#site-footer) | Layout | `components/footer.css`, `components/header.css` | — |
| [Site header](#site-header) | Layout | `components/button.css`, `components/header.css` | `components/disclosure.js`, `components/theme-toggle.js` |
| [Breadcrumb](#breadcrumb) | Navigation | `components/navigation.css` | — |
| [Pagination](#pagination) | Navigation | `components/navigation.css` | — |
| [Tabs](#tabs) | Navigation | `components/tabs.css` | `components/tabs.js` |
| [Button](#button) | Basics | `components/button.css` | — |
| [Accordion](#accordion) | Content | `components/accordion.css` | — |
| [Card](#card) | Content | `components/card.css` | — |
| [Form fields](#form-field) | Forms | `components/form.css`, `components/button.css` | `components/form-validation.js`, `components/password-toggle.js` |
| [Alert and badge](#alert) | Feedback | `components/feedback.css` | — |
| [Toast](#toast) | Feedback | `components/feedback.css`, `components/button.css` | `components/toast.js` |
| [Dialog](#dialog) | Overlays | `components/dialog.css` | `components/dialog.js` |
| [Charts](#chart) | Data | `components/chart.css`, `components/table.css` | `components/chart.js` |
| [Data grid](#data-grid) | Data | `components/table.css`, `components/form.css`, `components/navigation.css`, `components/feedback.css`, `components/button.css` | `components/data-grid.js` |
| [Data table](#data-table) | Data | `components/table.css`, `components/feedback.css` | `components/table-sort.js`, `components/data-chart.js` |
| [AI chat](#chat) | AI | `components/chat.css`, `components/code.css`, `components/chart.css`, `components/feedback.css`, `components/button.css` | `components/chat.js` |
| [Chat messages](#chat-message) | AI | `components/chat.css`, `components/code.css`, `components/button.css`, `components/feedback.css` | `components/copy.js` |
| [Chat widget](#chat-widget) | AI | `components/chat.css`, `components/code.css`, `components/feedback.css`, `components/button.css` | `components/chat.js` |
| [Theme customizer](#theme-customizer) | Theming | `themes.css`, `components/form.css`, `components/dialog.css`, `components/button.css` | `components/theme-customizer.js`, `components/copy.js` |
| [Theme toggle](#theme-toggle) | Theming | `components/button.css` | `components/theme-toggle.js` |

<h2 id="site-footer">Site footer</h2>

*Layout.* Footer with brand blurb, grouped link columns and a bottom bar.

- **Accessibility:** Each link group is a <nav> labelled by its heading, so screen reader users can tell the navigation landmarks apart.
- **JavaScript:** none (HTML and CSS only)

**Reference for AI agents** (paste into your prompt):

```text
Component: Site footer (vanilla-responsive-ui)
Markup: src/components/site-footer.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/footer.css, src/assets/css/components/header.css
JS: none
Docs: docs/COMPONENTS.md#site-footer
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/footer.css">
<link rel="stylesheet" href="/assets/css/components/header.css">

<!-- In <body> -->
<footer class="site-footer">
  <div class="container">
    <div class="site-footer__grid">
      <div class="site-footer__about stack">
        <a class="brand" href="/">
          <span class="brand__mark"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg></span>
          Acme
        </a>
        <p class="text-muted">Dependency-free, accessible UI templates.</p>
      </div>
      <nav aria-labelledby="example-footer-product">
        <h2 class="site-footer__heading" id="example-footer-product">Product</h2>
        <ul class="site-footer__links">
          <li><a href="/features">Features</a></li>
          <li><a href="/pricing">Pricing</a></li>
        </ul>
      </nav>
      <nav aria-labelledby="example-footer-company">
        <h2 class="site-footer__heading" id="example-footer-company">Company</h2>
        <ul class="site-footer__links">
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
      <nav aria-labelledby="example-footer-legal">
        <h2 class="site-footer__heading" id="example-footer-legal">Legal</h2>
        <ul class="site-footer__links">
          <li><a href="/privacy">Privacy</a></li>
          <li><a href="/terms">Terms</a></li>
        </ul>
      </nav>
    </div>
    <div class="site-footer__bottom">
      <p>© 2026 Acme. All rights reserved.</p>
    </div>
  </div>
</footer>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_SiteFooter.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_SiteFooter" />`. Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

```jsx
import '@/ui/css/components/footer.css';
import '@/ui/css/components/header.css';

export function SiteFooter() {
  return <>{/* markup converted to JSX */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/site-footer.html` and use `{% include "components/site-footer.html" %}`.

<h2 id="site-header">Site header</h2>

*Layout.* Sticky header with brand, primary navigation and actions. On small screens the menu collapses behind a disclosure button.

- **Accessibility:** The toggle ships with the hidden attribute and is revealed by JavaScript, so without JS the full menu is always visible. The toggle exposes aria-expanded and aria-controls; Escape closes the menu and returns focus. Mark the current page link with aria-current="page".
- **JavaScript:** `src/assets/js/components/disclosure.js`, `src/assets/js/components/theme-toggle.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Site header (vanilla-responsive-ui)
Markup: src/components/site-header.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/button.css, src/assets/css/components/header.css
JS: src/assets/js/components/disclosure.js, src/assets/js/components/theme-toggle.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#site-header
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<link rel="stylesheet" href="/assets/css/components/header.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<header class="site-header">
  <div class="container site-header__inner">
    <a class="brand" href="/">
      <span class="brand__mark"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg></span>
      Acme
    </a>

    <button type="button" class="btn btn--ghost btn--icon site-header__toggle" data-disclosure="dismissible" aria-expanded="false" aria-controls="site-menu" hidden>
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      <span class="visually-hidden">Menu</span>
    </button>

    <div class="site-header__menu" id="site-menu">
      <nav class="site-nav" aria-label="Primary">
        <ul class="site-nav__list">
          <li><a class="site-nav__link" href="/" aria-current="page">Home</a></li>
          <li><a class="site-nav__link" href="/features">Features</a></li>
          <li><a class="site-nav__link" href="/pricing">Pricing</a></li>
        </ul>
      </nav>
      <div class="site-header__actions">
        <a class="btn btn--ghost" href="/sign-in">Sign in</a>
        <a class="btn" href="/register">Get started</a>
      </div>
    </div>
  </div>
</header>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_SiteHeader.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_SiteHeader" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/button.css';
import '@/ui/css/components/header.css';

export function SiteHeader() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/disclosure.js').then((m) => m.init(ref.current));
    import('@/ui/js/components/theme-toggle.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/site-header.html` and use `{% include "components/site-header.html" %}`.

<h2 id="breadcrumb">Breadcrumb</h2>

*Navigation.* Hierarchical trail of links to the current page.

- **Accessibility:** A <nav> labelled "Breadcrumb" containing an ordered list. Separators are CSS-generated so they are not announced. The current page is marked with aria-current="page".
- **JavaScript:** none (HTML and CSS only)

**Reference for AI agents** (paste into your prompt):

```text
Component: Breadcrumb (vanilla-responsive-ui)
Markup: src/components/breadcrumb.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/navigation.css
JS: none
Docs: docs/COMPONENTS.md#breadcrumb
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/navigation.css">

<!-- In <body> -->
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol class="breadcrumb__list">
    <li class="breadcrumb__item"><a href="/">Home</a></li>
    <li class="breadcrumb__item"><a href="/shop">Shop</a></li>
    <li class="breadcrumb__item"><span aria-current="page">Headphones</span></li>
  </ol>
</nav>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Breadcrumb.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Breadcrumb" />`. Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

```jsx
import '@/ui/css/components/navigation.css';

export function Breadcrumb() {
  return <>{/* markup converted to JSX */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/breadcrumb.html` and use `{% include "components/breadcrumb.html" %}`.

<h2 id="pagination">Pagination</h2>

*Navigation.* Page links with previous/next controls.

- **Accessibility:** A <nav> labelled "Pagination". Numbers include visually hidden "Page" text, the current page uses aria-current="page", and an unavailable previous/next link has no href so it is removed from the tab order.
- **JavaScript:** none (HTML and CSS only)

**Reference for AI agents** (paste into your prompt):

```text
Component: Pagination (vanilla-responsive-ui)
Markup: src/components/pagination.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/navigation.css
JS: none
Docs: docs/COMPONENTS.md#pagination
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/navigation.css">

<!-- In <body> -->
<nav class="pagination" aria-label="Pagination">
  <ul class="pagination__list">
    <li><a class="pagination__link"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg><span class="visually-hidden">Previous page</span></a></li>
    <li><a class="pagination__link" href="?page=1" aria-current="page"><span class="visually-hidden">Page </span>1</a></li>
    <li><a class="pagination__link" href="?page=2"><span class="visually-hidden">Page </span>2</a></li>
    <li><a class="pagination__link" href="?page=3"><span class="visually-hidden">Page </span>3</a></li>
    <li><a class="pagination__link" href="?page=2"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg><span class="visually-hidden">Next page</span></a></li>
  </ul>
</nav>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Pagination.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Pagination" />`. Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

```jsx
import '@/ui/css/components/navigation.css';

export function Pagination() {
  return <>{/* markup converted to JSX */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/pagination.html` and use `{% include "components/pagination.html" %}`.

<h2 id="tabs">Tabs</h2>

*Navigation.* WAI-ARIA tabs with automatic activation. Without JavaScript every panel is shown in sequence with its own heading.

- **Accessibility:** Roles (tablist, tab, tabpanel), aria-selected, aria-controls and roving tabindex are applied by the script. Arrow keys move between tabs, Home/End jump to the ends; only the active tab is in the Tab order.
- **JavaScript:** `src/assets/js/components/tabs.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Tabs (vanilla-responsive-ui)
Markup: src/components/tabs.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/tabs.css
JS: src/assets/js/components/tabs.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#tabs
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/tabs.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<div class="tabs" data-tabs>
  <div class="tabs__list" data-tabs-list data-label="Account settings" hidden>
    <button type="button" class="tabs__tab" data-tab="tab-panel-profile">Profile</button>
    <button type="button" class="tabs__tab" data-tab="tab-panel-billing">Billing</button>
    <button type="button" class="tabs__tab" data-tab="tab-panel-team">Team</button>
  </div>
  <section class="tabs__panel" id="tab-panel-profile" aria-labelledby="tab-panel-profile-heading">
    <h3 class="tabs__heading" id="tab-panel-profile-heading">Profile</h3>
    <p>Update your name, photo and contact details.</p>
  </section>
  <section class="tabs__panel" id="tab-panel-billing" aria-labelledby="tab-panel-billing-heading">
    <h3 class="tabs__heading" id="tab-panel-billing-heading">Billing</h3>
    <p>Manage your plan, payment method and invoices.</p>
  </section>
  <section class="tabs__panel" id="tab-panel-team" aria-labelledby="tab-panel-team-heading">
    <h3 class="tabs__heading" id="tab-panel-team-heading">Team</h3>
    <p>Invite teammates and manage roles.</p>
  </section>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Tabs.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Tabs" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/tabs.css';

export function Tabs() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/tabs.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/tabs.html` and use `{% include "components/tabs.html" %}`.

<h2 id="button">Button</h2>

*Basics.* Primary, secondary, ghost and danger buttons in three sizes, plus icon-only buttons. The same classes style <button> and <a>.

- **Accessibility:** Use <button type="button"> for actions and <a href> for navigation. Icon-only buttons need an accessible name (visually hidden text or aria-label). Minimum target size is 44×44 px. Disabled state uses the native disabled attribute; use aria-disabled="true" on links.
- **JavaScript:** none (HTML and CSS only)

**Reference for AI agents** (paste into your prompt):

```text
Component: Button (vanilla-responsive-ui)
Markup: src/components/button.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/button.css
JS: none
Docs: docs/COMPONENTS.md#button
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/button.css">

<!-- In <body> -->
<div class="cluster">
  <button type="button" class="btn">Primary</button>
  <button type="button" class="btn btn--secondary">Secondary</button>
  <button type="button" class="btn btn--ghost">Ghost</button>
  <button type="button" class="btn btn--danger">Delete</button>
  <button type="button" class="btn" disabled>Disabled</button>
</div>
<div class="cluster">
  <button type="button" class="btn btn--sm">Small</button>
  <button type="button" class="btn btn--lg">Large</button>
  <a class="btn btn--secondary" href="/docs">Link styled as button <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
  <button type="button" class="btn btn--ghost btn--icon">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
    <span class="visually-hidden">Search</span>
  </button>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Button.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Button" />`. Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

```jsx
import '@/ui/css/components/button.css';

export function Button() {
  return <>{/* markup converted to JSX */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/button.html` and use `{% include "components/button.html" %}`.

<h2 id="accordion">Accordion</h2>

*Content.* Collapsible sections built on native <details> and <summary>. Siblings that share a name attribute behave exclusively (one open at a time) in supporting browsers.

- **Accessibility:** Native elements provide keyboard support (Enter/Space), expanded state and no-JS behaviour for free. Do not put interactive elements inside <summary>.
- **JavaScript:** none (HTML and CSS only)

**Reference for AI agents** (paste into your prompt):

```text
Component: Accordion (vanilla-responsive-ui)
Markup: src/components/accordion.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/accordion.css
JS: none
Docs: docs/COMPONENTS.md#accordion
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/accordion.css">

<!-- In <body> -->
<div class="accordion">
  <details class="accordion__item" name="example-faq" open>
    <summary class="accordion__summary">What is included? <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="accordion__panel">
      <p>Templates, components, design tokens, documentation and validation scripts.</p>
    </div>
  </details>
  <details class="accordion__item" name="example-faq">
    <summary class="accordion__summary">Is JavaScript required? <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="accordion__panel">
      <p>No. The accordion works entirely with HTML and CSS.</p>
    </div>
  </details>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Accordion.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Accordion" />`. Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

```jsx
import '@/ui/css/components/accordion.css';

export function Accordion() {
  return <>{/* markup converted to JSX */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/accordion.html` and use `{% include "components/accordion.html" %}`.

<h2 id="card">Card</h2>

*Content.* Content card with optional media, stretched link and footer actions. Each card is a size container, so its layout switches to side-by-side when the card itself is wide (container query), wherever it is placed.

- **Accessibility:** The stretched link makes the whole card clickable while only the title link is announced and tabbable. Decorative images use alt="". Controls in the footer stay independently clickable.
- **JavaScript:** none (HTML and CSS only)

**Reference for AI agents** (paste into your prompt):

```text
Component: Card (vanilla-responsive-ui)
Markup: src/components/card.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/card.css
JS: none
Docs: docs/COMPONENTS.md#card
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/card.css">

<!-- In <body> -->
<ul class="grid-auto list-reset" role="list">
  <li>
    <article class="card">
      <div class="card__inner">
        <img class="card__media" src="../assets/images/product-lamp.svg" width="400" height="300" alt="" loading="lazy" decoding="async">
        <div class="card__body">
          <h3 class="card__title"><a href="/articles/design-tokens">Designing with tokens</a></h3>
          <p class="card__text">How a single file of custom properties keeps a whole product on brand.</p>
          <div class="card__footer">
            <span class="badge badge--primary">Guide</span>
            <span class="text-sm text-muted">6 min read</span>
          </div>
        </div>
      </div>
    </article>
  </li>
</ul>
<article class="card">
  <div class="card__inner card__inner--split">
    <img class="card__media" src="../assets/images/product-camera.svg" width="400" height="300" alt="" loading="lazy" decoding="async">
    <div class="card__body">
      <h3 class="card__title"><a href="/articles/container-queries">Container queries in practice</a></h3>
      <p class="card__text">This card turns horizontal when it is at least 34rem wide, independent of the viewport.</p>
      <div class="card__footer">
        <button type="button" class="btn btn--sm btn--secondary">Save<span class="visually-hidden"> article</span></button>
      </div>
    </div>
  </div>
</article>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Card.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Card" />`. Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

```jsx
import '@/ui/css/components/card.css';

export function Card() {
  return <>{/* markup converted to JSX */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/card.html` and use `{% include "components/card.html" %}`.

<h2 id="form-field">Form fields</h2>

*Forms.* Labelled text input, select, textarea, checkbox and radio group with hints and inline errors. Add data-validate to the form for accessible client-side validation.

- **Accessibility:** Every control has a visible <label>. Hints and errors are linked with aria-describedby; invalid fields get aria-invalid="true" and focus moves to the first error on submit. Group related radios and checkboxes in a <fieldset> with a <legend>. Use autocomplete tokens (WCAG 1.3.5).
- **JavaScript:** `src/assets/js/components/form-validation.js`, `src/assets/js/components/password-toggle.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Form fields (vanilla-responsive-ui)
Markup: src/components/form-field.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/form.css, src/assets/css/components/button.css
JS: src/assets/js/components/form-validation.js, src/assets/js/components/password-toggle.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#form-field
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/form.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<form class="form" action="/contact" method="post" data-validate data-demo-submit="Thanks, your message has been sent.">
  <div class="form-row">
    <div class="field">
      <label class="field__label" for="example-name">Full name <span class="field__required" aria-hidden="true">*</span></label>
      <input class="input" id="example-name" name="name" type="text" autocomplete="name" required aria-describedby="example-name-error" data-error-required="Enter your full name.">
      <p class="field__error" id="example-name-error"></p>
    </div>
    <div class="field">
      <label class="field__label" for="example-email">Email <span class="field__required" aria-hidden="true">*</span></label>
      <input class="input" id="example-email" name="email" type="email" autocomplete="email" required aria-describedby="example-email-error">
      <p class="field__error" id="example-email-error"></p>
    </div>
  </div>

  <div class="field">
    <label class="field__label" for="example-password">Password <span class="field__required" aria-hidden="true">*</span></label>
    <p class="field__hint" id="example-password-hint">At least 12 characters.</p>
    <div class="input-group">
      <input class="input" id="example-password" name="password" type="password" autocomplete="new-password" minlength="12" required aria-describedby="example-password-hint example-password-error">
      <button type="button" class="btn btn--secondary" data-password-toggle aria-controls="example-password" aria-pressed="false" hidden>
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Show<span class="visually-hidden"> password</span>
      </button>
    </div>
    <p class="field__error" id="example-password-error"></p>
  </div>

  <div class="field">
    <label class="field__label" for="example-topic">Topic</label>
    <select class="select" id="example-topic" name="topic">
      <option>General question</option>
      <option>Billing</option>
      <option>Technical support</option>
    </select>
  </div>

  <div class="field">
    <label class="field__label" for="example-message">Message</label>
    <textarea class="textarea" id="example-message" name="message" rows="4"></textarea>
  </div>

  <fieldset class="fieldset">
    <legend class="fieldset__legend">Preferred contact method</legend>
    <label class="choice"><input type="radio" name="contact" value="email" checked> Email</label>
    <label class="choice"><input type="radio" name="contact" value="phone"> Phone</label>
  </fieldset>

  <div class="field">
    <label class="choice">
      <input type="checkbox" id="example-consent" name="consent" required aria-describedby="example-consent-error" data-error-required="Please agree before sending.">
      I agree to be contacted about my request
    </label>
    <p class="field__error" id="example-consent-error"></p>
  </div>

  <div class="form-actions">
    <button type="submit" class="btn">Send message</button>
    <button type="reset" class="btn btn--ghost">Reset</button>
  </div>
  <p class="alert alert--success" data-form-status hidden></p>
</form>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_FormField.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_FormField" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/form.css';
import '@/ui/css/components/button.css';

export function FormField() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/form-validation.js').then((m) => m.init(ref.current));
    import('@/ui/js/components/password-toggle.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/form-field.html` and use `{% include "components/form-field.html" %}`.

<h2 id="alert">Alert and badge</h2>

*Feedback.* Inline status messages in four variants, and compact badges for labels and counts.

- **Accessibility:** Status is never conveyed by colour alone: each alert has an icon and a text title. For messages inserted dynamically, put them inside a live region (role="status" for polite, role="alert" for urgent). Badges that carry meaning include full text for screen readers.
- **JavaScript:** none (HTML and CSS only)

**Reference for AI agents** (paste into your prompt):

```text
Component: Alert and badge (vanilla-responsive-ui)
Markup: src/components/alert.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/feedback.css
JS: none
Docs: docs/COMPONENTS.md#alert
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/feedback.css">

<!-- In <body> -->
<div class="stack">
  <div class="alert">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
    <div><p class="alert__title">Information</p><p>Your trial ends in 7 days.</p></div>
  </div>
  <div class="alert alert--success">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
    <div><p class="alert__title">Success</p><p>Your changes have been saved.</p></div>
  </div>
  <div class="alert alert--warning">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
    <div><p class="alert__title">Warning</p><p>Your storage is 90% full.</p></div>
  </div>
  <div class="alert alert--danger">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    <div><p class="alert__title">Error</p><p>We couldn’t process your payment.</p></div>
  </div>
  <p class="cluster">
    <span class="badge">Draft</span>
    <span class="badge badge--primary">New</span>
    <span class="badge badge--success">Paid</span>
    <span class="badge badge--warning">Pending</span>
    <span class="badge badge--danger">Failed</span>
  </p>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Alert.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Alert" />`. Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

```jsx
import '@/ui/css/components/feedback.css';

export function Alert() {
  return <>{/* markup converted to JSX */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/alert.html` and use `{% include "components/alert.html" %}`.

<h2 id="toast">Toast</h2>

*Feedback.* Transient notifications announced through a polite live region. Trigger declaratively with data-toast or call showToast() from JavaScript.

- **Accessibility:** Toasts pause while hovered or focused and include a dismiss button (WCAG 2.2.1). Never put the only copy of important information or required actions in a toast. Messages are inserted with textContent.
- **JavaScript:** `src/assets/js/components/toast.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Toast (vanilla-responsive-ui)
Markup: src/components/toast.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/feedback.css, src/assets/css/components/button.css
JS: src/assets/js/components/toast.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#toast
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/feedback.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<div class="cluster">
  <button type="button" class="btn btn--secondary" data-toast="Link copied to clipboard.">Show info toast</button>
  <button type="button" class="btn btn--secondary" data-toast="Settings saved." data-toast-variant="success">Show success toast</button>
  <button type="button" class="btn btn--secondary" data-toast="Upload failed. Please try again." data-toast-variant="danger">Show error toast</button>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Toast.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Toast" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/feedback.css';
import '@/ui/css/components/button.css';

export function Toast() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/toast.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/toast.html` and use `{% include "components/toast.html" %}`.

<h2 id="dialog">Dialog</h2>

*Overlays.* Modal dialog on the native <dialog> element, opened and closed declaratively with HTML Invoker Commands (commandfor / command). closedby="any" enables light dismiss.

- **Accessibility:** showModal() traps focus, makes the page inert, closes on Escape and returns focus to the trigger natively. Label the dialog with aria-labelledby pointing at its heading. Every dialog needs a visible close control.
- **JavaScript:** `src/assets/js/components/dialog.js` (polyfills invoker commands and closedby where unsupported)

**Reference for AI agents** (paste into your prompt):

```text
Component: Dialog (vanilla-responsive-ui)
Markup: src/components/dialog.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/dialog.css
JS: src/assets/js/components/dialog.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#dialog
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/dialog.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<button type="button" class="btn" commandfor="example-dialog" command="show-modal">Open dialog</button>

<dialog class="dialog" id="example-dialog" aria-labelledby="example-dialog-title" closedby="any">
  <div class="dialog__header">
    <h2 class="dialog__title" id="example-dialog-title">Delete project?</h2>
    <button type="button" class="btn btn--ghost btn--icon" commandfor="example-dialog" command="close">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      <span class="visually-hidden">Close dialog</span>
    </button>
  </div>
  <div class="dialog__body">
    <p>This permanently deletes the project and its 24 files. This cannot be undone.</p>
  </div>
  <div class="dialog__footer">
    <button type="button" class="btn btn--secondary" commandfor="example-dialog" command="close">Cancel</button>
    <button type="button" class="btn btn--danger" commandfor="example-dialog" command="close" value="delete">Delete project</button>
  </div>
</dialog>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Dialog.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Dialog" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/dialog.css';

export function Dialog() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/dialog.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/dialog.html` and use `{% include "components/dialog.html" %}`.

<h2 id="chart">Charts</h2>

*Data.* Vector (SVG) line, area, bar, stacked bar, horizontal bar, donut and sparkline charts drawn from JSON — a file, your API or inline data — with tooltips, keyboard exploration, toggleable series and an automatic data table.

- **Accessibility:** The SVG is decorative; each chart gets a generated text summary, a focusable region where arrow keys move between data points (announced through a live region), legend buttons with aria-pressed, and a full data table in a details element. Line series also differ by dash pattern, so colour is never the only cue.
- **JavaScript:** `src/assets/js/components/chart.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Charts (vanilla-responsive-ui)
Markup: src/components/chart.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/chart.css, src/assets/css/components/table.css
JS: src/assets/js/components/chart.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#chart
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/chart.css">
<link rel="stylesheet" href="/assets/css/components/table.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<script type="application/json" id="chart-demo-data">
[
  { "month": "2026-05", "revenue": 39410, "target": 41500 },
  { "month": "2026-06", "revenue": 40680, "target": 42600 },
  { "month": "2026-07", "revenue": 41220, "target": 43700 },
  { "month": "2026-08", "revenue": 42960, "target": 44800 },
  { "month": "2026-09", "revenue": 42950, "target": 46000 },
  { "month": "2026-10", "revenue": 48290, "target": 48100 }
]
</script>

<div class="grid-auto grid-auto--lg">
  <figure class="chart" data-viz="area" data-source="#chart-demo-data" data-x="month" data-x-format="short-month" data-series="revenue:Revenue,target:Target" data-format="currency-compact">
    <figcaption class="chart__caption">
      <span class="chart__title">Revenue vs target</span>
      <span class="chart__subtitle">Area chart from inline JSON</span>
    </figcaption>
    <p class="chart__fallback">Revenue grew from $39.4K in May to $48.3K in October 2026.</p>
  </figure>

  <figure class="chart" data-viz="bar" data-source="#chart-demo-data" data-x="month" data-x-format="short-month" data-series="revenue:Revenue" data-format="currency-compact">
    <figcaption class="chart__caption">
      <span class="chart__title">Monthly revenue</span>
      <span class="chart__subtitle">Bar chart</span>
    </figcaption>
    <p class="chart__fallback">Monthly revenue, May to October 2026.</p>
  </figure>

  <figure class="chart" data-viz="donut" data-source="../data/sales.json" data-path="channels" data-x="channel" data-series="revenue:Revenue" data-format="currency-compact">
    <figcaption class="chart__caption">
      <span class="chart__title">Revenue by channel</span>
      <span class="chart__subtitle">Donut chart from src/data/sales.json</span>
    </figcaption>
    <p class="chart__fallback">Organic search is the largest channel at $18.5K.</p>
  </figure>

  <figure class="chart" data-viz="hbar" data-source="../data/sales.json" data-path="regions" data-x="region" data-series="revenue:Revenue:2" data-format="currency-compact">
    <figcaption class="chart__caption">
      <span class="chart__title">Revenue by region</span>
      <span class="chart__subtitle">Horizontal bar chart</span>
    </figcaption>
    <p class="chart__fallback">North America leads with $19.8K.</p>
  </figure>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Chart.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Chart" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/chart.css';
import '@/ui/css/components/table.css';

export function Chart() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/chart.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/chart.html` and use `{% include "components/chart.html" %}`.

<h2 id="data-grid">Data grid</h2>

*Data.* Table rendered from JSON with search, filters, sortable columns, pagination, CSV export and row actions. Server-rendered rows show until data loads, and the toolbar submits as a normal form without JavaScript.

- **Accessibility:** Sortable headers are buttons with aria-sort; result counts, sorting and paging are announced; action buttons include the row id in their accessible name; the scroll wrapper is a labelled, focusable region. Status is shown as text badges, not colour alone.
- **JavaScript:** `src/assets/js/components/data-grid.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Data grid (vanilla-responsive-ui)
Markup: src/components/data-grid.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/table.css, src/assets/css/components/form.css, src/assets/css/components/navigation.css, src/assets/css/components/feedback.css, src/assets/css/components/button.css
JS: src/assets/js/components/data-grid.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#data-grid
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/table.css">
<link rel="stylesheet" href="/assets/css/components/form.css">
<link rel="stylesheet" href="/assets/css/components/navigation.css">
<link rel="stylesheet" href="/assets/css/components/feedback.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<div class="data-grid" data-grid data-source="../data/orders.json" data-page-size="5" data-label="orders">
  <form class="data-grid__toolbar" action="/orders" method="get">
    <div class="field">
      <label class="field__label" for="grid-demo-search">Search orders</label>
      <input class="input" id="grid-demo-search" name="q" type="search" autocomplete="off" data-grid-search>
    </div>
    <div class="field field--narrow">
      <label class="field__label" for="grid-demo-status">Status</label>
      <select class="select" id="grid-demo-status" name="status" data-grid-filter="status">
        <option value="">All statuses</option>
        <option>Paid</option>
        <option>Shipped</option>
        <option>Delivered</option>
        <option>Pending</option>
        <option>Refunded</option>
        <option>Failed</option>
      </select>
    </div>
    <button type="button" class="btn btn--secondary" data-grid-export hidden>Export CSV</button>
  </form>

  <div class="table-wrapper" role="region" aria-labelledby="grid-demo-caption" tabindex="0">
    <table class="table">
      <caption id="grid-demo-caption" class="visually-hidden">Orders</caption>
      <thead>
        <tr>
          <th scope="col" data-key="id" data-sort="text">Order</th>
          <th scope="col" data-key="customer" data-sort="text" data-render="person">Customer</th>
          <th scope="col" data-key="date" data-sort="date" data-format="date">Date</th>
          <th scope="col" data-key="status" data-sort="text" data-render="badge">Status</th>
          <th scope="col" data-key="total" data-sort="number" data-format="currency" class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>#1064</td><td>Isla Murray</td><td>8 Oct 2026</td><td><span class="badge badge--success">Delivered</span></td><td class="num">$277.00</td></tr>
        <tr><td>#1063</td><td>Leila Haddad</td><td>8 Oct 2026</td><td><span class="badge badge--primary">Shipped</span></td><td class="num">$251.00</td></tr>
      </tbody>
    </table>
  </div>

  <div class="data-grid__footer">
    <p data-grid-status>Showing 2 orders</p>
    <nav class="pagination" aria-label="Orders pages" data-grid-pagination></nav>
  </div>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_DataGrid.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_DataGrid" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/table.css';
import '@/ui/css/components/form.css';
import '@/ui/css/components/navigation.css';
import '@/ui/css/components/feedback.css';
import '@/ui/css/components/button.css';

export function DataGrid() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/data-grid.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/data-grid.html` and use `{% include "components/data-grid.html" %}`.

<h2 id="data-table">Data table</h2>

*Data.* Responsive table in a scrollable, keyboard-focusable region. Add data-sortable for sortable columns and data-chart to draw proportional bars behind data-value cells.

- **Accessibility:** Always include a <caption> and scope on header cells. The scroll wrapper is a labelled region with tabindex="0" so keyboard users can scroll it. Sortable headers become buttons; the sorted column gets aria-sort and the change is announced.
- **JavaScript:** `src/assets/js/components/table-sort.js`, `src/assets/js/components/data-chart.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Data table (vanilla-responsive-ui)
Markup: src/components/data-table.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/table.css, src/assets/css/components/feedback.css
JS: src/assets/js/components/table-sort.js, src/assets/js/components/data-chart.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#data-table
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/table.css">
<link rel="stylesheet" href="/assets/css/components/feedback.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<div class="table-wrapper" role="region" aria-labelledby="example-orders-caption" tabindex="0">
  <table class="table" data-sortable>
    <caption id="example-orders-caption">Recent orders</caption>
    <thead>
      <tr>
        <th scope="col" data-sort="text">Customer</th>
        <th scope="col" data-sort="date">Date</th>
        <th scope="col">Status</th>
        <th scope="col" data-sort="number" class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Olivia Chen</td><td data-sort-value="2026-10-08"><time datetime="2026-10-08">8 Oct 2026</time></td><td><span class="badge badge--success">Paid</span></td><td class="num" data-sort-value="249">$249.00</td></tr>
      <tr><td>Noah Williams</td><td data-sort-value="2026-10-07"><time datetime="2026-10-07">7 Oct 2026</time></td><td><span class="badge badge--warning">Pending</span></td><td class="num" data-sort-value="1120.5">$1,120.50</td></tr>
      <tr><td>Sofia García</td><td data-sort-value="2026-10-06"><time datetime="2026-10-06">6 Oct 2026</time></td><td><span class="badge badge--success">Paid</span></td><td class="num" data-sort-value="89.99">$89.99</td></tr>
    </tbody>
  </table>
</div>

<div class="table-wrapper" role="region" aria-labelledby="example-chart-caption" tabindex="0">
  <table class="table" data-chart>
    <caption id="example-chart-caption">Visitors by device</caption>
    <thead><tr><th scope="col">Device</th><th scope="col">Visitors</th></tr></thead>
    <tbody>
      <tr><th scope="row">Mobile</th><td data-value="6120">6,120</td></tr>
      <tr><th scope="row">Desktop</th><td data-value="3480">3,480</td></tr>
      <tr><th scope="row">Tablet</th><td data-value="910">910</td></tr>
    </tbody>
  </table>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_DataTable.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_DataTable" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/table.css';
import '@/ui/css/components/feedback.css';

export function DataTable() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/table-sort.js').then((m) => m.init(ref.current));
    import('@/ui/js/components/data-chart.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/data-table.html` and use `{% include "components/data-table.html" %}`.

<h2 id="chat">AI chat</h2>

*AI.* Embeddable assistant panel with streaming replies, Markdown and code blocks, tool-call steps, inline charts, sources, follow-up suggestions, message actions (copy, regenerate, feedback) and saved history. Connect any model or agent backend with data-chat-endpoint (NDJSON, SSE or text streams) or registerTransport().

- **Accessibility:** The conversation is a labelled, focusable role="log" region. Replies are announced once when complete (not token by token) and tool steps are announced as they run. Enter sends, Shift+Enter adds a line, Escape stops generation. Every control has a text label; all model output is rendered with textContent, never innerHTML.
- **JavaScript:** `src/assets/js/components/chat.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: AI chat (vanilla-responsive-ui)
Markup: src/components/chat.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/chat.css, src/assets/css/components/code.css, src/assets/css/components/chart.css, src/assets/css/components/feedback.css, src/assets/css/components/button.css
JS: src/assets/js/components/chat.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#chat
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/chat.css">
<link rel="stylesheet" href="/assets/css/components/code.css">
<link rel="stylesheet" href="/assets/css/components/chart.css">
<link rel="stylesheet" href="/assets/css/components/feedback.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<section class="chat" data-chat data-chat-persona="general" aria-labelledby="demo-chat-title">
  <header class="chat__header">
    <span class="avatar avatar--soft"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z"/></svg></span>
    <div class="chat__heading">
      <h3 class="chat__title" id="demo-chat-title">Acme AI</h3>
      <p class="chat__status">Demo model · streams replies</p>
    </div>
    <button type="button" class="btn btn--ghost btn--sm" data-chat-clear hidden><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> New chat</button>
  </header>
  <div class="chat__log" role="log" aria-label="Conversation" aria-live="off" tabindex="0" data-chat-log>
    <div class="chat__message chat__message--assistant">
      <div class="chat__bubble">
        <p>Hi! Ask me to write code, explain accessibility rules or plan a project.</p>
      </div>
    </div>
  </div>
  <div class="chat__suggestions" data-chat-suggestions hidden>
    <button type="button" class="chip" data-chat-suggestion>Write a debounce function</button>
    <button type="button" class="chip" data-chat-suggestion>Plan a product launch</button>
  </div>
  <form class="chat__composer" action="/chat" method="post" data-chat-form>
    <label class="visually-hidden" for="demo-chat-input">Message Acme AI</label>
    <textarea class="chat__input" id="demo-chat-input" name="message" rows="1" placeholder="Message Acme AI…" required data-chat-input></textarea>
    <div class="chat__actions">
      <button type="submit" class="btn btn--icon btn--sm" data-chat-send>
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>
        <span class="visually-hidden">Send message</span>
      </button>
      <button type="button" class="btn btn--icon btn--sm btn--secondary" data-chat-stop hidden>
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        <span class="visually-hidden">Stop generating</span>
      </button>
    </div>
  </form>
  <p class="chat__disclaimer">Demo replies are scripted. Set data-chat-endpoint to use your model.</p>
</section>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_Chat.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_Chat" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/chat.css';
import '@/ui/css/components/code.css';
import '@/ui/css/components/chart.css';
import '@/ui/css/components/feedback.css';
import '@/ui/css/components/button.css';

export function Chat() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/chat.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/chat.html` and use `{% include "components/chat.html" %}`.

<h2 id="chat-message">Chat messages</h2>

*AI.* Static anatomy of chat messages for server-rendered transcripts or custom renderers: user bubble, assistant reply with Markdown, a code block, a tool-call step, sources, a typing indicator and message actions.

- **Accessibility:** Each message starts with visually hidden "You said" / "Assistant said" text so screen reader users know who is speaking. Tool steps are native details/summary elements. Action buttons have text labels; feedback buttons use aria-pressed.
- **JavaScript:** `src/assets/js/components/copy.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Chat messages (vanilla-responsive-ui)
Markup: src/components/chat-message.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/chat.css, src/assets/css/components/code.css, src/assets/css/components/button.css, src/assets/css/components/feedback.css
JS: src/assets/js/components/copy.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#chat-message
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/chat.css">
<link rel="stylesheet" href="/assets/css/components/code.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<link rel="stylesheet" href="/assets/css/components/feedback.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<div class="chat__log" role="log" aria-label="Example conversation" tabindex="0">
  <div class="chat__message chat__message--user">
    <div class="chat__bubble">
      <p class="visually-hidden">You said:</p>
      <div class="chat__content"><p class="chat__user-text">How many orders are pending?</p></div>
    </div>
  </div>

  <div class="chat__message chat__message--assistant">
    <span class="avatar avatar--sm avatar--soft chat__avatar"><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4M8 2h8M9 13v2M15 13v2"/></svg></span>
    <div class="chat__bubble">
      <p class="visually-hidden">Assistant said:</p>
      <div class="chat__content">
        <details class="chat__tool chat__tool--done">
          <summary><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> <span class="chat__tool-name">Searching orders</span> <span class="chat__tool-status">Completed</span></summary>
          <p class="chat__tool-label">Result</p>
          <pre class="chat__tool-io">64 orders scanned · 6 pending · 3 failed</pre>
        </details>
        <div class="chat__markdown">
          <p><strong>6 orders are pending</strong> and 3 failed in the last 60 days. Run this query to list them:</p>
          <div class="code-block">
            <div class="code-block__header">
              <span>sql</span>
              <button type="button" class="btn btn--ghost btn--sm" data-copy data-copy-target="#demo-message-code" hidden><span data-copy-label>Copy code</span></button>
            </div>
            <pre tabindex="0" role="region" aria-label="SQL example"><code id="demo-message-code">SELECT id, customer, total
FROM orders
WHERE status IN ('Pending', 'Failed');</code></pre>
          </div>
        </div>
        <div class="chat__sources">
          <p class="chat__tool-label">Sources</p>
          <ol class="chat__sources-list">
            <li><a href="../data/orders.json">orders.json</a></li>
          </ol>
        </div>
      </div>
      <div class="chat__message-actions">
        <button type="button" class="btn btn--ghost btn--icon btn--sm"><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span class="visually-hidden">Copy response</span></button>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" aria-pressed="false"><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"/></svg><span class="visually-hidden">Good response</span></button>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" aria-pressed="false"><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"/></svg><span class="visually-hidden">Bad response</span></button>
      </div>
    </div>
  </div>

  <div class="chat__message chat__message--assistant">
    <span class="avatar avatar--sm avatar--soft chat__avatar"><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4M8 2h8M9 13v2M15 13v2"/></svg></span>
    <div class="chat__bubble">
      <div class="chat__typing"><span></span><span></span><span></span><span class="visually-hidden">Assistant is typing</span></div>
    </div>
  </div>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_ChatMessage.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_ChatMessage" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/chat.css';
import '@/ui/css/components/code.css';
import '@/ui/css/components/button.css';
import '@/ui/css/components/feedback.css';

export function ChatMessage() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/copy.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/chat-message.html` and use `{% include "components/chat-message.html" %}`.

<h2 id="chat-widget">Chat widget</h2>

*AI.* Floating "Ask AI" launcher that opens a support assistant panel on any page. The support persona tracks orders, explains returns and shipping and hands off to a person; swap in your own agent with data-chat-endpoint.

- **Accessibility:** The launcher is a disclosure button (aria-expanded, aria-controls) that ships hidden until JavaScript runs. Opening moves focus to the message field; Escape or the minimise button closes the panel and returns focus to the launcher. On small screens the panel becomes full-screen.
- **JavaScript:** `src/assets/js/components/chat.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Chat widget (vanilla-responsive-ui)
Markup: src/components/chat-widget.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/chat.css, src/assets/css/components/code.css, src/assets/css/components/feedback.css, src/assets/css/components/button.css
JS: src/assets/js/components/chat.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#chat-widget
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/chat.css">
<link rel="stylesheet" href="/assets/css/components/code.css">
<link rel="stylesheet" href="/assets/css/components/feedback.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<div class="chat-widget" data-chat-widget>
  <button type="button" class="btn chat-widget__launcher" aria-expanded="false" aria-controls="demo-widget-panel" data-chat-launcher hidden>
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <span>Ask Acme AI</span>
  </button>
  <div class="chat-widget__panel" id="demo-widget-panel" role="dialog" aria-labelledby="demo-widget-title" hidden>
    <section class="chat chat--widget" data-chat data-chat-persona="support" data-chat-storage="vr-chat-support-demo">
      <header class="chat__header">
        <span class="avatar avatar--soft"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4M8 2h8M9 13v2M15 13v2"/></svg></span>
        <div class="chat__heading">
          <h3 class="chat__title" id="demo-widget-title">Acme AI support</h3>
          <p class="chat__status">Usually replies instantly</p>
        </div>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" data-chat-clear hidden>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span class="visually-hidden">Start a new conversation</span>
        </button>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" data-chat-close>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>
          <span class="visually-hidden">Minimise chat</span>
        </button>
      </header>
      <div class="chat__log" role="log" aria-label="Conversation with Acme AI support" aria-live="off" tabindex="0" data-chat-log>
        <div class="chat__message chat__message--assistant">
          <div class="chat__bubble">
            <p>Hi! I can track orders, explain returns and shipping, or connect you with a person. What can I help with?</p>
          </div>
        </div>
      </div>
      <div class="chat__suggestions" data-chat-suggestions hidden>
        <button type="button" class="chip" data-chat-suggestion>Where is my order #1061?</button>
        <button type="button" class="chip" data-chat-suggestion>What is your return policy?</button>
        <button type="button" class="chip" data-chat-suggestion>Talk to a person</button>
      </div>
      <form class="chat__composer" action="/contact" method="get" data-chat-form>
        <label class="visually-hidden" for="demo-widget-input">Message Acme AI support</label>
        <textarea class="chat__input" id="demo-widget-input" name="message" rows="1" placeholder="Ask a question…" required data-chat-input></textarea>
        <div class="chat__actions">
          <button type="submit" class="btn btn--icon btn--sm" data-chat-send>
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>
            <span class="visually-hidden">Send message</span>
          </button>
          <button type="button" class="btn btn--icon btn--sm btn--secondary" data-chat-stop hidden>
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            <span class="visually-hidden">Stop generating</span>
          </button>
        </div>
      </form>
      <p class="chat__disclaimer">Demo assistant with sample data. Answers may be inaccurate.</p>
    </section>
  </div>
</div>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_ChatWidget.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_ChatWidget" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/chat.css';
import '@/ui/css/components/code.css';
import '@/ui/css/components/feedback.css';
import '@/ui/css/components/button.css';

export function ChatWidget() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/chat.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/chat-widget.html` and use `{% include "components/chat-widget.html" %}`.

<h2 id="theme-customizer">Theme customizer</h2>

*Theming.* Drawer for choosing light/dark/system mode, a brand preset or any custom brand colour, density and corner radius. Changes apply live, persist per visitor, report WCAG contrast and generate CSS you can paste into brand.css.

- **Accessibility:** Native radio groups in labelled fieldsets; the panel is a modal <dialog> (focus contained, Escape closes, focus returns to the trigger). Contrast results are announced through a status message. Custom colours are adjusted automatically until text meets 4.5:1. The trigger ships hidden because it needs JavaScript.
- **JavaScript:** `src/assets/js/components/theme-customizer.js`, `src/assets/js/components/copy.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Theme customizer (vanilla-responsive-ui)
Markup: src/components/theme-customizer.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/themes.css, src/assets/css/components/form.css, src/assets/css/components/dialog.css, src/assets/css/components/button.css
JS: src/assets/js/components/theme-customizer.js, src/assets/js/components/copy.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#theme-customizer
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/components/form.css">
<link rel="stylesheet" href="/assets/css/components/dialog.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<button type="button" class="btn btn--secondary" commandfor="demo-theme-panel" command="show-modal" data-theme-panel-trigger hidden>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg> Customize theme
</button>

<dialog class="dialog drawer" id="demo-theme-panel" aria-labelledby="demo-theme-panel-title" closedby="any">
  <div class="dialog__header">
    <h2 class="dialog__title" id="demo-theme-panel-title">Customize theme</h2>
    <button type="button" class="btn btn--ghost btn--icon" commandfor="demo-theme-panel" command="close">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      <span class="visually-hidden">Close theme panel</span>
    </button>
  </div>
  <form class="dialog__body form" data-theme-customizer>
    <fieldset class="fieldset">
      <legend class="fieldset__legend">Mode</legend>
      <div class="segmented">
        <label class="segmented__option"><input type="radio" name="mode" value="system"><span class="segmented__label">System</span></label>
        <label class="segmented__option"><input type="radio" name="mode" value="light"><span class="segmented__label"><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg> Light</span></label>
        <label class="segmented__option"><input type="radio" name="mode" value="dark"><span class="segmented__label"><svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark</span></label>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset__legend">Brand colour</legend>
      <div class="swatches">
        <label class="swatch"><input type="radio" name="brand" value="indigo"><span class="swatch__chip swatch__chip--indigo"></span> Indigo</label>
        <label class="swatch"><input type="radio" name="brand" value="teal"><span class="swatch__chip swatch__chip--teal"></span> Teal</label>
        <label class="swatch"><input type="radio" name="brand" value="violet"><span class="swatch__chip swatch__chip--violet"></span> Violet</label>
        <label class="swatch"><input type="radio" name="brand" value="rose"><span class="swatch__chip swatch__chip--rose"></span> Rose</label>
        <label class="swatch"><input type="radio" name="brand" value="amber"><span class="swatch__chip swatch__chip--amber"></span> Amber</label>
        <label class="swatch"><input type="radio" name="brand" value="slate"><span class="swatch__chip swatch__chip--slate"></span> Slate</label>
      </div>
    </fieldset>

    <div class="field">
      <label class="field__label" for="demo-theme-custom-color">Or pick any brand colour</label>
      <p class="field__hint" id="demo-theme-custom-hint">Shades are adjusted automatically to keep text readable in both themes.</p>
      <input class="color-input" id="demo-theme-custom-color" name="custom" type="color" value="#2a4fcf" aria-describedby="demo-theme-custom-hint">
    </div>

    <p class="text-sm text-muted" role="status" data-theme-contrast></p>

    <fieldset class="fieldset">
      <legend class="fieldset__legend">Density</legend>
      <div class="segmented">
        <label class="segmented__option"><input type="radio" name="density" value="compact"><span class="segmented__label">Compact</span></label>
        <label class="segmented__option"><input type="radio" name="density" value="default"><span class="segmented__label">Default</span></label>
        <label class="segmented__option"><input type="radio" name="density" value="comfortable"><span class="segmented__label">Comfortable</span></label>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset__legend">Corners</legend>
      <div class="segmented">
        <label class="segmented__option"><input type="radio" name="radius" value="sharp"><span class="segmented__label">Sharp</span></label>
        <label class="segmented__option"><input type="radio" name="radius" value="default"><span class="segmented__label">Default</span></label>
        <label class="segmented__option"><input type="radio" name="radius" value="round"><span class="segmented__label">Round</span></label>
      </div>
    </fieldset>

    <div class="field">
      <label class="field__label" for="demo-theme-css-output">CSS for your project</label>
      <textarea class="textarea textarea--code" id="demo-theme-css-output" readonly rows="8" data-theme-output></textarea>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn--sm" data-copy data-copy-target="#demo-theme-css-output" hidden><span data-copy-label>Copy CSS</span></button>
      <button type="button" class="btn btn--sm btn--ghost" data-theme-reset>Reset to defaults</button>
    </div>
  </form>
</dialog>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_ThemeCustomizer.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_ThemeCustomizer" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/themes.css';
import '@/ui/css/components/form.css';
import '@/ui/css/components/dialog.css';
import '@/ui/css/components/button.css';

export function ThemeCustomizer() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/theme-customizer.js').then((m) => m.init(ref.current));
    import('@/ui/js/components/copy.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/theme-customizer.html` and use `{% include "components/theme-customizer.html" %}`.

<h2 id="theme-toggle">Theme toggle</h2>

*Theming.* Switches between light and dark themes. Follows the operating-system preference until the user chooses, then remembers the choice.

- **Accessibility:** A toggle button with a constant accessible name ("Dark theme") and aria-pressed for state. Hidden until JavaScript runs, because it cannot work without it.
- **JavaScript:** `src/assets/js/components/theme-toggle.js`

**Reference for AI agents** (paste into your prompt):

```text
Component: Theme toggle (vanilla-responsive-ui)
Markup: src/components/theme-toggle.html
CSS: src/assets/css/tokens.css, src/assets/css/themes.css, src/assets/css/base.css, src/assets/css/components/button.css
JS: src/assets/js/components/theme-toggle.js (auto-initialised by src/assets/js/main.js)
Docs: docs/COMPONENTS.md#theme-toggle
Rules: CLAUDE.md (no dependencies, no inline scripts/styles, WCAG 2.2 AA)
```

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components/button.css">
<script type="module" src="/assets/js/main.js"></script>

<!-- In <body> -->
<button type="button" class="btn btn--ghost btn--icon theme-toggle" data-theme-toggle aria-pressed="false" hidden>
  <svg class="icon theme-toggle__light" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  <svg class="icon theme-toggle__dark" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
  <span class="visually-hidden">Dark theme</span>
</button>
```

### ASP.NET Core (Razor Pages / MVC)

Save the markup as `Pages/Shared/Components/_ThemeToggle.cshtml` (escape any literal `@` as `@@`) and render it with `<partial name="Components/_ThemeToggle" />`. Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once as a module.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/button.css';

export function ThemeToggle() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/theme-toggle.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* markup converted to JSX */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/theme-toggle.html` and use `{% include "components/theme-toggle.html" %}`.

