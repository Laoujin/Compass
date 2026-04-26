/* Atlas — research detail page interactions:
   - TOC built from <h2>/<h3> in the article
   - Active TOC item via IntersectionObserver
   - Reading progress bar + minute counter
   - Tab switching (Findings · Citations · Raw) with hash sync
   - Lazy-load citations.jsonl into the Citations panel
   - Lazy-load raw .md into the Raw panel; copy-to-clipboard
   No build step; no deps. */

(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const article = $('.research-article');
  const tocList = $('.research-toc .toc-list');

  // ---------- TOC ----------
  if (article && tocList) {
    const headings = $$('h2, h3', article);
    const links = [];
    headings.forEach(h => {
      if (!h.id) {
        h.id = h.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'h-' + links.length;
      }
      const li = document.createElement('li');
      if (h.tagName === 'H3') li.classList.add('sub');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      tocList.appendChild(li);
      links.push({ a, li, h });
    });

    if ('IntersectionObserver' in window && links.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          const link = links.find(l => l.h === e.target);
          if (!link) return;
          if (e.isIntersecting) {
            links.forEach(l => l.li.classList.remove('is-active'));
            link.li.classList.add('is-active');
          }
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      headings.forEach(h => io.observe(h));
    }
  }

  // ---------- Reading progress ----------
  const progFill = $('.research-progress-fill');
  const progCur = $('.research-progress-text .cur');
  const progText = $('.research-progress-text');
  let totalMin = 0;
  if (progText) {
    const m = progText.textContent.match(/of\s+(\d+)/);
    if (m) totalMin = parseInt(m[1], 10);
  }
  if (progFill && article) {
    const onScroll = () => {
      const rect = article.getBoundingClientRect();
      const total = article.offsetHeight - window.innerHeight + 120;
      const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const ratio = total > 0 ? passed / total : 0;
      progFill.style.width = (ratio * 100).toFixed(1) + '%';
      if (progCur) progCur.textContent = Math.round(ratio * totalMin);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  // ---------- Tabs ----------
  const tabs = $$('.research-tab');
  const panels = $$('.research-panel');
  const validTabs = tabs.map(t => t.dataset.tab);

  function showTab(name, push) {
    if (!validTabs.includes(name)) return;
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
    panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
    if (push !== false && history.replaceState) {
      const newHash = name === 'findings' ? '' : '#' + name;
      history.replaceState(null, '', location.pathname + location.search + newHash);
    }
    if (name === 'citations') loadCitations();
  }

  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

  const initialHash = location.hash.replace('#', '');
  if (validTabs.includes(initialHash)) showTab(initialHash, false);

  // ---------- Citations lazy load ----------
  let citationsLoaded = false;
  function loadCitations() {
    if (citationsLoaded) return;
    citationsLoaded = true;

    const list = $('#citation-list');
    if (!list) return;
    const url = list.dataset.src;
    if (!url) return;

    list.innerHTML = '<p class="citation-loading">Loading citations…</p>';

    fetch(url)
      .then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(text => {
        const items = text
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(line => { try { return JSON.parse(line); } catch (e) { return null; } })
          .filter(Boolean);

        if (!items.length) {
          list.innerHTML = '<p class="citation-loading">No citations found in citations.jsonl.</p>';
          return;
        }

        list.innerHTML = '';
        items.forEach((c, i) => {
          const a = document.createElement('a');
          a.className = 'citation-card';
          a.href = c.url || '#';
          if (c.url) { a.target = '_blank'; a.rel = 'noopener'; }
          const id = c.id != null ? c.id : (i + 1);
          a.innerHTML =
            '<div class="num">[' + escapeHtml(String(id)) + ']</div>' +
            '<div class="ttl">' + escapeHtml(c.title || c.url || 'Untitled') + '</div>' +
            '<div class="src">' + escapeHtml(c.source || hostname(c.url) || '') + '</div>';
          list.appendChild(a);
        });
      })
      .catch(err => {
        list.innerHTML = '<p class="citation-loading">Could not load citations.jsonl (' +
          escapeHtml(err.message) + ').</p>';
      });
  }

  // Filter
  const filterInput = $('.citations-filter');
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      const q = filterInput.value.toLowerCase();
      $$('.citation-card', $('#citation-list')).forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // ---------- helpers ----------
  function hostname(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
})();
