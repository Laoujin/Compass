# Compass Research Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side filtering (free text + tag + series + series-category) to the Atlas/Compass research pages — the home page (all six skeletons) and the series detail pages — with shareable URL state.

**Architecture:** Pure static enhancement. Every card already shares `cards/_base.html`, so we stamp filter `data-*` attributes there once. The home grid keeps collapsing each series into a single card but now *also* emits its (hidden) member cards; one `filters.js` toggles the grid between **collapsed** (no filter) and **flat** (any filter) and shows/hides individual cards by matching their `data-*`. Series pages already render members individually grouped by category `<h2>`, so they filter in place and hide empty groups. Facet option lists (tags, series, categories) are populated by JS from the cards present on the page — a single source of truth that auto-scopes per page. Filters mirror to `?q=&tag=&series=&cat=` via `history.replaceState`.

**Tech Stack:** Jekyll (Liquid templates, kramdown), vanilla ES5-compatible JS, plain CSS. No build step beyond Jekyll, no JS libraries. Verified by building the site and driving it with Playwright.

**Deviation from spec (intentional):** the spec said facet option lists are generated server-side in Liquid. This plan instead populates the series/category `<select>`s and tag chips in JS from the cards' `data-*` on init. Same UX, but it's DRY (cards are the only source), auto-scopes to whatever is on the page, and skips empty categories (e.g. `Hong Kong`) for free. The bar markup stays static; the data layer stays in Liquid.

---

## Build & verify helper (used by many tasks)

The work tree is the **compass submodule inside atlas**: `atlas/compass/`. Real series + entries live in `atlas/`, which consumes compass at `assets_base: /compass/assets`. So edits to `atlas/compass/...` are picked up by building the **atlas** site.

Absolute paths (this machine):
- atlas root: `/mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas`
- compass:   `…/atlas/compass`

**Build via Docker** (the local Ruby `bundle` shim is a Windows binary that can't exec under
WSL — use Docker; `-u 0` avoids drvfs `_site` permission errors):
```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
docker run --rm -u 0 -v "$PWD:/srv/jekyll" jekyll/jekyll:4 sh -c "jekyll build"
```

