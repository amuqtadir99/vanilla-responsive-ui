---
name: validate-w3c
description: Validate this repository's HTML, CSS and SVG against W3C standards with the Nu HTML Checker, then run the HTML/CSS/JS standards suites. Use before finishing any change to src/, after editing templates, layouts, partials or components, or when asked to check standards compliance.
allowed-tools: Bash(bash .claude/skills/validate-w3c.sh:*)
---

# Validate against W3C standards

Run from the repository root:

```bash
bash .claude/skills/validate-w3c.sh --install
```

- `--install` downloads `vnu.jar` into `.cache/` on first use (needs Java 11+).
  Omit it afterwards. `VNU_JAR=/path/to/vnu.jar` also works.
- `--require` fails if the Nu checker is unavailable (CI uses this).

What it checks:

1. Every complete HTML document under `src/`, every component snippet
   (wrapped in a minimal document), every stylesheet and every SVG.
2. `node tests/run-all.mjs --only html,css,js`: document structure, heading
   order, ids and references, CSP safety (no inline scripts/styles/handlers),
   design-token usage, focus visibility, XSS-safe JavaScript and the
   zero-dependency rule.

## When it fails

- Fix the markup or code; never weaken a check or add a filter to hide a
  real error. `tests/vnu-filters.txt` is only for documented validator gaps
  (modern CSS the checker does not understand yet).
- Re-run until it exits 0, then also run the `audit-a11y` skill.
