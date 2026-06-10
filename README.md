# Compass

The Jekyll theme behind Atlas, the research site [Scout](https://github.com/Laoujin/Scout) populates. Holds the layouts, includes, palettes, skeletons, and card variants. Atlas repos consume it as a git submodule at `compass/`; standalone it's a working site with one dummy `research/` entry for previewing.

## Preview the theme

Published gallery (layout / card / palette picker), rebuilt on push to `main`: **<https://laoujin.github.io/Compass/>**

Locally — same picker, rebuilds each combo on demand (Python 3 + Docker):

```bash
python gallery-server.py            # http://localhost:4000/  (py on Windows)
PORT=8080 python gallery-server.py
```

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

```bash
git submodule add https://github.com/Laoujin/Compass.git compass
```

```yaml
# Atlas _config.yml
layouts_dir: compass/_layouts
includes_dir: compass/_includes
assets_base: /compass/assets
```

Bump: `git submodule update --remote compass && git commit -am "bump compass"`.