**Build a specific skeleton** without editing `_config.yml`. The override file must live
**inside** the mounted volume (`atlas/`) so the container sees it:
```bash
printf 'skeleton: s1\n' > _skel.yml   # in the atlas root
docker run --rm -u 0 -v "$PWD:/srv/jekyll" jekyll/jekyll:4 \
  sh -c "jekyll build --config _config.yml,/srv/jekyll/_skel.yml"
```
(swap `s1` for `s2`…`s6`; `rm _skel.yml` when done — don't commit it).

Built output lands in `atlas/_site/`. A series page is at
`atlas/_site/series/michelin-weekends/index.html`; the home page at `atlas/_site/index.html`.

All `git` commands in this plan run inside `atlas/compass` (that's the repo the theme files belong to):
```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
```

---

## File structure

| File | Action | Responsibility |
|------|--------|----------------|
| `_includes/entries.html` | modify | add `entry_category_map` (entry slug → group label) |
| `_includes/cards/_base.html` | modify | stamp `data-*` on the shared `<article class="card">` |
| `_includes/series-card.html` | modify | stamp `data-kind="series" data-series` |
| `_includes/grid-with-series.html` | modify | also emit hidden member cards (home flat support) |
| `_includes/listing-with-series.html` | modify | wrap s6 home rows in `.filter-item`, stamp `data-*`, emit members |
| `_includes/filter-bar.html` | create | the bar markup (static; `scope` param) |
| `assets/filters.css` | create | collapsed/flat/hidden rules + bar styling |
| `assets/filters.js` | create | filter engine: read state, match, toggle, count, clear, URL sync |
| `_includes/sites/s1.html` … `s5.html` | modify | link css/js; insert bar in both branches; drop old nav (s1, s3) |
| `_includes/sites/s6.html` | modify | link css/js; insert bar both branches; wrap series rows in `.filter-item`/`.series-group`, stamp `data-*` |

---

## Task 1: Data layer — `entry_category_map`

**Files:**
- Modify: `_includes/entries.html` (the series-membership map block near the end)

- [ ] **Step 1: Add the category map alongside the existing maps**

In `_includes/entries.html`, find the three `assign … = ""` initializers:

```liquid
{%- assign entry_series_map = "" -%}
{%- assign series_count_map = "" -%}
{%- assign series_anymember_map = "" -%}
```

Replace with (adds one more):

```liquid
{%- assign entry_series_map = "" -%}
{%- assign entry_category_map = "" -%}
{%- assign series_count_map = "" -%}
{%- assign series_anymember_map = "" -%}
```

- [ ] **Step 2: Populate it inside the group loop**

Still in `entries.html`, the series loop builds `_members` from `_s.groups`. Replace this block:

```liquid
  {%- if _s.groups -%}
    {%- for _g in _s.groups -%}
      {%- for _mslug in _g.entries -%}
        {%- assign _members = _members | push: _mslug -%}
      {%- endfor -%}
    {%- endfor -%}
  {%- elsif _s.entries -%}
```

with (records each member's group label into `entry_category_map`):

```liquid
  {%- if _s.groups -%}
    {%- for _g in _s.groups -%}
      {%- for _mslug in _g.entries -%}
        {%- assign _members = _members | push: _mslug -%}
        {%- assign _cat_needle = "," | append: _mslug | append: "=" -%}
        {%- assign _cat_check = "," | append: entry_category_map -%}
        {%- unless _cat_check contains _cat_needle -%}
          {%- assign entry_category_map = entry_category_map | append: _mslug | append: "=" | append: _g.label | append: "," -%}
        {%- endunless -%}
      {%- endfor -%}
    {%- endfor -%}
  {%- elsif _s.entries -%}
```

- [ ] **Step 3: Prefix the map with a leading comma (mirrors the others)**

Find:

```liquid
{%- assign entry_series_map = "," | append: entry_series_map -%}
```

Add directly below it:

```liquid
{%- assign entry_category_map = "," | append: entry_category_map -%}
```

- [ ] **Step 4: Build and verify the map is computed (no output regression)**

Run the **Build** helper (default s5). Expected: build completes with no Liquid errors. The map itself isn't rendered yet, so just confirm a clean build:
```bash
ls -la /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/_site/index.html
```
Expected: file exists, freshly written.

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/entries.html
git commit -m "feat(filtering): map each entry to its series group label"
```

---

## Task 2: Stamp filter data-* on cards

**Files:**
- Modify: `_includes/cards/_base.html` (the `<article class="card">` root)
- Modify: `_includes/series-card.html` (the `<article class="card card--series">` root)

- [ ] **Step 1: Compute slug, series, category, search string in `_base.html`**

In `_includes/cards/_base.html`, find the line:

```liquid
{%- assign is_expedition = false -%}
{%- if e.children or depth_label == 'expedition' -%}{%- assign is_expedition = true -%}{%- endif -%}
```

Insert directly **after** it:

```liquid
{%- comment -%} Filter metadata (read maps set by entries.html) {%- endcomment -%}
{%- assign _fseg = e.url | split: '/' -%}
{%- assign _fslug = _fseg[2] -%}
{%- assign _fseries = "" -%}
{%- assign _fslookup = "," | append: _fslug | append: "=" -%}
{%- if entry_series_map contains _fslookup -%}
  {%- assign _fseries = entry_series_map | split: _fslookup | last | split: "," | first -%}
{%- endif -%}
{%- assign _fcat = "" -%}
{%- if entry_category_map contains _fslookup -%}
  {%- assign _fcat = entry_category_map | split: _fslookup | last | split: "," | first -%}
{%- endif -%}
{%- assign _ftags = e.tags | join: "," | downcase -%}
{%- capture _fsearch -%}{{ e.title }} {{ e.summary }} {{ e.topic }} {{ e.tags | join: " " }}{%- endcapture -%}
{%- assign _fsearch = _fsearch | downcase | strip_newlines | replace: '"', '' -%}
```

- [ ] **Step 2: Add the attributes to the `<article>`**

In the same file, find:

```liquid
<article class="card{% if is_expedition %} card-expedition{% endif %}" style="--h:{{ e.hue | default: 210 }};">
```

Replace with:

```liquid
<article class="card{% if is_expedition %} card-expedition{% endif %}" style="--h:{{ e.hue | default: 210 }};"
  data-kind="entry" data-slug="{{ _fslug }}" data-tags="{{ _ftags }}"
  data-series="{{ _fseries }}" data-category="{{ _fcat | downcase }}" data-search="{{ _fsearch | escape }}">
```

- [ ] **Step 3: Tag the series card**

In `_includes/series-card.html`, find:

```liquid
<article class="card card--series" style="--h:280;">
```

Replace with:

```liquid
<article class="card card--series" style="--h:280;" data-kind="series" data-series="{{ s.slug }}">
```

- [ ] **Step 4: Build and verify attributes are present in the rendered HTML**

Run the **Build** helper, then:
```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
grep -o 'data-kind="entry"[^>]*data-category="[^"]*"' _site/series/michelin-weekends/index.html | head -3
```
Expected: lines showing `data-kind="entry"` with a non-empty `data-category` (e.g. `Belgium`, `France`). Also:
```bash
grep -c 'data-kind="series"' _site/index.html
```
Expected: `≥ 1` (the home page has at least the michelin-weekends series card).

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/cards/_base.html _includes/series-card.html
git commit -m "feat(filtering): stamp filter data attributes on cards"
```

---

## Task 3: Home grid emits hidden member cards

**Files:**
- Modify: `_includes/grid-with-series.html`

Currently the include emits a series card and **skips** its members (`{%- comment -%} Member … skip {%- endcomment -%}`). We change it to also emit each member card with an `is-series-member` marker class, so `filters.js` can reveal them in flat mode. The marker class is added by wrapping the member card include — but cards render their own `<article>`, so instead we add the class via a wrapper `<div class="filter-item is-series-member">` so grid layout is unaffected (the card stays the grid item through `display:contents`).

- [ ] **Step 1: Replace the "already emitted member" skip branch**

In `_includes/grid-with-series.html`, find:

```liquid
  {%- elsif _series_slug != "" and _already_emitted -%}
    {%- comment -%} Member of a series already emitted — skip {%- endcomment -%}
  {%- else -%}
    {%- include {{ _card_path }} entry=e -%}
  {%- endif -%}
```

Replace with:

```liquid
  {%- elsif _series_slug != "" and _already_emitted -%}
    {%- comment -%} Member of an already-emitted series: emit hidden, for flat filtering {%- endcomment -%}
    <div class="filter-item is-series-member">{%- include {{ _card_path }} entry=e -%}</div>
  {%- else -%}
    {%- include {{ _card_path }} entry=e -%}
  {%- endif -%}
```

- [ ] **Step 2: Also wrap the member that triggers the series card**

Still in `grid-with-series.html`, members whose series has **not** yet been emitted currently emit only the series card. The triggering member itself must also appear (hidden) so flat mode can show it. Find this branch (the non-first one):

```liquid
  {%- elsif _series_slug != "" and _already_emitted == false -%}
    {%- assign _s_obj = site.data.series | where: "slug", _series_slug | first -%}
    {%- assign _cnt_lookup = "," | append: _series_slug | append: "=" -%}
    {%- assign _cnt_after = series_count_map | split: _cnt_lookup | last -%}
    {%- assign _cnt = _cnt_after | split: "," | first | plus: 0 -%}
    {%- include series-card.html series=_s_obj newest=e count=_cnt -%}
    {%- assign _emitted_series = _emitted_series | append: _series_slug | append: "," -%}
```

Replace with (adds the hidden member card after the series card):

```liquid
  {%- elsif _series_slug != "" and _already_emitted == false -%}
    {%- assign _s_obj = site.data.series | where: "slug", _series_slug | first -%}
    {%- assign _cnt_lookup = "," | append: _series_slug | append: "=" -%}
    {%- assign _cnt_after = series_count_map | split: _cnt_lookup | last -%}
    {%- assign _cnt = _cnt_after | split: "," | first | plus: 0 -%}
    {%- include series-card.html series=_s_obj newest=e count=_cnt -%}
    <div class="filter-item is-series-member">{%- include {{ _card_path }} entry=e -%}</div>
    {%- assign _emitted_series = _emitted_series | append: _series_slug | append: "," -%}
```

- [ ] **Step 3: Handle the first (latest) item when it is a series member**

Find the `forloop.first` block:

```liquid
  {%- if forloop.first -%}
    {%- unless _skip_first == "true" -%}
      {%- include {{ _card_path }} entry=e -%}
    {%- endunless -%}
    {%- if _series_slug != "" and _already_emitted == false -%}
```

Replace the inner card include so that, when the first item belongs to a series, its card is emitted as a hidden member (the series card represents it in collapsed mode):

```liquid
  {%- if forloop.first -%}
    {%- unless _skip_first == "true" -%}
      {%- if _series_slug != "" -%}
        <div class="filter-item is-series-member">{%- include {{ _card_path }} entry=e -%}</div>
      {%- else -%}
        {%- include {{ _card_path }} entry=e -%}
      {%- endif -%}
    {%- endunless -%}
    {%- if _series_slug != "" and _already_emitted == false -%}
```

> Note: when `_skip_first == "true"` (s5 hero), the first card is intentionally suppressed; its series card still emits below. That member won't be flat-filterable on s5, which is acceptable — it's the hero entry, always visible above the grid.

- [ ] **Step 4: Build and verify members now render on the home page**

Run the **Build** helper, then:
```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
grep -c 'filter-item is-series-member' _site/index.html
```
Expected: a number ≥ 50 (every michelin member now present but wrapped). Without filtering CSS yet they'd show; that's fixed in Task 6.

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/grid-with-series.html
git commit -m "feat(filtering): emit hidden series-member cards in home grid"
```

---

## Task 4: s6 home listing — wrap rows, stamp data, emit members

**Files:**
- Modify: `_includes/listing-with-series.html`

s6 home rows are four bare `<span class="s6-cell">` per row in a CSS grid. Wrap each row's four cells in a single `<div class="filter-item" data-*>` so each row is one toggleable element while staying in the grid. The series-summary row gets `data-kind="series"`; member rows get `data-kind="entry"` + `is-series-member`.

- [ ] **Step 1: Add a reusable data-attribute capture at the top of the loop**

In `_includes/listing-with-series.html`, find the loop start:

```liquid
{%- for e in include.items -%}
  {%- assign _segs = e.url | split: '/' -%}
  {%- assign _slug = _segs[2] -%}
```

Insert after `_slug` is set:

```liquid
  {%- assign _row_cat = "" -%}
  {%- assign _ccheck = "," | append: _slug | append: "=" -%}
  {%- if entry_category_map contains _ccheck -%}
    {%- assign _row_cat = entry_category_map | split: _ccheck | last | split: "," | first -%}
  {%- endif -%}
  {%- assign _row_tags = e.tags | join: "," | downcase -%}
  {%- capture _row_search -%}{{ e.title }} {{ e.summary }} {{ e.topic }} {{ e.tags | join: " " }}{%- endcapture -%}
  {%- assign _row_search = _row_search | downcase | strip_newlines | replace: '"', '' -%}
  {%- capture _row_attrs -%}data-kind="entry" data-slug="{{ _slug }}" data-tags="{{ _row_tags }}" data-series="{{ _series_slug }}" data-category="{{ _row_cat | downcase }}" data-search="{{ _row_search | escape }}"{%- endcapture -%}
```

> `_series_slug` is computed a few lines below in the original; move the `_row_attrs` capture to **after** the existing `_series_slug` assignment block so it picks up the value. Concretely: place the four `_row_*` / `_row_attrs` lines immediately **below** the existing `{%- if entry_series_map contains _lookup -%}…{%- endif -%}` that sets `_series_slug`.

- [ ] **Step 2: Wrap the standalone-entry row**

Find the final `{%- else -%}` branch (a plain entry row):

```liquid
  {%- else -%}
    <span class="s6-cell date">{{ e.date | date: "%Y-%m-%d" }}</span>
    <span class="s6-cell depth-cell">{{ _depth_label }}</span>
    <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title | slugify | truncate: 40, "" }}</a></span>
    <span class="s6-cell">{{ e.citations | default: 0 }} · {{ e.reading_time_min | default: 0 }}m</span>
  {%- endif -%}
```

Replace with:

```liquid
  {%- else -%}
    <div class="filter-item" {{ _row_attrs }}>
    <span class="s6-cell date">{{ e.date | date: "%Y-%m-%d" }}</span>
    <span class="s6-cell depth-cell">{{ _depth_label }}</span>
    <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title | slugify | truncate: 40, "" }}</a></span>
    <span class="s6-cell">{{ e.citations | default: 0 }} · {{ e.reading_time_min | default: 0 }}m</span>
    </div>
  {%- endif -%}
