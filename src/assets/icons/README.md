# Icons

A small library of 24×24 stroke icons, stored as individual SVG files so they
can be copied, inlined, or imported by any toolchain.

## Usage

Inline the SVG markup so it inherits `currentColor`, works over `file://`,
and needs no extra request. Use the `.icon` class from `base.css` instead of
presentational attributes:

```html
<!-- Decorative (next to visible text): hide from assistive technology -->
<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>

<!-- Icon-only control: the accessible name lives on the control -->
<button type="button" class="btn btn--ghost btn--icon" aria-label="Search">
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">…</svg>
</button>
```

Modifiers: `.icon--sm`, `.icon--lg`, `.icon--filled` (for solid shapes such
as `star`).

## Attribution

Most icon geometry is based on [Feather Icons](https://feathericons.com)
by Cole Bemis, released under the MIT License. `favicon.svg` and
`accessibility.svg` are original to this project.
