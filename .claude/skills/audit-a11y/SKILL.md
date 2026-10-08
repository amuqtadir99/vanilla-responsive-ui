---
name: audit-a11y
description: Audit accessibility (WCAG 2.2 AA) of this repository's pages and components - static checks for names, labels, ARIA, headings and landmarks, colour contrast of every design token and brand preset in light and dark themes, and Playwright browser checks for keyboard use, focus management, reflow at 320px and the no-JavaScript baseline. Use after any UI change or when asked whether something is accessible.
allowed-tools: Bash(bash .claude/skills/audit-a11y.sh:*), Bash(node tests/browser/smoke.mjs:*)
---

# Accessibility audit

```bash
bash .claude/skills/audit-a11y.sh            # static + contrast + browser checks
bash .claude/skills/audit-a11y.sh --static   # skip browser checks
```

Browser checks need Playwright (used if installed locally or globally;
skipped otherwise). Add `--require` to fail when it is missing.

## Interpreting results

- **Static audit** (`tests/checks/a11y.mjs`): accessible names, labels,
  alt text, decorative SVGs, ARIA values, positive tabindex, nested
  interactive elements, table captions, labelled dialogs and landmarks,
  progressive-enhancement conventions (JS-only controls ship `hidden`).
- **Contrast** (`tests/checks/contrast.mjs`): text 4.5:1, UI and chart
  marks 3:1, for the base tokens and every `data-brand` preset.
- **Browser** (`tests/browser/smoke.mjs`): console/CSP errors, keyboard
  behaviour of menus, tabs, dialogs, charts, chat, data grid and forms.

Automated checks catch roughly a third of WCAG issues. For new or changed
UI, also walk through the manual checklist in `docs/ACCESSIBILITY.md`
(keyboard only, screen reader, 400% zoom, forced colours).