```

- [ ] **Step 3: Wrap the series-summary rows with `data-kind="series"`**

There are two identical series-row emissions (one in the `forloop.first` block, one in the `elsif … _already_emitted == false` block). Each looks like:

```liquid
      <span class="s6-cell date">{{ e.date | date: "%Y-%m-%d" }}</span>
      <span class="s6-cell depth-cell">series</span>
      <span class="s6-cell series-cell"><a href="{{ '/series/' | append: _series_slug | append: '/' | relative_url }}"><span class="series-arrow">↳</span>{{ _s_obj.slug }}/</a></span>
      <span class="s6-cell">{{ _cnt }} {% if _cnt == 1 %}entry{% else %}entries{% endif %}</span>
```

Wrap **each** of the two with a series wrapper:

```liquid
      <div class="filter-item" data-kind="series" data-series="{{ _series_slug }}">
      <span class="s6-cell date">{{ e.date | date: "%Y-%m-%d" }}</span>
      <span class="s6-cell depth-cell">series</span>
      <span class="s6-cell series-cell"><a href="{{ '/series/' | append: _series_slug | append: '/' | relative_url }}"><span class="series-arrow">↳</span>{{ _s_obj.slug }}/</a></span>
      <span class="s6-cell">{{ _cnt }} {% if _cnt == 1 %}entry{% else %}entries{% endif %}</span>
      </div>
```

- [ ] **Step 4: Emit hidden member rows (mirror Task 3 for s6)**

Replace the skip branch:

```liquid
  {%- elsif _series_slug != "" and _already_emitted -%}
    {%- comment -%} Skip member of already-emitted series {%- endcomment -%}
