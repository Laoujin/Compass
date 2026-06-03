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
  var moreBtn = bar.querySelector('.js-filter-more');
  var advanced = bar.querySelector('.js-filter-advanced');

  var items = toArray(document.querySelectorAll('[data-kind]'));
  var entries = items.filter(function (el) { return el.getAttribute('data-kind') === 'entry'; });
  var grids = toArray(document.querySelectorAll('.entry-grid, .s6-listing'));
  var groups = toArray(document.querySelectorAll('.series-group'));

  var state = { q: '', tags: [], series: '', cat: '' };

  // --- populate facet controls from the cards on the page -----------------
  // Only tags shared by >= MIN_TAG_FREQ entries become chips. Research datasets
  // carry a long tail of near-unique tags (place/restaurant names) — hundreds of
  // them — which would make a flat chip list unusable. The dropped tail stays
  // reachable via free-text search (tags are part of data-search).
  var MIN_TAG_FREQ = 2;
  var tagCount = {}, seriesSet = {}, catSet = {};
  entries.forEach(function (el) {
    (el.getAttribute('data-tags') || '').split(',').forEach(function (t) { if (t) tagCount[t] = (tagCount[t] || 0) + 1; });
    var s = el.getAttribute('data-series'); if (s) seriesSet[s] = 1;
    var c = el.getAttribute('data-category'); if (c) catSet[c] = 1;
  });
  if (tagsWrap) {
    Object.keys(tagCount)
      .filter(function (t) { return tagCount[t] >= MIN_TAG_FREQ; })
      .sort(function (a, b) { return tagCount[b] - tagCount[a] || (a < b ? -1 : 1); })
      .forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip js-filter-tag';
        b.setAttribute('data-tag', t);
        b.textContent = t;
        tagsWrap.appendChild(b);
      });
  }
  if (seriesSel) {
    // Label series options with their display title (from the stand-in cards),
    // falling back to the slug if a title isn't present.
    var seriesTitle = {};
    items.forEach(function (el) {
      if (el.getAttribute('data-kind') === 'series') {
        var sl = el.getAttribute('data-series'), ti = el.getAttribute('data-series-title');
        if (sl && ti) seriesTitle[sl] = ti;
      }
    });
    Object.keys(seriesSet).sort().forEach(function (s) { addOption(seriesSel, s, seriesTitle[s] || s); });
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
  if (moreBtn && advanced) moreBtn.addEventListener('click', function () {
    setAdvanced(advanced.hidden);
  });

  // --- boot ---------------------------------------------------------------
  readURL();
  // Reveal the advanced controls up front when a facet filter arrived via URL,
  // so the user can see what's narrowing the results (search stays always-visible).
  setAdvanced(!!(state.tags.length || state.series || state.cat));
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
  function setAdvanced(open) {
    if (!advanced) return;
    advanced.hidden = !open;
    if (moreBtn) moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
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
