# Compass research filtering — design

**Date:** 2026-06-03
**Status:** approved, pending implementation
**Work tree:** `atlas/compass` (the live submodule, in sync with GitHub `origin/main`; has series support)

> **Updated 2026-06-03 (post series-page rework):** since this spec was first approved, the
> series details page was rebuilt. `series.html` no longer renders its own body — it sets
> `series_mode = true` and delegates to the active skeleton (`sites/sN.html`), which renders
> the series via `series-kicker.html` / `series-head.html` + `series-grid.html` (or, for s6,
> bespoke inline markup). The sections below reflect that new structure.

## Problem

Atlas now holds 150+ research entries (the `michelin-weekends` series alone is huge).
The home page and series pages need filtering by:

- **free text** — metadata only (title + summary + topic + tags), no body index, no build step
- **tag** — entry `tags[]`; multi-select, OR within tags
- **series** — the entries in `_data/series.yml` (`michelin-weekends`, `sessions-and-workshops`); single-select
- **series category** — the group label within a series (country: Belgium, France, Japan, …); single-select

Filtering must work on the front page and on `/series/<slug>/` pages, with the same
component, across **all six home skeletons** (`s1`–`s6`).

The site is static Jekyll on GitHub Pages, so all filtering is **client-side JS**.

## Approach (chosen: A — unified bar + interleaved single grid)

One shared filter-bar include + one JS file + one CSS file, dropped into every skeleton
and the series layout. Every card is tagged with `data-*` attributes in the single shared
card base. The grid keeps emitting series cards *and* now also emits the (hidden) member
cards, so JS can toggle between two render modes:

- **collapsed** (no filter active): series cards + standalone entries — the current look, untouched.
- **flat** (any filter active): series cards hidden, individual matching entry cards shown.

Rejected alternatives:

- **B — two-grid swap:** keep collapsed grid, add a second hidden flat grid, swap on filter.
  Duplicates card rendering and forces s6 to emit two listings. More DOM, more drift.
- **C — JSON + client-rendered cards:** generate `entries.json`, render cards in JS.
  Throws away the v1–v7 Liquid card system and re-implements 7 variants in JS.

## Data layer (Liquid, build-time)

### `_includes/entries.html`
Already builds `entry_series_map`, `series_count_map`, `series_anymember_map`.
**Add** an entry→category map:

- `entry_category_map` — `",entry_slug=group_label,..."` (entry → its group label within its
  first series). Built in the same `site.data.series` loop that builds `entry_series_map`,
  reading `_g.label` when iterating groups. Flat series (no groups) contribute no category.

### `_includes/cards/_base.html` (single touch-point for all 7 card variants)
On the root `<article class="card">`, add:

- `data-kind="entry"`
- `data-slug="<basename of e.url>"`
- `data-tags="tag1,tag2"` (comma-joined, lowercased)
- `data-series="<series slug or empty>"` (from `entry_series_map`)
- `data-category="<group label or empty>"` (from `entry_category_map`)
- `data-search="<title summary topic + tags, lowercased, space-joined>"`

The base receives `entry=e` and can read the global maps set by `entries.html`
(it runs first). Slug = index `[2]` of `e.url | split: '/'` (same as `entries.html`).

### `_includes/series-card.html`
Add `data-kind="series" data-series="<slug>"` to its root `<article class="card card--series">`.

### `_includes/grid-with-series.html` and `_includes/listing-with-series.html`
Currently they **skip** members of an already-emitted series. Change so they **also emit the
member entry cards** (or rows, for s6), in addition to the series card. Members get a marker
class (e.g. `is-series-member`) so JS can hide them in collapsed mode. Base iteration order
stays date-descending, so flat mode is correctly sorted globally.

### s6 (`.s6-cell` rows) — data contract without breaking the grid
s6 rows are bare `<span class="s6-cell">` grid items (direct children of `.s6-listing`, which
is a CSS grid), not `.card`s — in **both** home (`listing-with-series.html`, 4 cells/row) and
series mode (inline, 2 cells/row). To attach `data-*` and toggle visibility per row without
breaking the grid columns, wrap each row's cells in a single
`<div class="filter-item" data-…>` set to `display: contents` (so cells still participate in
the parent grid), toggled to `display: none` to hide. Group headers (`<p class="s6-prompt">## label</p>`)
hide when their following rows all hide. This applies to `listing-with-series.html` and the
s6 series-mode block.

Collapsed vs flat is purely a CSS-class concern driven by JS — the Liquid output always
contains everything. **This collapsed↔flat toggle is a home-page concern only.** Series
pages already render every member as an individual card (see below), so they filter in place.

### Series-page rendering (post-rework) — what filtering hooks into
On a series page the skeleton's `series_mode` branch renders (instead of `grid-with-series`):