```

with a hidden member row:

```liquid
  {%- elsif _series_slug != "" and _already_emitted -%}
    {%- comment -%} Member of an already-emitted series: emit hidden for flat filtering {%- endcomment -%}
    <div class="filter-item is-series-member" {{ _row_attrs }}>
    <span class="s6-cell date">{{ e.date | date: "%Y-%m-%d" }}</span>
    <span class="s6-cell depth-cell">{{ _depth_label }}</span>
    <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title | slugify | truncate: 40, "" }}</a></span>
    <span class="s6-cell">{{ e.citations | default: 0 }} · {{ e.reading_time_min | default: 0 }}m</span>
    </div>
```

Also, in the `elsif … _already_emitted == false` branch (the one that emits the series summary row), append a hidden member row for the triggering member right after the series `</div>` wrapper you added in Step 3:

```liquid
    <div class="filter-item is-series-member" {{ _row_attrs }}>
    <span class="s6-cell date">{{ e.date | date: "%Y-%m-%d" }}</span>
    <span class="s6-cell depth-cell">{{ _depth_label }}</span>
    <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title | slugify | truncate: 40, "" }}</a></span>
    <span class="s6-cell">{{ e.citations | default: 0 }} · {{ e.reading_time_min | default: 0 }}m</span>
    </div>
```

- [ ] **Step 5: Build s6 and verify**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
printf 'skeleton: s6\n' > /tmp/skel.yml
/mnt/c/tools/ruby34/bin/bundle exec jekyll build --config _config.yml,/tmp/skel.yml
grep -c 'filter-item is-series-member' _site/index.html
grep -o 'data-kind="series" data-series="[^"]*"' _site/index.html | head -2
```
Expected: member count ≥ 50; at least one `data-kind="series"` row.

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/listing-with-series.html
git commit -m "feat(filtering): wrap and stamp s6 listing rows for filtering"
```

---

## Task 5: Filter bar include

**Files:**
- Create: `_includes/filter-bar.html`

Static markup; JS fills the tag chips and selects. `scope` controls whether the series `<select>` renders. Starts `hidden` so no-JS visitors never see dead controls.

- [ ] **Step 1: Create the include**

Create `_includes/filter-bar.html`:

```liquid
{%- comment -%}
Shared filter bar. Inputs:
  include.scope — "home" (default) | "series"
JS (assets/filters.js) populates tag chips and the series/category selects from
the cards present on the page, and toggles visibility. Hidden until JS runs.
{%- endcomment -%}
{%- assign _scope = include.scope | default: 'home' -%}
<div class="filter-bar" data-scope="{{ _scope }}" hidden>
  <input class="filter-search js-filter-search" type="search" placeholder="Search research…" aria-label="Search research">
  <div class="filter-tags js-filter-tags" role="group" aria-label="Filter by tag"></div>
  {%- if _scope != 'series' -%}
  <select class="filter-select js-filter-series" aria-label="Filter by series">
    <option value="">All series</option>
  </select>
  {%- endif -%}
  <select class="filter-select js-filter-category" aria-label="Filter by category">
    <option value="">All categories</option>
  </select>
  <span class="filter-count"><strong class="js-filter-count">0</strong> shown</span>
  <button type="button" class="filter-clear js-filter-clear">Clear</button>
</div>
```

- [ ] **Step 2: Verify it renders nothing visible yet (no skeleton wires it in)**

No build assertion here — the include isn't referenced until Task 8. Skip to commit.

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/filter-bar.html
git commit -m "feat(filtering): add shared filter-bar include"
```

---

## Task 6: Filter CSS

**Files:**
- Create: `assets/filters.css`

- [ ] **Step 1: Create the stylesheet**

Create `assets/filters.css`:

```css
/* --- visibility engine ------------------------------------------------ */
/* IMPORTANT: this whole engine is CLASS-BASED (no inline styles on the
   wrappers). The `.filter-item` wrappers MUST NOT carry inline display:contents
   — inline styles outrank class selectors and would defeat the hide/reveal
   rules below. The wrappers are layout-transparent via the rule here instead.
   Ordering matters: `.is-series-member` must come AFTER `.filter-item` so it
   wins by source order. */

/* Bar is inert until JS removes [hidden]. */
.filter-bar[hidden] { display: none; }

/* Row/member wrappers are layout-transparent so the card (entry-grid) or the
   cells (s6-listing) stay direct grid items. */
.filter-item { display: contents; }

/* Series members collapsed by default (no JS / no active filter). After
   .filter-item so it wins by source order → wrapper (and its card) hidden. */
.is-series-member { display: none; }

/* Flat mode (JS adds .is-flat to the grid/listing when any filter is active):
   reveal matching members (stay layout-transparent), hide the series stand-in. */
.entry-grid.is-flat .is-series-member:not(.is-hidden),
.s6-listing.is-flat .is-series-member:not(.is-hidden) { display: contents; }
.entry-grid.is-flat [data-kind="series"],
.s6-listing.is-flat [data-kind="series"] { display: none; }

/* JS hard-hide for non-matching items (wins over everything via !important). */
.is-hidden { display: none !important; }

/* Empty group sections hidden by JS. */
.series-group.is-hidden { display: none !important; }

/* --- bar styling (palette-aware; reuses palette custom props) ---------- */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  margin: 0 auto 1.5rem;
  padding: .75rem 1rem;
  border: 1px solid color-mix(in srgb, var(--pal-fg, #333) 15%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pal-bg, #fff) 92%, var(--pal-fg, #333));
}
.filter-search {
  flex: 1 1 12rem;
  min-width: 8rem;
  padding: .4rem .6rem;
  font: inherit;
  color: var(--pal-fg, #222);
  background: var(--pal-bg, #fff);
  border: 1px solid color-mix(in srgb, var(--pal-fg, #333) 25%, transparent);
  border-radius: 6px;
}
.filter-tags { display: flex; flex-wrap: wrap; gap: .35rem; }
.filter-tags .chip { cursor: pointer; user-select: none; }
.filter-tags .chip.is-on {
  background: var(--pal-accent, #b5532f);
  color: var(--pal-bg, #fff);
  border-color: var(--pal-accent, #b5532f);
}
.filter-select {
  padding: .4rem .5rem;
  font: inherit;
  color: var(--pal-fg, #222);
  background: var(--pal-bg, #fff);
  border: 1px solid color-mix(in srgb, var(--pal-fg, #333) 25%, transparent);
  border-radius: 6px;
}
.filter-count { font-size: .85em; opacity: .75; margin-left: auto; }
.filter-clear {
  cursor: pointer;
  padding: .35rem .7rem;
  font: inherit;
  color: var(--pal-fg, #222);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--pal-fg, #333) 25%, transparent);
  border-radius: 6px;
}
.filter-clear:hover { background: color-mix(in srgb, var(--pal-fg, #333) 8%, transparent); }
```

