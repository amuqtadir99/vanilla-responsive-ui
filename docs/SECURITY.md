# Security

The templates are designed to run under a strict Content Security Policy and
to make cross-site scripting (XSS) difficult to introduce by accident. This
document describes those controls and what you must still do on the server.

## Reporting a vulnerability

Please do not open a public issue for security problems. Use
[GitHub private vulnerability reporting](https://github.com/amuqtadir99/vanilla-responsive-ui/security/advisories/new)
for this repository. You will get a response within 7 days.

## Supply chain

There are no runtime or build dependencies: no npm packages, no CDNs, no web
fonts, no third-party scripts. Everything that runs in the browser is in this
repository and can be reviewed line by line. The test suite rejects external
scripts, stylesheets, `@import` chains and bare module imports.

The only external tools are optional and used for validation, never shipped:
the Nu HTML Checker (`vnu.jar`) and Playwright.

## Content Security Policy

Every template declares this policy in a `<meta>` tag:

```text
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
form-action 'self';
base-uri 'self';
object-src 'none'
```

No `'unsafe-inline'` and no `'unsafe-eval'`. The templates comply because:

- There are **no inline `<script>` blocks** and **no `on*=` attributes**;
  behaviour lives in external ES modules using `addEventListener`.
- There are **no `style` attributes** and **no `<style>` blocks**; dynamic
  values are set through the CSSOM (`element.style.setProperty`), which CSP
  allows, or through classes and data attributes.
- `data-*` attributes carry configuration instead of inline code.

The browser tests fail on any CSP violation reported by the page.

### In production, send CSP as an HTTP header

A `<meta>` CSP cannot set `frame-ancestors`, `report-uri`/`report-to` or
`sandbox`. Send the policy from your server and add clickjacking and
reporting directives:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Framework examples are in [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md#security-headers).
If your framework injects inline scripts (for example hydration data),
use per-request nonces (`script-src 'self' 'nonce-…'`) rather than
`'unsafe-inline'`.

## XSS prevention in JavaScript

- **Text is inserted with `textContent`**, never `innerHTML`.
  `core/dom.js` provides `createElement(tag, { text, attrs, children })`,
  which assigns text safely and throws if asked to set an `on*` attribute.
- Toasts, form errors, announcements and the cart counter all write user-
  or data-derived strings through `textContent`.
- Existing DOM nodes are moved (`append`) rather than serialised and
  re-parsed (for example when sorting tables).
- `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
  `eval`, `new Function` and `setAttribute('style' | 'on…')` are rejected by
  `tests/checks/js.mjs`.

If you genuinely need to render HTML from a string, parse it with the
[Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API)
(`element.setHTML()`) where available, or a reviewed sanitiser on the
server, and adopt [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
(`require-trusted-types-for 'script'`).

## Forms

Client-side validation is a usability feature, **not a security control**.
The server must:

- Re-validate and normalise every field.
- Protect state-changing requests against CSRF (anti-forgery token in a
  hidden input, `SameSite` cookies). See the framework snippets in the
  integration guide.
- Rate-limit authentication endpoints and use generic error messages
  ("Email or password is incorrect").
- Store passwords with a slow, salted hash (Argon2id, scrypt or bcrypt).

The auth templates support password managers and secure input: correct
`autocomplete` tokens (`username`, `current-password`, `new-password`),
paste allowed, `spellcheck="false"` on email, and the show/hide toggle
always switches the field back to `type="password"` before submitting.

Demo forms use `data-demo-submit` to intercept successful submissions.
**Remove that attribute** before connecting a form to a real endpoint.

## Storage

`localStorage` holds only non-sensitive preferences (theme) and demo data
(the e-commerce cart). The theme is mirrored in a `vr_theme` cookie
(`SameSite=Lax`) so servers can render it; treat it as untrusted input and
accept only `light` or `dark`. Never put tokens, personal data or secrets in web
storage; use `HttpOnly`, `Secure`, `SameSite` cookies for sessions. Values
read back from storage are validated before use (`shop.js` drops anything
that is not a string array).

## Links

- External links opened in a new tab must use `rel="noopener noreferrer"`
  (enforced by the HTML suite).
- `javascript:` URLs and `href="#"` are rejected.

## Checklist for contributors

- [ ] No new external resource, package, CDN or font.
- [ ] No inline script, style or event handler.
- [ ] Dynamic text uses `textContent` / `createElement`.
- [ ] Forms post to `'self'`, include CSRF protection in integrations, and
      do not rely on client-side validation.
- [ ] `node tests/run-all.mjs` and `node tests/browser/smoke.mjs` pass
      (no CSP violations).
