#!/usr/bin/env bash
# ============================================================================
# audit-a11y.sh — accessibility audit (WCAG 2.2 AA oriented)
#
# 1. Static audit of every HTML file: names, labels, alt text, ARIA values,
#    landmarks, headings, tables, focus order hazards, progressive enhancement.
# 2. Colour contrast of every design-token pair in light and dark themes.
# 3. Browser checks (if Playwright is available): keyboard interaction, focus
#    management, live behaviour, no-JS baseline and 320px reflow.
#
# Usage:
#   bash .claude/skills/audit-a11y.sh             run everything available
#   bash .claude/skills/audit-a11y.sh --static    skip browser checks
#   bash .claude/skills/audit-a11y.sh --require   fail if Playwright is missing
#
# Automated checks catch roughly a third of WCAG issues. Always finish with
# the manual checklist in docs/ACCESSIBILITY.md (keyboard + screen reader).
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

STATIC_ONLY=0
browser_args=()
for arg in "$@"; do
  case "$arg" in
    --static) STATIC_ONLY=1 ;;
    --require) browser_args+=(--require) ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

status=0

echo "== Static accessibility audit + contrast =="
node tests/run-all.mjs --only a11y,contrast || status=1

if [[ $STATIC_ONLY -eq 0 ]]; then
  echo
  echo "== Browser accessibility checks =="
  node tests/browser/smoke.mjs "${browser_args[@]}" || status=1
fi

exit $status