> The palette custom-prop names (`--pal-bg`, `--pal-fg`, `--pal-accent`) follow the existing palette CSS. If a palette uses different names, the `var(…, fallback)` second argument keeps the bar usable; adjust names during the Task 11 visual pass if a palette looks off.

- [ ] **Step 2: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add assets/filters.css
git commit -m "feat(filtering): add filter bar + visibility CSS"
```

---

## Task 7: Filter engine JS

**Files:**
- Create: `assets/filters.js`

- [ ] **Step 1: Create the script**

Create `assets/filters.js`:

```js
(function () {
  'use strict';

  var bar = document.querySelector('.filter-bar');
  if (!bar) return;

  var scope = bar.getAttribute('data-scope') || 'home';
  var searchInput = bar.querySelector('.js-filter-search');
  var tagsWrap = bar.querySelector('.js-filter-tags');
  var seriesSel = bar.querySelector('.js-filter-series');   // null in series scope
  var catSel = bar.querySelector('.js-filter-category');
  var countEl = bar.querySelector('.js-filter-count');
  var clearBtn = bar.querySelector('.js-filter-clear');

  var items = toArray(document.querySelectorAll('[data-kind]'));
  var entries = items.filter(function (el) { return el.getAttribute('data-kind') === 'entry'; });
  var grids = toArray(document.querySelectorAll('.entry-grid, .s6-listing'));
  var groups = toArray(document.querySelectorAll('.series-group'));

  var state = { q: '', tags: [], series: '', cat: '' };

  // --- populate facet controls from the cards on the page -----------------
  var tagSet = {}, seriesSet = {}, catSet = {};
  entries.forEach(function (el) {
    (el.getAttribute('data-tags') || '').split(',').forEach(function (t) { if (t) tagSet[t] = 1; });
    var s = el.getAttribute('data-series'); if (s) seriesSet[s] = 1;
    var c = el.getAttribute('data-category'); if (c) catSet[c] = 1;
  });
  if (tagsWrap) {
    Object.keys(tagSet).sort().forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip js-filter-tag';
      b.setAttribute('data-tag', t);
      b.textContent = t;
      tagsWrap.appendChild(b);
    });
  }
  if (seriesSel) {
    Object.keys(seriesSet).sort().forEach(function (s) { addOption(seriesSel, s, s); });
  }
  if (catSel) {
    Object.keys(catSet).sort().forEach(function (c) { addOption(catSel, c, titleCase(c)); });
  }
  var tagButtons = tagsWrap ? toArray(tagsWrap.querySelectorAll('.js-filter-tag')) : [];

  // --- wire events --------------------------------------------------------
  if (searchInput) searchInput.addEventListener('input', debounce(function () {
    state.q = searchInput.value.trim(); commit();
  }, 150));
  tagButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-tag');
      var i = state.tags.indexOf(t);
      if (i === -1) state.tags.push(t); else state.tags.splice(i, 1);
      commit();
    });
  });
  if (seriesSel) seriesSel.addEventListener('change', function () { state.series = seriesSel.value; commit(); });
  if (catSel) catSel.addEventListener('change', function () { state.cat = catSel.value; commit(); });
  if (clearBtn) clearBtn.addEventListener('click', function () {
    state = { q: '', tags: [], series: '', cat: '' }; commit();
  });

  // --- boot ---------------------------------------------------------------
  readURL();
  bar.hidden = false;
  apply();

  // --- core ---------------------------------------------------------------
  function commit() { writeURL(); apply(); }

  function activeFilter() {
    return !!(state.q || state.tags.length || state.series || state.cat);
  }

  function matches(el) {
    var hay = (el.getAttribute('data-search') || '').toLowerCase();
    if (state.q) {
      var toks = state.q.toLowerCase().split(/\s+/);
      for (var i = 0; i < toks.length; i++) {
        if (toks[i] && hay.indexOf(toks[i]) === -1) return false;
      }
    }
    if (state.tags.length) {
      var tags = (el.getAttribute('data-tags') || '').split(',');
      var any = false;
      for (var j = 0; j < state.tags.length; j++) {
        if (tags.indexOf(state.tags[j]) !== -1) { any = true; break; }
      }
      if (!any) return false;
    }
    if (state.series && el.getAttribute('data-series') !== state.series) return false;
    if (state.cat && el.getAttribute('data-category') !== state.cat) return false;
    return true;
  }

  function apply() {
    var on = activeFilter();
    grids.forEach(function (g) { g.classList.toggle('is-flat', on && scope === 'home'); });

    var shown = 0;
    items.forEach(function (el) {
      if (el.getAttribute('data-kind') === 'series') {
        el.classList.toggle('is-hidden', on);
        return;
      }
      var wrapper = el.closest('.filter-item');         // s6 rows + hidden members
      var target = wrapper || el;
      var isMember = (wrapper && wrapper.classList.contains('is-series-member'));
      var show;
      if (scope === 'home' && !on) {
        show = !isMember;                                // collapsed default
      } else {
        show = matches(el);
      }
      target.classList.toggle('is-hidden', !show);
      if (show) shown++;
    });

    groups.forEach(function (g) {
      // A member's card sits inside a display:contents .filter-item wrapper; the
      // wrapper (or the card itself, when unwrapped) carries .is-hidden — check
      // whichever applies.
      var anyVisible = toArray(g.querySelectorAll('[data-kind="entry"]')).some(function (el) {
        var w = el.closest('.filter-item');
        return !(w || el).classList.contains('is-hidden');
      });
      g.classList.toggle('is-hidden', !anyVisible);
    });

    if (countEl) countEl.textContent = on ? shown : entries.length;
    syncControls();
  }

  function syncControls() {
    if (searchInput && searchInput.value !== state.q) searchInput.value = state.q;
    tagButtons.forEach(function (b) {
      b.classList.toggle('is-on', state.tags.indexOf(b.getAttribute('data-tag')) !== -1);
    });
    if (seriesSel && seriesSel.value !== state.series) seriesSel.value = state.series;
    if (catSel && catSel.value !== state.cat) catSel.value = state.cat;
  }

  // --- URL sync -----------------------------------------------------------
  function readURL() {
    var p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.tags = (p.get('tag') || '').split(',').filter(Boolean);
    state.series = seriesSel ? (p.get('series') || '') : '';
    state.cat = p.get('cat') || '';
  }
  function writeURL() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.tags.length) p.set('tag', state.tags.join(','));
    if (state.series) p.set('series', state.series);
    if (state.cat) p.set('cat', state.cat);
    var qs = p.toString();
    history.replaceState(null, '', qs ? ('?' + qs) : location.pathname);
  }

  // --- helpers ------------------------------------------------------------
  function toArray(nl) { return Array.prototype.slice.call(nl); }
  function addOption(sel, value, label) {
    var o = document.createElement('option');
    o.value = value; o.textContent = label; sel.appendChild(o);
  }
  function titleCase(s) { return s.replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }); }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
})();
```

> `Element.closest` and `URLSearchParams` are supported in all evergreen browsers; this theme targets modern GitHub Pages visitors, so no polyfill is added (YAGNI).

> **Tag-chip capping (added during verification):** the live dataset has ~350 distinct
> tags (a long tail of near-unique place/restaurant tags), which made a flat chip list a
> wall. The facet population renders chips only for tags shared by `>= MIN_TAG_FREQ` (2)
> entries, sorted by frequency (most-used first); `assets/filters.css` `.filter-tags` gets
> a `max-height` + `overflow-y:auto`. The dropped tail stays searchable via free text (tags
> are in `data-search`). See commit history for the exact `tagCount`-based population.

- [ ] **Step 2: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add assets/filters.js
git commit -m "feat(filtering): add client-side filter engine"
```

