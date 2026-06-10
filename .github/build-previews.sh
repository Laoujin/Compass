#!/usr/bin/env bash
# Build the full Compass variant gallery into _site/ for GitHub Pages.
# Mirrors serve.ps1: every skeleton / palette / card variant is built into its own
# subdir under its own baseurl, and a landing index links to them all. Each variant
# only overrides the one config key it sweeps (others stay at _config.yml defaults),
# so e.g. the palette sweep renders skeleton s1 / card v1 with each palette in turn.
# Served at https://<owner>.github.io<PAGES_BASE>/  (PAGES_BASE defaults to /Compass).
set -euo pipefail

SITE_BASE="${PAGES_BASE:-/Compass}"
OUT="_site"
rm -rf "$OUT"; mkdir -p "$OUT"
# NOTE: the .yml suffix is required — Jekyll's --config silently ignores a config
# file without a .yml/.yaml extension ("Error reading configuration. Using defaults"),
# which would build every variant with the default skeleton.
OVERRIDE="$(mktemp --suffix=.yml)"
trap 'rm -f "$OVERRIDE"' EXIT

skeletons=(s1 s2 s3 s4 s5 s6)
palettes=(rust paper cartography midnight minimal fieldnotes solarized nord)
cards=(v1 v2 v3 v4 v5 v6 v7)

declare -A label=(
  [s1]="Hero + footer"  [s2]="Top bar + footer" [s3]="Top bar + sidenav"
  [s4]="Split hero"     [s5]="Magazine cover"   [s6]="Terminal frame"
  [rust]="Warm rust"    [paper]="Paper & ink"   [cartography]="Cartography"
  [midnight]="Midnight" [minimal]="Minimal"     [fieldnotes]="Field notes"
  [solarized]="Solarized" [nord]="Nord"
  [v1]="Image-top"      [v2]="Horizontal"       [v3]="Hero overlay"
  [v4]="Terminal"       [v5]="Index card"       [v6]="No-image"  [v7]="Compact row"
)

# build_variant <config-key> <dir-prefix> <variant>
build_variant() {
  local key="$1" prefix="$2" v="$3" dir="${2}${3}"
  printf '%s: %s\n' "$key" "$v" > "$OVERRIDE"
  echo "::group::build $key=$v -> $dir"
  bundle exec jekyll build \
    --config "_config.yml,$OVERRIDE" \
    --baseurl "$SITE_BASE/$dir" \
    -d "$OUT/$dir"
  echo "::endgroup::"
}

for v in "${skeletons[@]}"; do build_variant skeleton ""      "$v"; done
for v in "${palettes[@]}";  do build_variant palette  "pal-"  "$v"; done
for v in "${cards[@]}";     do build_variant card     "card-" "$v"; done

# Landing index. Links are relative to _site/ (served at SITE_BASE/), so no need to
# hardcode the base path here.
section() {
  local title="$1" prefix="$2"; shift 2
  printf '<h2>%s</h2><div class="grid">\n' "$title"
  for v in "$@"; do
    printf '<a href="%s%s/"><b>%s</b><small>%s</small></a>\n' \
      "$prefix" "$v" "$v" "${label[$v]:-$v}"
  done
  printf '</div>\n'
}

{
  cat <<'HTML'
<!doctype html><html lang=en><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Compass — theme previews</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:2rem 1.25rem;color:#1a1a1a}
  h1{margin:0 0 .25rem} p.lede{margin:0 0 2rem;color:#666}
  h2{margin:2rem 0 .5rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.1em;color:#888}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.5rem}
  a{display:flex;flex-direction:column;padding:.6rem .75rem;border:1px solid #e2e2e2;border-radius:8px;
    text-decoration:none;color:#1a1a1a;transition:.12s}
  a:hover{border-color:#999;background:#fafafa}
  a small{color:#888;margin-top:.15rem}
  footer{margin-top:3rem;padding-top:1.25rem;border-top:1px solid #e2e2e2;
    display:flex;gap:1.5rem;flex-wrap:wrap;font-size:.9rem}
  footer a{display:inline;border:0;padding:0;border-radius:0;color:#555}
  footer a:hover{color:#000;background:none}
</style>
<h1>Compass theme previews</h1>
<p class=lede>Every skeleton, palette, and card variant built against the sample research content.</p>
HTML
  section "Skeletons" ""      "${skeletons[@]}"
  section "Palettes"  "pal-"  "${palettes[@]}"
  section "Cards"     "card-" "${cards[@]}"
  cat <<'HTML'
<footer>
  <a href="https://laoujin.github.io/Scout/" target="_blank" rel="noopener">Scout — marketing site ↗</a>
  <a href="https://github.com/Laoujin/Compass" target="_blank" rel="noopener">Compass on GitHub ↗</a>
</footer>
HTML
} > "$OUT/index.html"

echo "Built $(( ${#skeletons[@]} + ${#palettes[@]} + ${#cards[@]} )) variants into $OUT/"
