# Components

<!-- GENERATED FILE. Do not edit by hand: update the snippet in src/components/ and run `node .claude/skills/generate-doc.js`. -->

Every component is a plain HTML snippet in [`src/components/`](../src/components/) plus optional CSS and JavaScript modules. Open [`src/components/index.html`](../src/components/index.html) in a browser (served over HTTP) to try them live.

All components require `tokens.css` and `base.css`. Components with JavaScript are initialised automatically by `main.js`, or individually by importing the module and calling `init(rootElement)`. See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for framework-specific setup.

| Component | CSS | JavaScript |
| --- | --- | --- |
| [Button](#button) | `components/button.css` | — |
| [Alert and badge](#alert) | `components/feedback.css` | — |
| [Card](#card) | `components/card.css` | — |
| [Accordion](#accordion) | `components/accordion.css` | — |
| [Tabs](#tabs) | `components/tabs.css` | `components/tabs.js` |
| [Dialog](#dialog) | `components/dialog.css` | `components/dialog.js` |
| [Form fields](#form-field) | `components/form.css`, `components/button.css` | `components/form-validation.js`, `components/password-toggle.js` |
| [Toast](#toast) | `components/feedback.css`, `components/button.css` | `components/toast.js` |
| [Data table](#data-table) | `components/table.css`, `components/feedback.css` | `components/table-sort.js`, `components/data-chart.js` |
| [Breadcrumb](#breadcrumb) | `components/navigation.css` | — |
| [Pagination](#pagination) | `components/navigation.css` | — |
| [Theme toggle](#theme-toggle) | `components/button.css` | `components/theme-toggle.js` |
| [Site header](#site-header) | `components/button.css`, `components/header.css` | `components/disclosure.js`, `components/theme-toggle.js` |
| [Site footer](#site-footer) | `components/footer.css`, `components/header.css` | — |

<h2 id="button">Button</h2>

Primary, secondary, ghost and danger buttons in three sizes, plus icon-only buttons. The same classes style <button> and <a>.

- **Snippet:** [`src/components/button.html`](../src/components/button.html)
- **CSS:** `src/assets/css/components/button.css`
- **JavaScript:** none (HTML and CSS only)
- **Accessibility:** Use <button type="button"> for actions and <a href> for navigation. Icon-only buttons need an accessible name (visually hidden text or aria-label). Minimum target size is 44×44 px. Disabled state uses the native disabled attribute; use aria-disabled="true" on links.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Button.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Button" />
```

Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
import '@/ui/css/components/button.css';

export function Button() {
  return <>{/* converted markup */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/button.html` and include it:

```django
{% include "components/button.html" %}
```

<h2 id="alert">Alert and badge</h2>

Inline status messages in four variants, and compact badges for labels and counts.

- **Snippet:** [`src/components/alert.html`](../src/components/alert.html)
- **CSS:** `src/assets/css/components/feedback.css`
- **JavaScript:** none (HTML and CSS only)
- **Accessibility:** Status is never conveyed by colour alone: each alert has an icon and a text title. For messages inserted dynamically, put them inside a live region (role="status" for polite, role="alert" for urgent). Badges that carry meaning include full text for screen readers.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Alert.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Alert" />
```

Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
import '@/ui/css/components/feedback.css';

export function Alert() {
  return <>{/* converted markup */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/alert.html` and include it:

```django
{% include "components/alert.html" %}
```

<h2 id="card">Card</h2>

Content card with optional media, stretched link and footer actions. Each card is a size container, so its layout switches to side-by-side when the card itself is wide (container query), wherever it is placed.

- **Snippet:** [`src/components/card.html`](../src/components/card.html)
- **CSS:** `src/assets/css/components/card.css`
- **JavaScript:** none (HTML and CSS only)
- **Accessibility:** The stretched link makes the whole card clickable while only the title link is announced and tabbable. Decorative images use alt="". Controls in the footer stay independently clickable.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Card.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Card" />
```

Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
import '@/ui/css/components/card.css';

export function Card() {
  return <>{/* converted markup */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/card.html` and include it:

```django
{% include "components/card.html" %}
```

<h2 id="accordion">Accordion</h2>

Collapsible sections built on native <details> and <summary>. Siblings that share a name attribute behave exclusively (one open at a time) in supporting browsers.

- **Snippet:** [`src/components/accordion.html`](../src/components/accordion.html)
- **CSS:** `src/assets/css/components/accordion.css`
- **JavaScript:** none (HTML and CSS only)
- **Accessibility:** Native elements provide keyboard support (Enter/Space), expanded state and no-JS behaviour for free. Do not put interactive elements inside <summary>.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Accordion.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Accordion" />
```

Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
import '@/ui/css/components/accordion.css';

export function Accordion() {
  return <>{/* converted markup */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/accordion.html` and include it:

```django
{% include "components/accordion.html" %}
```

<h2 id="tabs">Tabs</h2>

WAI-ARIA tabs with automatic activation. Without JavaScript every panel is shown in sequence with its own heading.

- **Snippet:** [`src/components/tabs.html`](../src/components/tabs.html)
- **CSS:** `src/assets/css/components/tabs.css`
- **JavaScript:** `src/assets/js/components/tabs.js`
- **Accessibility:** Roles (tablist, tab, tabpanel), aria-selected, aria-controls and roving tabindex are applied by the script. Arrow keys move between tabs, Home/End jump to the ends; only the active tab is in the Tab order.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Tabs.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Tabs" />
```

Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/tabs.css';

export function Tabs() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/tabs.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* converted markup */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/tabs.html` and include it:

```django
{% include "components/tabs.html" %}
```

<h2 id="dialog">Dialog</h2>

Modal dialog on the native <dialog> element, opened and closed declaratively with HTML Invoker Commands (commandfor / command). closedby="any" enables light dismiss.

- **Snippet:** [`src/components/dialog.html`](../src/components/dialog.html)
- **CSS:** `src/assets/css/components/dialog.css`
- **JavaScript:** `src/assets/js/components/dialog.js` (polyfills invoker commands and closedby where unsupported)
- **Accessibility:** showModal() traps focus, makes the page inert, closes on Escape and returns focus to the trigger natively. Label the dialog with aria-labelledby pointing at its heading. Every dialog needs a visible close control.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Dialog.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Dialog" />
```

Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/dialog.css';

export function Dialog() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/dialog.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* converted markup */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/dialog.html` and include it:

```django
{% include "components/dialog.html" %}
```

<h2 id="form-field">Form fields</h2>

Labelled text input, select, textarea, checkbox and radio group with hints and inline errors. Add data-validate to the form for accessible client-side validation.

- **Snippet:** [`src/components/form-field.html`](../src/components/form-field.html)
- **CSS:** `src/assets/css/components/form.css`, `src/assets/css/components/button.css`
- **JavaScript:** `src/assets/js/components/form-validation.js`, `src/assets/js/components/password-toggle.js`
- **Accessibility:** Every control has a visible <label>. Hints and errors are linked with aria-describedby; invalid fields get aria-invalid="true" and focus moves to the first error on submit. Group related radios and checkboxes in a <fieldset> with a <legend>. Use autocomplete tokens (WCAG 1.3.5).

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_FormField.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_FormField" />
```

Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

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
  return <div ref={ref}>{/* converted markup */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/form-field.html` and include it:

```django
{% include "components/form-field.html" %}
```

<h2 id="toast">Toast</h2>

Transient notifications announced through a polite live region. Trigger declaratively with data-toast or call showToast() from JavaScript.

- **Snippet:** [`src/components/toast.html`](../src/components/toast.html)
- **CSS:** `src/assets/css/components/feedback.css`, `src/assets/css/components/button.css`
- **JavaScript:** `src/assets/js/components/toast.js`
- **Accessibility:** Toasts pause while hovered or focused and include a dismiss button (WCAG 2.2.1). Never put the only copy of important information or required actions in a toast. Messages are inserted with textContent.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Toast.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Toast" />
```

Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

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
  return <div ref={ref}>{/* converted markup */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/toast.html` and include it:

```django
{% include "components/toast.html" %}
```

<h2 id="data-table">Data table</h2>

Responsive table in a scrollable, keyboard-focusable region. Add data-sortable for sortable columns and data-chart to draw proportional bars behind data-value cells.

- **Snippet:** [`src/components/data-table.html`](../src/components/data-table.html)
- **CSS:** `src/assets/css/components/table.css`, `src/assets/css/components/feedback.css`
- **JavaScript:** `src/assets/js/components/table-sort.js`, `src/assets/js/components/data-chart.js`
- **Accessibility:** Always include a <caption> and scope on header cells. The scroll wrapper is a labelled region with tabindex="0" so keyboard users can scroll it. Sortable headers become buttons; the sorted column gets aria-sort and the change is announced.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_DataTable.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_DataTable" />
```

Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

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
  return <div ref={ref}>{/* converted markup */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/data-table.html` and include it:

```django
{% include "components/data-table.html" %}
```

<h2 id="breadcrumb">Breadcrumb</h2>

Hierarchical trail of links to the current page.

- **Snippet:** [`src/components/breadcrumb.html`](../src/components/breadcrumb.html)
- **CSS:** `src/assets/css/components/navigation.css`
- **JavaScript:** none (HTML and CSS only)
- **Accessibility:** A <nav> labelled "Breadcrumb" containing an ordered list. Separators are CSS-generated so they are not announced. The current page is marked with aria-current="page".

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Breadcrumb.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Breadcrumb" />
```

Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
import '@/ui/css/components/navigation.css';

export function Breadcrumb() {
  return <>{/* converted markup */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/breadcrumb.html` and include it:

```django
{% include "components/breadcrumb.html" %}
```

<h2 id="pagination">Pagination</h2>

Page links with previous/next controls.

- **Snippet:** [`src/components/pagination.html`](../src/components/pagination.html)
- **CSS:** `src/assets/css/components/navigation.css`
- **JavaScript:** none (HTML and CSS only)
- **Accessibility:** A <nav> labelled "Pagination". Numbers include visually hidden "Page" text, the current page uses aria-current="page", and an unavailable previous/next link has no href so it is removed from the tab order.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_Pagination.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_Pagination" />
```

Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
import '@/ui/css/components/navigation.css';

export function Pagination() {
  return <>{/* converted markup */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/pagination.html` and include it:

```django
{% include "components/pagination.html" %}
```

<h2 id="theme-toggle">Theme toggle</h2>

Switches between light and dark themes. Follows the operating-system preference until the user chooses, then remembers the choice.

- **Snippet:** [`src/components/theme-toggle.html`](../src/components/theme-toggle.html)
- **CSS:** `src/assets/css/components/button.css`
- **JavaScript:** `src/assets/js/components/theme-toggle.js`
- **Accessibility:** A toggle button with a constant accessible name ("Dark theme") and aria-pressed for state. Hidden until JavaScript runs, because it cannot work without it.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_ThemeToggle.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_ThemeToggle" />
```

Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/button.css';

export function ThemeToggle() {
  const ref = useRef(null);
  useEffect(() => {
    import('@/ui/js/components/theme-toggle.js').then((m) => m.init(ref.current));
  }, []);
  return <div ref={ref}>{/* converted markup */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/theme-toggle.html` and include it:

```django
{% include "components/theme-toggle.html" %}
```

<h2 id="site-header">Site header</h2>

Sticky header with brand, primary navigation and actions. On small screens the menu collapses behind a disclosure button.

- **Snippet:** [`src/components/site-header.html`](../src/components/site-header.html)
- **CSS:** `src/assets/css/components/button.css`, `src/assets/css/components/header.css`
- **JavaScript:** `src/assets/js/components/disclosure.js`, `src/assets/js/components/theme-toggle.js`
- **Accessibility:** The toggle ships with the hidden attribute and is revealed by JavaScript, so without JS the full menu is always visible. The toggle exposes aria-expanded and aria-controls; Escape closes the menu and returns focus. Mark the current page link with aria-current="page".

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_SiteHeader.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_SiteHeader" />
```

Reference the stylesheets in `_Layout.cshtml` and load `~/assets/js/main.js` once with `<script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

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
  return <div ref={ref}>{/* converted markup */}</div>;
}
```

### Django / Jinja2

Save the markup as `templates/components/site-header.html` and include it:

```django
{% include "components/site-header.html" %}
```

<h2 id="site-footer">Site footer</h2>

Footer with brand blurb, grouped link columns and a bottom bar.

- **Snippet:** [`src/components/site-footer.html`](../src/components/site-footer.html)
- **CSS:** `src/assets/css/components/footer.css`, `src/assets/css/components/header.css`
- **JavaScript:** none (HTML and CSS only)
- **Accessibility:** Each link group is a <nav> labelled by its heading, so screen reader users can tell the navigation landmarks apart.

### Vanilla HTML

```html
<!-- In <head> -->
<link rel="stylesheet" href="/assets/css/tokens.css">
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

Save the markup as `Pages/Shared/Components/_SiteFooter.cshtml` (escape any literal `@` as `@@`) and render it where needed:

```cshtml
<partial name="Components/_SiteFooter" />
```

Reference the stylesheets in `_Layout.cshtml`.

### React / Next.js

Convert attributes to JSX (`class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`, boolean attributes such as `hidden` → `hidden`), then:

```jsx
import '@/ui/css/components/footer.css';
import '@/ui/css/components/header.css';

export function SiteFooter() {
  return <>{/* converted markup */}</>;
}
```

### Django / Jinja2

Save the markup as `templates/components/site-footer.html` and include it:

```django
{% include "components/site-footer.html" %}
```

