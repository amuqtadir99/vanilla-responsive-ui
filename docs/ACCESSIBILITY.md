# Accessibility

Target: **WCAG 2.2 Level AA**. Accessibility is a release requirement, not a
follow-up task. This document lists the patterns the templates use, how they
are tested, and the manual checks that automation cannot replace.

## Principles

1. **Native HTML first.** `<button>`, `<a href>`, `<details>`, `<dialog>`,
   `<fieldset>`/`<legend>`, `<label>`, `<table>` with `<caption>` and
   `scope`. ARIA is added only where HTML has no equivalent (tabs, toggle
   state, live regions).
2. **Progressive enhancement.** Content and navigation work without
   JavaScript. Controls that need JavaScript ship with the `hidden`
   attribute and are revealed by their module.
3. **Never colour alone.** Status uses text and icons as well as colour
   (badges, alerts, form errors, trend indicators).
4. **Respect user settings.** Browser zoom and text size (`rem`, fluid
   `clamp()`), `prefers-reduced-motion`, `prefers-color-scheme`,
   `forced-colors` (Windows High Contrast).

## Page structure

Every template follows the same skeleton:

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="site-header">… <nav aria-label="Primary">…</nav> …</header>
  <main id="main" tabindex="-1">
    <h1>Exactly one per page</h1>
    <section aria-labelledby="section-title">
      <h2 id="section-title">…</h2>
    </section>
  </main>
  <footer class="site-footer">… <nav aria-labelledby="footer-heading">…</nav></footer>
