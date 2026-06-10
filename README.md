# Compass

The Jekyll theme behind Atlas, the research site [Scout](https://github.com/Laoujin/Scout) populates. Holds the layouts, includes, palettes, skeletons, and card variants. Atlas repos consume it as a git submodule at `compass/`; standalone it's a working site with some dummy `research/` entries for previewing.

## Preview the theme

[Published gallery](https://laoujin.github.io/Compass) (layout / card / palette picker)

```bash
# http://localhost:4000/
python gallery-server.py
PORT=8080 python gallery-server.py
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
