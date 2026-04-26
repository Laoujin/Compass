# Compass

The Jekyll theme used by Atlas — the static research site that [Scout](https://github.com/Laoujin/Scout) populates.

Compass holds the layouts, includes, palettes, skeletons, and card variants. Atlas repos consume it as a git submodule at `compass/` and override `layouts_dir` / `includes_dir` in their `_config.yml`. This repo is a fully working Jekyll site on its own — there's one dummy research entry under `research/` purely so the layouts can be previewed without any real content.

## Run locally

Either via bundle (Ruby ≥ 3.0):

```bash
bundle install
bundle exec jekyll serve
```

Or via Docker (no local Ruby needed):

```bash
docker run --rm -p 4000:4000 -v "$PWD:/srv/jekyll" jekyll/jekyll:4 jekyll serve --host 0.0.0.0
```

Open http://localhost:4000/Atlas/ (the `baseurl` is `/Atlas` for parity with deployed Atlas sites — change `_config.yml` if you want it at root).

## Preview every variant at once

`serve.ps1` (PowerShell, requires Docker) builds every skeleton / palette / card into its own subdir of `_previews/` and serves the lot:

```powershell
./serve.ps1                    # sweep skeletons (s1..s6)
./serve.ps1 -Sweep palettes    # sweep all palettes with current skeleton
./serve.ps1 -Sweep cards       # sweep all cards
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
