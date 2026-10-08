# Integration guide

The templates are plain HTML, CSS and ES modules, so integrating them is
mostly a matter of **copying the assets**, **splitting each page into a
layout and partials**, and **calling `init()` after your framework renders
markup**. This guide covers ASP.NET Core (Razor Pages, MVC, Blazor),
React/Next.js, Vue, Svelte, Angular, Astro, Django, Flask, FastAPI, Laravel
and Rails.

Per-component snippets for vanilla HTML, Razor, React and Django are
generated in [COMPONENTS.md](COMPONENTS.md).

## 1. The universal recipe

1. **Copy `src/assets/`** into your static files directory. Keep the
   folder structure: modules import each other with relative paths.
2. **Link the CSS** in your base layout, in this order: `tokens.css`,
   `base.css`, then the component stylesheets you use, then page CSS.
3. **Load `main.js` once** as a module: `<script type="module" src=".../assets/js/main.js"></script>`.
   It initialises every component present on the page.
4. **Split the template** into a layout (head, skip link, header, footer)
   and page bodies, and turn repeated pieces into partials/components.
5. **After client-side rendering or navigation**, call `initAll(container)`
   from `main.js`, or `init(container)` from a single component module.
   Initialisation is idempotent, so calling it twice is safe.
6. **Move the CSP to an HTTP header** (see [Security headers](#security-headers))
   and add CSRF protection to forms.
7. **Remove `data-demo-submit`** from forms so they post to your endpoints.

### Mapping the templates

| Template | Layout parts | Page-specific files | Server responsibilities |
| --- | --- | --- | --- |
| `landing-page` | Site header, site footer | `landing.css` | Newsletter endpoint (`POST /newsletter`) |
| `dashboard` | Top bar, sidebar nav, `<main>` | `dashboard.css`, `dashboard.js` | Data for KPIs, table and chart; report creation |
| `e-commerce` | Site header (cart button), footer | `shop.css`, `shop.js` | Filter query (`GET ?category=&price=`), pagination, cart API |
| `auth` | Minimal auth header/footer | `auth.css` | `POST /account/sign-in`, `POST /account/register`, CSRF, rate limiting |

### Theme without a flash

`theme-toggle.js` stores the user's choice in `localStorage` and in a
`vr_theme` cookie (`light` or `dark`). To render the right theme on the very
first paint, read the cookie on the server and print it:
`<html lang="en" data-theme="dark">`. Accept only the two known values; a
cookie is user-controlled input.

---

## 2. ASP.NET Core

### Files

```text
wwwroot/
└── assets/            ← copy of src/assets
Pages/ (or Views/)
├── Shared/
│   ├── _Layout.cshtml
│   ├── _SiteHeader.cshtml
│   ├── _SiteFooter.cshtml
│   └── Components/    ← partials made from src/components/*.html
└── Index.cshtml       ← body of a template
```

### Layout (`Pages/Shared/_Layout.cshtml`)

```cshtml
<!DOCTYPE html>
@{
  var theme = Context.Request.Cookies["vr_theme"];
  theme = theme is "light" or "dark" ? theme : null;  // null omits the attribute
}
<html lang="en" data-theme="@theme">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@ViewData["Title"] — Acme</title>
  <link rel="stylesheet" href="~/assets/css/tokens.css" asp-append-version="true">
  <link rel="stylesheet" href="~/assets/css/base.css" asp-append-version="true">
  <link rel="stylesheet" href="~/assets/css/components/button.css" asp-append-version="true">
  <link rel="stylesheet" href="~/assets/css/components/header.css" asp-append-version="true">
  <link rel="stylesheet" href="~/assets/css/components/footer.css" asp-append-version="true">
  @await RenderSectionAsync("Styles", required: false)
  <script type="module" src="~/assets/js/main.js" asp-append-version="true"></script>
  @await RenderSectionAsync("Scripts", required: false)
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <partial name="_SiteHeader" />
  <main id="main" tabindex="-1">
    @RenderBody()
  </main>
  <partial name="_SiteFooter" />
</body>
</html>
```

> `asp-append-version` adds a content hash for cache busting. Note that
> module imports inside `main.js` are not versioned; serve
> `/assets/js` with `Cache-Control: no-cache` (revalidate) or add your own
> versioned folder name.

### A page (`Pages/Dashboard.cshtml`)

```cshtml
@page
@model DashboardModel
@{ ViewData["Title"] = "Overview"; }

@section Styles {
  <link rel="stylesheet" href="~/assets/css/components/table.css" asp-append-version="true">
  <link rel="stylesheet" href="~/templates/dashboard/dashboard.css" asp-append-version="true">
}

<h1 class="dashboard__title">Overview</h1>

<div class="table-wrapper" role="region" aria-labelledby="orders-caption" tabindex="0">
  <table class="table" data-sortable>
    <caption id="orders-caption">Recent orders</caption>
    <thead>
      <tr>
        <th scope="col" data-sort="text">Customer</th>
        <th scope="col" data-sort="number" class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      @foreach (var order in Model.Orders)
      {
        <tr>
          <td>@order.Customer</td>
          <td class="num" data-sort-value="@order.Amount">@order.Amount.ToString("C")</td>
        </tr>
      }
    </tbody>
  </table>
</div>
```

Razor HTML-encodes `@` expressions by default, which keeps dynamic values
safe. Escape literal `@` characters in copied markup as `@@`.

### Forms and antiforgery

The form tag helper adds an antiforgery token automatically to
`method="post"` forms in Razor Pages and MVC. Keep the markup from the auth
template and bind the inputs:

```cshtml
<form class="form" method="post" data-validate>
  <div class="field">
    <label class="field__label" asp-for="Input.Email">Email address</label>
    <input class="input" asp-for="Input.Email" autocomplete="username" aria-describedby="email-error">
    <p class="field__error" id="email-error"><span asp-validation-for="Input.Email"></span></p>
  </div>
  <button type="submit" class="btn btn--block">Sign in</button>
</form>
```

Server-side validation messages render into the same `.field__error`
element the client script uses. Set `aria-invalid="true"` on the input when
`ModelState` has an error for it.

### Theme tokens from configuration

```cshtml
@inject IConfiguration Config
<link rel="stylesheet" href="~/assets/css/tokens.css">
<link rel="stylesheet" href="~/css/brand.css">  @* overrides --color-primary etc. *@
```

For per-tenant themes, render a stylesheet endpoint
(`/theme.css`) that outputs `:root { --color-primary: …; }` from settings.
Avoid inline `<style>` so the CSP stays strict.

### Blazor

Static markup goes straight into `.razor` components. Initialise behaviour
after render with JS interop:

```razor
@inject IJSRuntime JS
@implements IAsyncDisposable

<div @ref="root">
  <div class="tabs" data-tabs>…</div>
</div>

@code {
  private ElementReference root;
  private IJSObjectReference? module;

  protected override async Task OnAfterRenderAsync(bool firstRender)
  {
    if (!firstRender) return;
    module = await JS.InvokeAsync<IJSObjectReference>("import", "./assets/js/components/tabs.js");
    await module.InvokeVoidAsync("init", root);
  }

  public async ValueTask DisposeAsync()
  {
    if (module is not null) await module.DisposeAsync();
  }
}
```

---

## 3. React and Next.js

### Files

```text
ui/                     ← copy of src/assets (css/, js/, icons/, images/)
app/
├── layout.tsx
└── dashboard/page.tsx
components/
└── Tabs.tsx
```

Add a path alias (`"@/ui/*": ["./ui/*"]` in `tsconfig.json`/`jsconfig.json`)
and move `ui/images` to `public/` if you serve images statically.

### Root layout (`app/layout.tsx`)

```tsx
import '@/ui/css/tokens.css';
import '@/ui/css/base.css';
import '@/ui/css/components/button.css';
import '@/ui/css/components/header.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to main content</a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
```

### Converting markup to JSX

| HTML | JSX |
| --- | --- |
| `class="btn"` | `className="btn"` |
| `for="email"` | `htmlFor="email"` |
| `tabindex="-1"` | `tabIndex={-1}` |
| `aria-*`, `data-*` | unchanged |
| `hidden` | `hidden` |
| `autocomplete="email"` | `autoComplete="email"` |
| `minlength="12"` / `maxlength` | `minLength={12}` / `maxLength` |
| `fetchpriority="high"` | `fetchPriority="high"` |
| `<svg …><path d="…"/></svg>` | unchanged (attributes like `stroke-width` become `strokeWidth`; the `.icon` class avoids them) |
| `commandfor`, `command`, `closedby` | write as-is; React passes unknown attributes to the DOM |

### Behaviour: call `init()` in an effect

```tsx
'use client';
import { useEffect, useRef } from 'react';
import '@/ui/css/components/tabs.css';

export function Tabs() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('@/ui/js/components/tabs.js').then((m) => m.init(ref.current));
  }, []);

  return (
    <div ref={ref}>
      <div className="tabs" data-tabs>
        <div className="tabs__list" data-tabs-list data-label="Account" hidden>
          <button type="button" className="tabs__tab" data-tab="panel-profile">Profile</button>
          <button type="button" className="tabs__tab" data-tab="panel-billing">Billing</button>
        </div>
        <section className="tabs__panel" id="panel-profile" aria-labelledby="panel-profile-h">
          <h3 className="tabs__heading" id="panel-profile-h">Profile</h3>
        </section>
        <section className="tabs__panel" id="panel-billing" aria-labelledby="panel-billing-h">
          <h3 className="tabs__heading" id="panel-billing-h">Billing</h3>
        </section>
      </div>
    </div>
  );
}
```

The modules only touch `window`/`document` inside functions, so importing
them during server rendering is safe; `useEffect` guarantees `init` runs in
the browser. Under React Strict Mode the effect runs twice in development;
`init` is idempotent, so nothing binds twice.

**Who owns state?** The vanilla modules write ARIA attributes and `hidden`
directly. That is fine for markup React does not re-render (static
structure). If React needs to own the state (for example the selected tab
comes from the URL), port the module's logic into a hook instead and keep
the same markup, classes and ARIA, so the CSS and accessibility behaviour
are unchanged.

Use `useId()` to generate the ids that `aria-labelledby`, `aria-controls`
and `htmlFor` reference when a component can appear more than once.

### Toasts from React

```tsx
import { showToast } from '@/ui/js/components/toast.js';

<button type="button" className="btn" onClick={() => showToast('Saved', { variant: 'success' })}>
  Save
</button>
```

### Security headers in Next.js

```js
// next.config.mjs
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export default {
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: csp }] }];
  },
};
```

Next.js injects inline scripts for hydration; production apps typically
need a per-request nonce (set in middleware) added to `script-src`.

---

## 4. Vue, Svelte, Angular and Astro

All follow the same rule: render the markup, then call `init(element)`
once the element is in the DOM.

**Vue 3**

```vue
<script setup>
import { onMounted, ref } from 'vue';
import { init } from '@/ui/js/components/tabs.js';
const root = ref(null);
onMounted(() => init(root.value));
</script>

<template>
  <div ref="root"><!-- tabs markup, unchanged (Vue uses class/for as-is) --></div>
</template>
```

**Svelte 5**

```svelte
<script>
  import { init } from '$lib/ui/js/components/tabs.js';
  let root;
  $effect(() => { init(root); });
</script>

<div bind:this={root}><!-- tabs markup, unchanged --></div>
```

**Angular**

```ts
@Component({ selector: 'app-tabs', templateUrl: './tabs.html' })
export class TabsComponent implements AfterViewInit {
  constructor(private host: ElementRef<HTMLElement>) {}
  async ngAfterViewInit() {
    const { init } = await import('../../ui/js/components/tabs.js');
    init(this.host.nativeElement);
  }
}
```

Add the stylesheets to `angular.json` → `styles`, in token → base →
component order.

**Astro**

```astro
---
import '../ui/css/components/tabs.css';
---
<div class="tabs" data-tabs><!-- markup --></div>
<script>
  import { initAll } from '../ui/js/main.js';
  document.addEventListener('astro:page-load', () => initAll());
</script>
```

Astro bundles the `<script>` as an external module, so the CSP stays
strict.

---

## 5. Django and Jinja2

### Files

```text
static/assets/                ← copy of src/assets
templates/
├── base.html
├── partials/site_header.html
├── partials/site_footer.html
├── components/               ← src/components/*.html
└── shop/product_list.html    ← body of the e-commerce template
```

### Base template (`templates/base.html`)

```django
{% load static %}
<!DOCTYPE html>
<html lang="en"{% if request.COOKIES.vr_theme == "light" or request.COOKIES.vr_theme == "dark" %} data-theme="{{ request.COOKIES.vr_theme }}"{% endif %}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{% block title %}Acme{% endblock %}</title>
  <link rel="stylesheet" href="{% static 'assets/css/tokens.css' %}">
  <link rel="stylesheet" href="{% static 'assets/css/base.css' %}">
  <link rel="stylesheet" href="{% static 'assets/css/components/button.css' %}">
  <link rel="stylesheet" href="{% static 'assets/css/components/header.css' %}">
  <link rel="stylesheet" href="{% static 'assets/css/components/footer.css' %}">
  {% block styles %}{% endblock %}
  <script type="module" src="{% static 'assets/js/main.js' %}"></script>
  {% block scripts %}{% endblock %}
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  {% include "partials/site_header.html" %}
  <main id="main" tabindex="-1">
    {% block content %}{% endblock %}
  </main>
  {% include "partials/site_footer.html" %}
</body>
</html>
```

> With `ManifestStaticFilesStorage`, only the files referenced through
> `{% static %}` get hashed names; relative `import` statements inside the
> modules still point at the original names. Either keep un-hashed copies
> (the default `collectstatic` keeps both) or exclude `assets/js` from
> hashing.

### A page (`templates/shop/product_list.html`)

```django
{% extends "base.html" %}
{% load static %}

{% block title %}Shop all products — {{ block.super }}{% endblock %}

{% block styles %}
  <link rel="stylesheet" href="{% static 'assets/css/components/card.css' %}">
  <link rel="stylesheet" href="{% static 'templates/e-commerce/shop.css' %}">
{% endblock %}

{% block content %}
  <h1>Shop all products</h1>
  <ul class="product-grid list-reset" role="list" data-product-list>
    {% for product in products %}
      <li data-product data-category="{{ product.category }}" data-price="{{ product.price }}">
        <article class="card product">
          <img class="card__media" src="{{ product.image.url }}" width="400" height="300" alt="" loading="lazy" decoding="async">
          <div class="card__body">
            <h3 class="card__title"><a href="{{ product.get_absolute_url }}">{{ product.name }}</a></h3>
            <p class="product__price">{{ product.price }}</p>
          </div>
        </article>
      </li>
    {% empty %}
      <li><p>No products found.</p></li>
    {% endfor %}
  </ul>
{% endblock %}
```

Django auto-escapes variables. Add `{% csrf_token %}` inside every
`method="post"` form.

### Flask and FastAPI (Jinja2)

The same templates work in Jinja2. Replace `{% static 'x' %}` with
`{{ url_for('static', filename='x') }}` (Flask) or
`{{ url_for('static', path='x') }}` (FastAPI with
`app.mount("/static", StaticFiles(directory="static"), name="static")`).
Use Flask-WTF or your own token for CSRF.

---

## 6. Laravel (Blade)

```blade
{{-- resources/views/layouts/app.blade.php --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@yield('title', 'Acme')</title>
  <link rel="stylesheet" href="{{ asset('assets/css/tokens.css') }}">
  <link rel="stylesheet" href="{{ asset('assets/css/base.css') }}">
  @stack('styles')
  <script type="module" src="{{ asset('assets/js/main.js') }}"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  @include('partials.site-header')
  <main id="main" tabindex="-1">@yield('content')</main>
  @include('partials.site-footer')
</body>
</html>
```

Copy `src/assets` to `public/assets`. Use `@csrf` in POST forms and
`{{ }}` (escaped) for all dynamic values. Blade treats `@` as a directive
prefix; escape literal ones as `@@`.

## 7. Ruby on Rails

Copy `src/assets` to `public/ui/` (so it bypasses the asset pipeline and
relative module imports keep working) and reference it from the layout:

```erb
<%# app/views/layouts/application.html.erb %>
<link rel="stylesheet" href="/ui/css/tokens.css">
<link rel="stylesheet" href="/ui/css/base.css">
<script type="module" src="/ui/js/main.js"></script>
...
<main id="main" tabindex="-1"><%= yield %></main>
```

Turn snippets into partials (`app/views/components/_tabs.html.erb`,
rendered with `<%= render "components/tabs" %>`). With Turbo, re-initialise
after navigation:

```js
// public/ui/js/turbo-init.js
import { initAll } from './main.js';
document.addEventListener('turbo:load', () => initAll());
```

Rails forms built with `form_with` include the authenticity token.

---

## Security headers

Send the CSP and related headers from the server in production (a `<meta>`
CSP cannot set `frame-ancestors`). The policy below matches the templates:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'
```

**ASP.NET Core** (`Program.cs`)

```csharp
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    headers["X-Content-Type-Options"] = "nosniff";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});
```

**Django** (a small middleware, works on every version)

```python
# myproject/middleware.py
CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("Content-Security-Policy", CSP)
        return response
```

**Flask**

```python
@app.after_request
def security_headers(response):
    response.headers.setdefault("Content-Security-Policy", CSP)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    return response
```

**nginx** (static hosting)

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
```

ES modules must be served with a JavaScript MIME type
(`text/javascript`); most servers already do this.