- **s1–s5**: `series-grid.html` → for grouped series, one `<section class="series-group">`
  per group, each with `<h2 class="series-group-label">{{ g.label }}</h2>` and an
  `.entry-grid` of individual `.card`s (the shared `cards/_base.html`, so they already carry
  the `data-*` from the change above). Flat series render a single `.entry-grid`.
- **s6**: bespoke — `<div class="s6-listing">` of two-cell rows
  (`<span class="s6-cell">` date + title `<a>`), grouped by `<p class="s6-prompt">## label</p>`
  headers. These rows are **not** `.card`s and currently carry no `data-*`.

Consequences:
- The group label **is** the category, already in the DOM as the `<h2>` / `## ` header. The
  category facet on a series page is derived from these groups.
- Series-page filtering = show/hide individual member cards in place; **hide a whole
  `.series-group` section (or s6 `## label` header) when none of its members match.** No
  collapsed↔flat switch needed.

## Filter bar — `_includes/filter-bar.html`

One include, palette-aware, reusing the existing `.chip` styling. Rendered hidden until JS
attaches (`is-ready` class) so no-JS visitors still get the working collapsed view.

Controls:

- free-text `<input>` (debounced; matches `data-search` substring)
- tag chips — multi-select, OR within
- series `<select>` — single-select (omitted on series pages)
- category `<select>` — single-select (country)
- live result count
- **Clear** button

Server-side facet generation:

- tags = union of `tags[]` over `entries`
- series = `site.data.series` entries with ≥1 resolved member
- categories = group labels; on the home page across all series, on a series page scoped to
  that series' groups

Caller passes a `scope` flag (`home` | `series`) so the include knows whether to render the
series dropdown and how to scope categories. In `series` scope: the series dropdown is omitted
and categories come from the current series' group labels (`s.groups[].label`).

## Behaviour — `assets/filters.js`

- Reads active state from the controls (and from the URL on load — see below).
- **No filter active** → add `is-collapsed` to the grid: show `[data-kind=series]` and
  standalone entries, hide `.is-series-member`.
- **Any filter active** → add `is-flat`: hide `[data-kind=series]`, show entry cards whose
  `data-*` match **all** active facet types:
  - text: every whitespace token in the query is a substring of `data-search`
  - tags: `data-tags` contains **any** selected tag (OR)
  - series: `data-series` equals the selected series
  - category: `data-category` equals the selected category
- Group/section headers with zero visible cards are hidden.
- Updates the live result count.
- **URL sync** via `history.replaceState`: `?q=&tag=&series=&cat=` (tags comma-joined).
  Parsed on load so filtered views are shareable and deep-linkable (e.g. a series-page
  country chip can link to a pre-filtered state). Clear empties the querystring.

On **series pages** there is no collapsed↔flat switch: JS just shows/hides individual member
cards per the active facets and hides any `.series-group` section (or s6 `## label` header)
whose members all hide.

One script handles both home and series pages. It operates on a common per-item contract —
`.card` (s1–s5, home + series) and `.filter-item` `display:contents` wrappers (s6 rows) —
each carrying the same `data-*`, discovered at runtime. Containers: `.entry-grid` /
`.series-group` (s1–s5), `.s6-listing` (s6).

## Reach / integration

Each skeleton now has **two** content branches (`series_mode` and not). The bar goes into
both, with the matching `scope`:

- **Home branch** (`unless series_mode`): bar with `scope=home` above the grid/listing.
  - s1: replace the decorative `s1-filter` chip row with the shared bar.
  - s3: replace the sidenav tag list with the shared bar (or feed it into the sidenav slot).
  - s2, s4: insert above `.entry-grid`.
  - s5: insert above `.entry-grid` (keeps `skip_first` for its hero).
  - s6: compact bar above the home `.s6-listing`.
- **Series branch** (`if series_mode`): bar with `scope=series` above `series-grid.html`
  (s1–s5) / the inline `.s6-listing` (s6). Series dropdown omitted; categories = this series'
  groups. The existing per-skeleton tag nav is already suppressed in series mode, so nothing
  to remove there.

`series.html` itself needs no bar markup — it only sets the `series_mode` vars and includes
the skeleton; the bar lives in the skeletons.

CSS for the bar lives in `assets/filters.css`, linked from each skeleton `<head>` next to the
existing stylesheets. Per-skeleton tweaks kept minimal.

## Testing

No JS unit harness exists in this Jekyll theme. Verification is by building the site and
driving it with Playwright:

- collapsed ↔ flat transition when a filter toggles
- each facet type in isolation, then combined (AND across types, OR within tags)
- empty-result state and Clear
- URL round-trip (apply filter → reload from querystring → same result)
- a series page (scoped category, no series dropdown)
- spot-check across 2–3 skeletons and a palette to confirm the bar renders

## Out of scope (YAGNI)

- Full-text body search / search index (chosen: metadata only; data layer leaves room to add
  a body index later without reworking the UI)
- A new series-level category field (categories = existing group labels only)
- Sort controls (date-desc stays the only order)