---

## Task 8: Wire s1–s5 home branch

**Files:**
- Modify: `_includes/sites/s1.html`, `s2.html`, `s3.html`, `s4.html`, `s5.html`

Each needs: (a) the `filters.css` link in `<head>`, (b) the `filters.js` script before `</body>`, (c) the bar (`scope=home`) above the grid in the non-series branch. s1 and s3 also drop their now-redundant tag nav.

- [ ] **Step 1: Add CSS + JS to every skeleton head/body (s1–s6)**

In **each** of `s1.html … s6.html`, find the series.css link:

```liquid
  <link rel="stylesheet" href="{{ '/series.css' | prepend: site.assets_base | relative_url }}">
```

Add directly below it:

```liquid
  <link rel="stylesheet" href="{{ '/filters.css' | prepend: site.assets_base | relative_url }}">
```

And in **each**, find the closing `</body>`:

```liquid
</body>
```

Replace with:

```liquid
  <script src="{{ '/filters.js' | prepend: site.assets_base | relative_url }}" defer></script>
</body>
```

> Do this once per file for all six skeletons now; Tasks 9–10 only add bar markup.

- [ ] **Step 2: s1 — replace the static tag nav with the bar (home branch)**

In `s1.html`, find:

```liquid
    {%- unless series_mode -%}
    <nav class="s1-filter">
      <span class="chip solid">All · {{ entry_count }}</span>
      {%- for t in all_tags -%}
        {%- assign c = 0 -%}
        {%- for e in entries -%}{%- if e.tags contains t -%}{%- assign c = c | plus: 1 -%}{%- endif -%}{%- endfor -%}
        <span class="chip">{{ t }} · {{ c }}</span>
      {%- endfor -%}
    </nav>
    {%- endunless -%}
```

Replace with:

```liquid
    {%- unless series_mode -%}
    {%- include filter-bar.html scope="home" -%}
    {%- endunless -%}
```

- [ ] **Step 3: s2 — insert the bar above the grid (home branch)**

In `s2.html`, find:

```liquid
    <section class="s2-content">
      <div class="entry-grid">
        {%- include grid-with-series.html items=entries -%}
```

Replace with:

```liquid
    <section class="s2-content">
      {%- include filter-bar.html scope="home" -%}
      <div class="entry-grid">
        {%- include grid-with-series.html items=entries -%}
```

- [ ] **Step 4: s3 — replace the sidenav tag list with the bar (home branch)**

In `s3.html`, find the sidenav tag block (around the `{%- if all_tags.size > 0 -%}` … `{%- endif -%}` inside `<aside class="s3-sidenav">`) and the content grid. Insert the bar above the grid in the non-series branch. Find:

```liquid
      <section class="s3-content">
        <div class="entry-grid">
          {%- include grid-with-series.html items=entries -%}
```

Replace with:

```liquid
      <section class="s3-content">
        {%- unless series_mode -%}{%- include filter-bar.html scope="home" -%}{%- endunless -%}
        <div class="entry-grid">
          {%- include grid-with-series.html items=entries -%}
```

Then remove the now-redundant sidenav tag list: find the `{%- if all_tags.size > 0 -%}` … matching `{%- endif -%}` block inside `<aside class="s3-sidenav">` and delete it. (Leave the rest of the sidenav intact.)

- [ ] **Step 5: s4 — insert the bar above the grid (home branch)**

In `s4.html`, find:

```liquid
      <div class="entry-grid">
        {%- include grid-with-series.html items=entries -%}
```

Replace with:

```liquid
      {%- unless series_mode -%}{%- include filter-bar.html scope="home" -%}{%- endunless -%}
      <div class="entry-grid">
        {%- include grid-with-series.html items=entries -%}
```

- [ ] **Step 6: s5 — insert the bar above the grid (home branch)**

In `s5.html`, find:

```liquid
    <section class="s5-content">
      <div class="entry-grid">
```

Replace with:

```liquid
    <section class="s5-content">
      {%- unless series_mode -%}{%- include filter-bar.html scope="home" -%}{%- endunless -%}
      <div class="entry-grid">
```

- [ ] **Step 7: Build each skeleton and verify the bar is present on the home page**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
for s in s1 s2 s3 s4 s5; do
  printf 'skeleton: %s\n' "$s" > /tmp/skel.yml
  /mnt/c/tools/ruby34/bin/bundle exec jekyll build --config _config.yml,/tmp/skel.yml >/dev/null
  echo "$s: bar=$(grep -c 'class="filter-bar"' _site/index.html) css=$(grep -c 'filters.css' _site/index.html) js=$(grep -c 'filters.js' _site/index.html)"