</body>
```

- The skip link is the first focusable element and targets `<main>`
  (`tabindex="-1"` so focus lands there in every browser). (2.4.1)
- One `<h1>`; heading levels never skip. (1.3.1, 2.4.6)
- Multiple `<nav>` landmarks are labelled so they can be told apart.
- `<html lang="en">` is set; change it when you translate. (3.1.1)
- Every page has a unique, descriptive `<title>`. (2.4.2)

## Component patterns

| Component | Pattern | Key details |
| --- | --- | --- |
| Mobile menu / sidebar | [APG Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | `aria-expanded`, `aria-controls`; Escape closes and returns focus |
| Accordion | Native `<details>`/`<summary>` | No ARIA needed; no interactive content inside `<summary>` |
| Tabs | [APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) (automatic activation) | Roles added by JS, roving `tabindex`, Arrow/Home/End keys, panels focusable |
| Dialog | Native `<dialog>` + `showModal()` | Focus moves in, background inert, Escape closes, focus returns to the trigger; labelled by its heading |
| Forms | Labels + `aria-describedby` | Visible labels; hints and errors linked; `aria-invalid`; focus moves to the first error; error count announced |
| Password toggle | Toggle button | Constant name ("Show password") + `aria-pressed` |
| Theme toggle | Toggle button | Constant name ("Dark theme") + `aria-pressed` |
| Toast | Live region (`role="status"`) | Polite; pauses on hover/focus; dismiss button; never the only source of critical info |
| Sortable table | [APG Sortable Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/) | Header buttons; `aria-sort` on the sorted column; change announced |
| Table chart | Data table | The table *is* the chart: values stay readable; bars are decoration |
| SVG charts | `<figure>` + focusable `role="group"` plot + text alternatives | The SVG drawing is decorative; the figure has a caption, a generated summary (high, low, latest, change) and a "Show data table" disclosure. The plot is focusable: Arrow keys, Home and End move between points and each value is announced through a polite live region. Legend items are `aria-pressed` buttons. Series colours are ≥ 3:1 against cards, and lines also differ by dash pattern, so colour is never the only cue (1.4.1, 1.4.11) |
| Data grid | Table + toolbar + pagination | Native `<table>` with caption and `scope`; search and filters are labelled; sort buttons set `aria-sort`; result count announced ("Showing 1–10 of 48 orders"); pagination uses buttons with `aria-current="page"`; row actions are named per row ("View order #1061") |
| Chat / assistants | `role="log"` + labelled composer | Focusable, labelled log; hidden "You said" / "Assistant said" prefixes; a reply is announced once when complete, not token by token; tool steps are `<details>`; Enter sends, Shift+Enter adds a line, Escape stops a reply or closes the widget; the widget returns focus to its launcher; feedback buttons use `aria-pressed` |
| Theme customizer | Drawer `<dialog>` + `<fieldset>` radio groups | Native radios for mode, brand, density and radius; the colour input is labelled; the contrast report is a `role="status"` region; custom colours are adjusted until text reaches 4.5:1 |
| App shell sidebar | Disclosure below `64em` | The menu button has `aria-expanded`; the sidebar nav marks the current page with `aria-current="page"` and the current section with `aria-current="true"` |
| Copy buttons | Button + announcement | Constant name ("Copy code", "Copy path for AI"); success is announced and shown as text, not only as an icon change |
| Scrollable tables | Region | `role="region"`, label, `tabindex="0"` so keyboard users can scroll |
| Breadcrumb / pagination | Labelled `<nav>` | `aria-current="page"`; visually hidden "Page" prefix |
| Cards | Stretched link | One link per card; the whole card is clickable; footer controls remain separate targets |
| Icons | Inline SVG | `aria-hidden="true"`; icon-only controls carry visually hidden text |

## Visual design requirements

- **Contrast.** Text ≥ 4.5:1, large text and UI boundaries/focus ≥ 3:1
  (1.4.3, 1.4.11). All token pairs are verified in light and dark themes by
  `tests/checks/contrast.mjs`. Run it after any colour change.
- **Focus visible.** A 3 px `:focus-visible` outline with offset on every
  interactive element, using `--color-focus`. Never remove an outline
  without a replacement; the CSS suite rejects it. (2.4.7, 2.4.11)
- **Focus not obscured.** `scroll-padding-top` accounts for the sticky
  header. (2.4.11)
- **Target size.** Interactive controls are at least 44×44 px
  (`--target-size`), beyond the 24×24 px minimum. (2.5.8)
- **Reflow.** No horizontal scrolling at 320 CSS px; verified in the
  browser tests. (1.4.10)
- **Text spacing and zoom.** No fixed heights on text containers; all font
  sizes in `rem`. (1.4.4, 1.4.12)
- **Motion.** All transitions and animations are disabled under
  `prefers-reduced-motion: reduce`. (2.3.3)
- **Forced colours.** Components add borders or system colours where
  backgrounds would disappear in High Contrast mode.

## Forms checklist

- Every control has a visible `<label>` (placeholders are not labels).
- Required fields: `required` attribute plus a visible marker, explained
  once at the top of the form.
- Use `autocomplete` tokens (`email`, `username`, `current-password`,
  `new-password`, `given-name`, …). (1.3.5)
- Group radios/checkboxes in `<fieldset>` with `<legend>`.
- Errors: specific, linked via `aria-describedby`, set `aria-invalid`,
  shown on submit or after the user leaves a field they typed in, never
  while they are still typing. (3.3.1, 3.3.3)
- Do not block paste into password fields; offer show/hide. (3.3.8)

## Automated testing

```bash
bash .claude/skills/audit-a11y.sh        # static audit + contrast + browser checks
```

The static audit (`tests/checks/a11y.mjs`) checks accessible names for
buttons and links, labels for form controls, `alt` on images, decorative
SVGs, ARIA value types, positive `tabindex`, focusable content inside
`aria-hidden`, nested interactive elements, fieldset legends, table
captions and header scope, labelled dialogs and landmarks, and the
progressive-enhancement conventions above.

The contrast suite (`tests/checks/contrast.mjs`) checks every token pair,
the chart palette and every brand preset in light, system-dark and
explicit-dark themes; the unit suite checks that `generateBrand()` returns
AA-compliant palettes for arbitrary colours.

The browser tests (`tests/browser/smoke.mjs`, Playwright) load every page
and verify keyboard operation of the menu, tabs, dialog, sortable table,
forms, charts, data grids, chat and the theme panel; focus management; the
no-JavaScript baseline; and reflow at 320 px.

## Manual testing (required before release)

Automated tools catch roughly a third of WCAG failures. For every new or
changed template:

1. **Keyboard only.** Tab through the whole page. Is every control
   reachable, in a logical order, with a visible focus ring? Can you
   operate everything with Enter, Space, Arrow keys and Escape? Is focus
   ever lost or trapped (outside of open dialogs)?
2. **Screen readers.** At minimum NVDA + Firefox or Chrome (Windows) and
   VoiceOver + Safari (macOS and iOS). Navigate by landmarks, headings and
   form controls. Are names, roles and states announced correctly? Are
   errors and toasts announced?
3. **Zoom.** 200% and 400% browser zoom: nothing overlaps, nothing is cut
   off, no horizontal scrolling at 400%.
4. **High Contrast.** Windows High Contrast / forced colours: all
   controls, focus rings and states remain visible.
5. **Reduced motion.** With reduced motion enabled, nothing animates.

## Known considerations

- Lists styled with `list-style: none` keep an explicit `role="list"`
  because Safari/VoiceOver otherwise drops list semantics. The Nu checker
  reports this as an informational note, which `tests/vnu-filters.txt`
  filters.
- The dashboard top bar shows the search field below the action buttons on
  small screens while it precedes them in the DOM. The items are
  independent, so the meaning of the sequence is preserved (2.4.3).
- Streaming chat replies are not read out as they arrive; screen reader
  users hear the full reply once it is complete, and can stop a long reply
  with Escape. Review this if your product relies on very long replies.
- Charts announce one point at a time; the data table is the complete
  alternative and is one keypress away.
- Demo forms (`data-demo-submit`) intercept successful submissions to show
  a message. Remove the attribute in production so forms post to your
  server, and always validate on the server too.
