# Compass

The Jekyll theme used by Atlas — the static research site that [Scout](https://github.com/Laoujin/Scout) populates.

Compass holds the layouts, includes, palettes, skeletons, and card variants. Atlas repos consume it as a git submodule at `compass/` and override `layouts_dir` / `includes_dir` in their `_config.yml`. This repo is a fully working Jekyll site on its own — there's one dummy research entry under `research/` purely so the layouts can be previewed without any real content.

## Preview the theme

The published gallery lives at **<https://laoujin.github.io/Compass/>** — an interactive picker (layout / card / palette dropdowns) over the sample research content, rebuilt on every push to `main`.

To run it locally, `gallery-server.py` (Python 3, requires Docker) serves the same picker but builds each `skeleton-card` combo on demand and rebuilds on every refresh, so local edits show up immediately (~1.5 s) with no upfront 42-combo wait.

```bash
python gallery-server.py            # http://localhost:4000/
PORT=8080 python gallery-server.py
```

On Windows use `py gallery-server.py` if `python` isn't on PATH.

## Layout

```txt
_layouts/      default.html, research.html
_includes/
  entries.html       shared filter — sets {entries, featured, entry_count}
  sites/sN.html      home-page skeletons (s1..s6)
  cards/vN.html      research-card variants (v1..v7)
assets/
  base.css           shared rules
  palettes/*.css     colour palettes
  sites/*.css        per-skeleton styles
  cards/*.css        per-card-variant styles
research/      dummy entry, only used for previewing layouts
```

## Consumed by Atlas

In an Atlas repo:

```bash
git submodule add https://github.com/Laoujin/Compass.git compass
```

Atlas's `_config.yml` then sets:

```yaml
layouts_dir: compass/_layouts
includes_dir: compass/_includes
assets_base: /compass/assets
```

To pull layout updates into an Atlas: `git submodule update --remote compass && git commit -am "bump compass"`.