done
```
Expected each line: `bar=1 css=1 js=1`.

- [ ] **Step 8: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/sites/s1.html _includes/sites/s2.html _includes/sites/s3.html _includes/sites/s4.html _includes/sites/s5.html _includes/sites/s6.html
git commit -m "feat(filtering): wire filter bar into s1-s5 home + link assets in all skeletons"
```

---

## Task 9: Wire s1–s5 series branch

**Files:**
- Modify: `_includes/sites/s1.html`, `s2.html`, `s3.html`, `s4.html`, `s5.html`

Each skeleton's `series_mode` branch renders `series-grid.html`. Insert the bar (`scope=series`) immediately before that include.

- [ ] **Step 1: s1 series branch**

In `s1.html`, find:

```liquid
      {%- if series_mode -%}
        {%- include series-grid.html -%}
```

Replace with:

```liquid
      {%- if series_mode -%}
        {%- include filter-bar.html scope="series" -%}
        {%- include series-grid.html -%}
```

- [ ] **Step 2: s2–s5 series branches**

Each of `s2.html`, `s3.html`, `s4.html`, `s5.html` contains the same `{%- if series_mode -%}` → `{%- include series-grid.html -%}` pair (the series branch added during the series-page rework). In **each** file find:

```liquid
{%- include series-grid.html -%}
```

Replace with:

```liquid
{%- include filter-bar.html scope="series" -%}
        {%- include series-grid.html -%}
```

(Match the existing indentation in each file; the key change is adding the `filter-bar.html` include line directly above the `series-grid.html` include.)

- [ ] **Step 3: Build and verify the bar appears on a series page, series select omitted**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
for s in s1 s2 s3 s4 s5; do
  printf 'skeleton: %s\n' "$s" > /tmp/skel.yml
  /mnt/c/tools/ruby34/bin/bundle exec jekyll build --config _config.yml,/tmp/skel.yml >/dev/null
  echo "$s: bar=$(grep -c 'class="filter-bar"' _site/series/michelin-weekends/index.html) seriesSel=$(grep -c 'js-filter-series' _site/series/michelin-weekends/index.html)"
done
```
Expected each: `bar=1 seriesSel=0` (series dropdown omitted in series scope).

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/sites/s1.html _includes/sites/s2.html _includes/sites/s3.html _includes/sites/s4.html _includes/sites/s5.html
git commit -m "feat(filtering): wire filter bar into s1-s5 series pages"
```

---

## Task 10: Wire s6 (home + series) and group its series rows

**Files:**
- Modify: `_includes/sites/s6.html`

s6 doesn't use `.entry-grid`; the home bar goes above the home `.s6-listing`, the series bar above the series listing. Series groups must be wrapped in `.series-group` so empty-group hiding works, and each series member row needs `data-*` (mirroring Task 4 but in s6's inline series block).

- [ ] **Step 1: Insert the home-mode bar**

In `s6.html`, find the non-series prompt + listing:

```liquid
      {%- else -%}
      <p class="s6-prompt"><span class="path">{{ site.title | default: 'atlas' | downcase }}</span>ls research/ --sort=date</p>
      <div class="s6-listing">
```

Replace with:

```liquid
      {%- else -%}
      {%- include filter-bar.html scope="home" -%}
      <p class="s6-prompt"><span class="path">{{ site.title | default: 'atlas' | downcase }}</span>ls research/ --sort=date</p>
      <div class="s6-listing">
```

- [ ] **Step 2: Insert the series-mode bar**

Find the series-mode opening:

```liquid
      {%- if series_mode -%}
      <p class="s6-prompt"><span class="path">{{ site.title | default: 'atlas' | downcase }}</span>cd series/{{ s.slug }}/ &amp;&amp; ls</p>
```

Replace with:

```liquid
      {%- if series_mode -%}
      {%- include filter-bar.html scope="series" -%}
      <p class="s6-prompt"><span class="path">{{ site.title | default: 'atlas' | downcase }}</span>cd series/{{ s.slug }}/ &amp;&amp; ls</p>
```

- [ ] **Step 3: Wrap each series group in `.series-group` and stamp member rows**

In the s6 series-mode grouped block, find:

```liquid
          {%- if group_members.size > 0 -%}
            {%- assign group_members = group_members | sort: 'date' | reverse -%}
            <p class="s6-prompt" style="opacity:.55">## {{ g.label }}</p>
            <div class="s6-listing">
              {%- for e in group_members -%}
              <span class="s6-cell">{{ e.date | date: "%Y-%m-%d" }}</span>
              <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title }}</a></span>
              {%- endfor -%}
            </div>
          {%- endif -%}
```

Replace with:

```liquid
          {%- if group_members.size > 0 -%}
            {%- assign group_members = group_members | sort: 'date' | reverse -%}
            <section class="series-group">
            <p class="s6-prompt" style="opacity:.55">## {{ g.label }}</p>
            <div class="s6-listing">
              {%- for e in group_members -%}
              {%- assign _m_seg = e.url | split: '/' -%}
              {%- assign _m_slug = _m_seg[2] -%}
              {%- assign _m_tags = e.tags | join: "," | downcase -%}
              {%- capture _m_search -%}{{ e.title }} {{ e.summary }} {{ e.topic }} {{ e.tags | join: " " }}{%- endcapture -%}
              {%- assign _m_search = _m_search | downcase | strip_newlines | replace: '"', '' -%}
              <div class="filter-item" data-kind="entry" data-slug="{{ _m_slug }}" data-tags="{{ _m_tags }}" data-series="{{ s.slug }}" data-category="{{ g.label | downcase }}" data-search="{{ _m_search | escape }}">
              <span class="s6-cell">{{ e.date | date: "%Y-%m-%d" }}</span>
              <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title }}</a></span>
              </div>
              {%- endfor -%}
            </div>
            </section>
          {%- endif -%}
```

- [ ] **Step 4: Stamp the flat (non-grouped) series members too**

Find the s6 `{%- else -%}` flat-members block inside series mode:

```liquid
      {%- else -%}
        {%- assign flat_members = all_members | sort: 'date' | reverse -%}
        <div class="s6-listing">
          {%- for e in flat_members -%}
          <span class="s6-cell">{{ e.date | date: "%Y-%m-%d" }}</span>
          <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title }}</a></span>
          {%- endfor -%}
        </div>
```

Replace with:

