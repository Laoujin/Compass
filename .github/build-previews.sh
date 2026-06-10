#!/usr/bin/env bash
# Build the interactive Compass gallery into _site/ for GitHub Pages.
# Every skeleton×card combo is server-rendered into its own subdir (v7's markup
# diverges from v1–v6, so cards can't be CSS-swapped); _gallery.html is the landing
# page and swaps palette client-side. Mirrors the local gallery-server.py, minus the
# on-demand rebuild. Served at https://<owner>.github.io<PAGES_BASE>/  (default /Compass).
set -euo pipefail

SITE_BASE="${PAGES_BASE:-/Compass}"
OUT="_site"
rm -rf "$OUT"; mkdir -p "$OUT"

# NOTE: the .yml suffix is required — Jekyll's --config silently ignores a config
# file without a .yml/.yaml extension ("Error reading configuration. Using defaults"),
# which would build every combo with the default skeleton/card.
OVERRIDE="$(mktemp --suffix=.yml)"
trap 'rm -f "$OVERRIDE"' EXIT

skeletons=(s1 s2 s3 s4 s5 s6)
cards=(v1 v2 v3 v4 v5 v6 v7)

for s in "${skeletons[@]}"; do
  for c in "${cards[@]}"; do
    dir="$s-$c"
    printf 'skeleton: %s\ncard: %s\n' "$s" "$c" > "$OVERRIDE"
    echo "::group::build $dir"
    bundle exec jekyll build \
      --config "_config.yml,$OVERRIDE" \
      --baseurl "$SITE_BASE/$dir" \
      -d "$OUT/$dir"
    echo "::endgroup::"
  done
done

# Landing page = the interactive picker; its favicon/OG assets sit alongside it.
cp _gallery.html "$OUT/index.html"
cp gallery-favicon.png gallery-og.png "$OUT/"

echo "Built ${#skeletons[@]}×${#cards[@]} = $(( ${#skeletons[@]} * ${#cards[@]} )) combos into $OUT/"
