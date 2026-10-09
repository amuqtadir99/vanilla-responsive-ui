#!/usr/bin/env bash
# ============================================================================
# validate-w3c.sh — W3C conformance + repository standards
#
# 1. Nu HTML Checker (the engine behind validator.w3.org/nu) validates every
#    HTML document, every component snippet (wrapped in a minimal document),
#    every stylesheet and every SVG — fully offline.
# 2. The zero-dependency static suites (HTML, CSS, JS standards).
#
# Usage:
#   bash .claude/skills/validate-w3c.sh            validate
#   bash .claude/skills/validate-w3c.sh --install  download vnu.jar to .cache/ first
#   bash .claude/skills/validate-w3c.sh --require  fail if the Nu checker is unavailable
#
# The Nu checker needs Java 11+ and vnu.jar. It is found via $VNU_JAR, a
# `vnu` binary on PATH, or .cache/vnu.jar (git-ignored). Known validator gaps
# for modern CSS and info-level notes are filtered via tests/vnu-filters.txt.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

INSTALL=0
REQUIRE=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    --require) REQUIRE=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

VNU_URL="https://github.com/validator/validator/releases/latest/download/vnu.jar"
CACHE_JAR="$ROOT/.cache/vnu.jar"
FILTERS="$ROOT/tests/vnu-filters.txt"
status=0

if [[ $INSTALL -eq 1 && ! -f "$CACHE_JAR" ]]; then
  echo "→ Downloading Nu HTML Checker to .cache/vnu.jar"
  mkdir -p "$ROOT/.cache"
  curl -fsSL -o "$CACHE_JAR" "$VNU_URL"
fi

vnu=()
if [[ -n "${VNU_JAR:-}" && -f "$VNU_JAR" ]] && command -v java >/dev/null; then
  vnu=(java -jar "$VNU_JAR")
elif command -v vnu >/dev/null; then
  vnu=(vnu)
elif [[ -f "$CACHE_JAR" ]] && command -v java >/dev/null; then
  vnu=(java -jar "$CACHE_JAR")
fi

echo "== W3C validation (Nu HTML Checker) =="
if [[ ${#vnu[@]} -eq 0 ]]; then
  echo "⚠ Nu HTML Checker not found. Run with --install (needs Java 11+) or set VNU_JAR."
  [[ $REQUIRE -eq 1 ]] && exit 1
else
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  mapfile -t docs < <(grep -rliE '^\s*(<!--.*-->\s*)*<!doctype html>' src --include='*.html' | sort)
  mapfile -t snippets < <({ find src/components -maxdepth 1 -name '*.html' ! -name 'index.html'; find src/blocks -maxdepth 1 -name '*.html'; } | sort)

  # Wrap each snippet in a minimal valid document so it can be validated.
  wrapped=()
  for snippet in "${snippets[@]}"; do
    out="$tmp/$(basename "$(dirname "$snippet")")__$(basename "$snippet")"
    {
      printf '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n</head>\n<body>\n<main>\n' "$(basename "$snippet")"
      cat "$snippet"
      printf '\n</main>\n</body>\n</html>\n'
    } > "$out"
    wrapped+=("$out")
  done

  mapfile -t styles < <(find src -name '*.css' | sort)
  mapfile -t svgs < <(find src -name '*.svg' | sort)

  run_vnu() {
    local label="$1"; shift
    local output
    if output="$("${vnu[@]}" --format gnu --filterfile "$FILTERS" "$@" 2>&1)"; then
      echo "✓ $label"
    else
      echo "✗ $label"
      echo "$output" | grep -v '^Picked up JAVA_TOOL_OPTIONS' | sed "s#file:$tmp/\([a-z]*\)__#src/\1/#; s#file:$ROOT/##"
      status=1
    fi
  }

  run_vnu "HTML documents (${#docs[@]})" --html "${docs[@]}"
  run_vnu "Component and block snippets (${#wrapped[@]})" --html "${wrapped[@]}"
  run_vnu "Stylesheets (${#styles[@]})" --css "${styles[@]}"
  run_vnu "SVG files (${#svgs[@]})" --svg "${svgs[@]}"
fi

echo
echo "== Repository standards (HTML, CSS, JS) =="
node tests/run-all.mjs --only html,css,js || status=1

exit $status