```liquid
      {%- else -%}
        {%- assign flat_members = all_members | sort: 'date' | reverse -%}
        <div class="s6-listing">
          {%- for e in flat_members -%}
          {%- assign _m_seg = e.url | split: '/' -%}
          {%- assign _m_slug = _m_seg[2] -%}
          {%- assign _m_tags = e.tags | join: "," | downcase -%}
          {%- capture _m_search -%}{{ e.title }} {{ e.summary }} {{ e.topic }} {{ e.tags | join: " " }}{%- endcapture -%}
          {%- assign _m_search = _m_search | downcase | strip_newlines | replace: '"', '' -%}
          <div class="filter-item" data-kind="entry" data-slug="{{ _m_slug }}" data-tags="{{ _m_tags }}" data-series="{{ s.slug }}" data-category="" data-search="{{ _m_search | escape }}">
          <span class="s6-cell">{{ e.date | date: "%Y-%m-%d" }}</span>
          <span class="s6-cell"><a href="{{ e.url | relative_url }}">{{ e.title }}</a></span>
          </div>
          {%- endfor -%}
        </div>
```

- [ ] **Step 5: Build s6 and verify both pages**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
printf 'skeleton: s6\n' > /tmp/skel.yml
/mnt/c/tools/ruby34/bin/bundle exec jekyll build --config _config.yml,/tmp/skel.yml >/dev/null
echo "home bar=$(grep -c 'class="filter-bar"' _site/index.html)"
echo "series bar=$(grep -c 'class="filter-bar"' _site/series/michelin-weekends/index.html) groups=$(grep -c 'class="series-group"' _site/series/michelin-weekends/index.html)"
```
Expected: `home bar=1`; `series bar=1 groups≥10` (one per non-empty country).

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add _includes/sites/s6.html
git commit -m "feat(filtering): wire filter bar into s6 home + series, group series rows"
```

---

## Task 11: End-to-end verification with Playwright

No JS unit harness exists; verify behaviour by driving the built site. Use the **verify** skill / Playwright MCP. Serve the built site first.

- [ ] **Step 1: Build + serve via Docker**

```bash
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas
docker run -d --name atlas-serve -u 0 -p 4000:4000 -v "$PWD:/srv/jekyll" jekyll/jekyll:4 \
  sh -c "jekyll serve --host 0.0.0.0"
```
Home page: `http://localhost:4000/Atlas/` (baseurl `/Atlas` from `atlas/_config.yml`).
Stop later with `docker rm -f atlas-serve`. To test another skeleton, `docker rm -f atlas-serve`,
write `_skel.yml`, and re-run with `jekyll serve --host 0.0.0.0 --config _config.yml,/srv/jekyll/_skel.yml`.

- [ ] **Step 2: Home page (s5 default) — collapsed→flat**

With Playwright: navigate to the home page.
- Assert the `.filter-bar` is visible (not `[hidden]`).
- Assert a `[data-kind="series"]` card is visible and `.is-series-member` cards are not.
- Type `tokyo` into `.js-filter-search`. Assert: series cards hidden, individual michelin member card(s) mentioning Tokyo now visible, `.js-filter-count` > 0, URL contains `?q=tokyo`.
- Click **Clear**. Assert: series card visible again, URL has no query string.

- [ ] **Step 3: Home — tag OR + category AND**

- Click two tag chips. Assert visible entries each have at least one of the two tags (`data-tags`).
- Pick a category (e.g. `Japan`) in `.js-filter-category`. Assert visible entries all have `data-category="japan"` AND a selected tag. Assert URL has both `tag=` and `cat=`.

- [ ] **Step 4: URL round-trip**

- Navigate directly to home with `?q=weekend&cat=france`. Assert the search box shows `weekend`, the category select shows `France`, and only matching cards are visible — without any clicks.

- [ ] **Step 5: Series page**

- Navigate to `…/series/michelin-weekends/`.
- Assert `.filter-bar` present and `.js-filter-series` **absent**.
- Pick category `Italy`. Assert: only the Italy `.series-group` has visible cards; other `.series-group` sections have class `is-hidden`.
- Type a query that matches nothing (e.g. `zzzzz`). Assert all groups hidden, count `0`. Clear restores all groups.

- [ ] **Step 6: Spot-check s1 and s6**

- Rebuild with `skeleton: s1`, reload home, repeat Step 2's text-filter check (card-based).
- Rebuild with `skeleton: s6`, reload home; assert filtering a tag hides non-matching `.filter-item` rows while keeping the `.s6-listing` grid columns aligned (no visual break). On the s6 series page, assert a category filter hides whole `## label` groups.

- [ ] **Step 7: Visual pass across a palette**

- Build with a non-default palette (e.g. `palette: midnight`); confirm the bar's contrast is acceptable (text readable, chips legible). If a palette custom-prop name differs and the bar looks wrong, adjust the `var(--pal-*)` names in `assets/filters.css` and rebuild.

- [ ] **Step 8: Stop the server and commit any CSS tweaks**

```bash
pkill -f "jekyll serve" || true
cd /mnt/c/Users/woute/Dropbox/Personal/Programming/UnixCode/projects/Scout+Atlas/atlas/compass
git add -A && git commit -m "fix(filtering): palette/contrast tweaks from verification" || echo "no tweaks needed"
```

---

## Self-review notes

- **Spec coverage:** free-text (Task 7 `matches` over `data-search`), tag multi-select OR (Task 7), series single-select (Task 5/7, home only), category/group-label (Tasks 1–2 data, 5/7 UI), all six skeletons (Tasks 8–10), series pages (Tasks 9–10), URL sync (Task 7), collapsed↔flat home only + series in-place (Tasks 3/6/7), s6 `display:contents` contract (Tasks 4/10/6), no-JS progressive enhancement (`hidden` + default-collapsed CSS, Tasks 5/6), metadata-only search / no build step (throughout).
- **Facet source deviation** from spec (JS-populated facets) is called out at the top and in Task 7.
- **s5 hero caveat:** the `skip_first` hero entry isn't flat-filterable (noted in Task 3 Step 3) — acceptable, it's always shown above the grid.
- **Data-attribute naming** is consistent across Tasks 2/4/10: `data-kind`, `data-slug`, `data-tags`, `data-series`, `data-category`, `data-search`; categories stored lowercased, displayed title-cased in the select.
