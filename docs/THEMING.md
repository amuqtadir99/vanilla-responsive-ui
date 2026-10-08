# Theming

Colours, type, spacing, corners and motion all come from CSS custom
properties ("design tokens"). There are four ways to change them, from
least to most effort:

| Approach | Needs JavaScript | Best for |
| --- | --- | --- |
| 1. Attributes on `<html>` (presets) | No | Picking a brand preset, density or corner style |
| 2. Theme customizer panel | Yes | Letting users, clients or designers try options live |
| 3. `brand.css` overrides | No | Your own brand colours, fonts and spacing |
| 4. `core/theme.js` API | Yes | Per-tenant themes, settings pages, server-driven themes |

Every option keeps **WCAG AA contrast**: presets are verified by the test
suite in light and dark mode, and custom colours are adjusted automatically.

## 1. Presets with attributes

`themes.css` (load after `tokens.css`) adds presets selected with attributes:

```html
<html lang="en" data-brand="teal" data-density="compact" data-radius="round" data-theme="dark">
```

| Attribute | Values | Default |
| --- | --- | --- |
| `data-brand` | `teal`, `violet`, `rose`, `amber`, `slate` | indigo (no attribute) |
| `data-density` | `compact`, `comfortable` | normal spacing |
| `data-radius` | `sharp`, `round` | normal corners |
| `data-theme` | `light`, `dark` | follows the operating system |

Each brand preset defines light and dark values for `--color-primary`,
`--color-primary-hover`, `--color-primary-soft`, `--color-on-primary`,
`--color-link`, `--color-focus` and `--color-selection`. Compact density
keeps controls at 36px, above the 24px WCAG 2.5.8 minimum.

Render these attributes on the server to avoid any flash on first paint.

## 2. The theme customizer

Every template has a **Theme** button (in the template switcher) that opens
a drawer with:

- mode: system, light or dark,
- brand: six presets or **any custom colour**,
- density and corner style,
- a live contrast report ("button text 5.5:1, links 6.3:1 — passes WCAG AA"),
- **Copy CSS**: the exact CSS to paste into `brand.css`.

Choices are remembered per visitor (localStorage) and apply across all
templates. The mode is also stored in a `vr_theme` cookie so a server can
render `data-theme` on first paint (see the
[integration guide](INTEGRATION_GUIDE.md#theme-without-a-flash)).

Add the panel to your own pages with the `theme-panel` partial or the
[theme customizer snippet](../src/components/theme-customizer.html).

## 3. brand.css overrides

Create a stylesheet loaded after `tokens.css` and `themes.css`:

```css
/* brand.css */
:root {
  --color-primary: #0f766e;
  --color-primary-hover: #115e59;
  --color-primary-soft: #d5f5ef;
  --color-on-primary: #ffffff;
  --color-link: #0f6b64;
  --color-focus: #0f766e;

  --font-main: "Inter", system-ui, sans-serif;
  --radius-md: 0.25rem;
  --container-max: 80rem;
}

/* Dark values: repeat for the OS preference and the explicit toggle. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-primary: #2dd4bf;
    --color-on-primary: #04201d;
  }
}

:root[data-theme="dark"] {
  --color-primary: #2dd4bf;
  --color-on-primary: #04201d;
}
```

The customizer's **Copy CSS** button writes this file for you from any
colour, with contrast-safe light and dark shades.

### Token reference

| Group | Tokens |
| --- | --- |
| Surfaces | `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-surface-sunken`, `--color-border`, `--color-border-strong` |
| Text | `--color-text`, `--color-text-muted`, `--color-link` |
| Brand | `--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-on-primary`, `--color-focus`, `--color-selection` |
| Status | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` and their `-soft` backgrounds |
| Charts | `--chart-1` … `--chart-6`, `--chart-grid` |
| Type | `--font-main`, `--font-mono`, `--font-size-xs` … `--font-size-4xl` (fluid `clamp()`), weights, line heights |
| Space | `--spacing-3xs` … `--spacing-3xl`, `--spacing-section`, `--container-max`, `--container-padding` |
| Shape | `--radius-sm` … `--radius-xl`, `--radius-pill`, `--shadow-sm` … `--shadow-lg` |
| Interaction | `--target-size`, `--focus-ring-width`, `--focus-ring-offset`, `--duration-*`, `--ease-standard` |

Check contrast after changing colours:

```bash
node tests/run-all.mjs --only contrast
```

To add a preset, copy one of the blocks in `themes.css` (light, system-dark
and explicit-dark), add a swatch token and option, and run the contrast
suite: it checks every preset automatically.

## 4. JavaScript API

```js
import { getSettings, applySettings, setMode, generateBrand, toCss } from './assets/js/core/theme.js';

applySettings({ ...getSettings(), brand: 'violet', density: 'compact' });
applySettings({ ...getSettings(), custom: '#e11d48' }); // any colour
setMode('dark');                                       // 'light' | 'dark' | 'system'

const { light, dark } = generateBrand('#e11d48');      // contrast-safe palettes
console.log(toCss(getSettings()));                     // CSS for brand.css
```

`applySettings` validates every value, persists it (unless
`{ persist: false }`), sets the `<html>` attributes and dispatches
`vr:settingschange`. `setMode` dispatches `vr:themechange`. Custom colours
are applied through the CSSOM, which a strict Content-Security-Policy
allows.

**Per-tenant themes:** render `data-brand` (or a `brand.css` link) on the
server for each tenant; use `applySettings` only for user-level overrides.
