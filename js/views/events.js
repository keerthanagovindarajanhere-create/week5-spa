/* =========================================================
   Events view — "/events?type=talk&q=git"

   The filter and search live in the URL, which means:
   • a filtered list can be bookmarked or shared,
   • Back/Forward step through the filters you clicked,
   • refreshing the page keeps the same results.

   Category links create history entries. Typing in the search box
   only *replaces* the current entry, so Back doesn't have to undo
   every keystroke.
   ========================================================= */
'use strict';

(function (S) {
  const { html, $, $$, debounce } = S.utils;
  const C = S.components;
  const CATS = [['all', 'All'], ['workshop', 'Workshops'], ['competition', 'Competitions'], ['talk', 'Talks']];

  const readQuery = query => {
    const type = query.get('type');
    return { category: CATS.some(([id]) => id === type) ? type : 'all', q: query.get('q') || '' };
  };
  const filterHref = (type, q) => {
    const p = new URLSearchParams();
    if (type !== 'all') p.set('type', type);
    if (q) p.set('q', q);
    const s = p.toString();
    return S.router.href('/events' + (s ? '?' + s : ''));
  };

  function listMarkup(list, total) {
    return html`
      <h2 class="visually-hidden">Results</h2>
      <p class="result-count" role="status">Showing ${list.length} of ${total} events</p>
      ${list.length
        ? html`<ul class="card-grid">${list.map(C.eventCard)}</ul>`
        : html`<div class="empty"><p>No events match that search.</p><a class="btn btn-ghost" href="${S.router.href('/events')}">Clear filters</a></div>`}`;
  }

  S.views.events = {
    title: () => "Events | Spectra '26",

    async load(ctx) {
      const { category, q } = readQuery(ctx.query);
      const [all, list] = await Promise.all([S.api.getAll(), S.api.getEvents({ category, q })]);
      return { total: all.events.length, list, category, q };
    },

    loading: () => html`
      <section class="page-head"><div class="container"><h1 id="pageTitle" tabindex="-1">Events</h1><p class="lead">Loading events…</p></div></section>
      <div class="container">${C.skeletonCards(6)}</div>`,

    render: ({ total, list, category, q }) => html`
      <section class="page-head" aria-labelledby="pageTitle">
        <div class="container">
          <h1 id="pageTitle" tabindex="-1">Events</h1>
          <p class="lead">Twelve sessions across two days. Save the ones you like to build your schedule.</p>
        </div>
      </section>

      <div class="container">
        <div class="toolbar">
          <nav class="filters" aria-label="Filter by category">
            ${CATS.map(([id, label]) => html`
              <a class="filter" href="${filterHref(id, q)}" data-type="${id}" ${id === category ? html`aria-current="true"` : ''}>${label}</a>`)}
          </nav>
          <form class="search" role="search" data-search>
            <label for="eventSearch" class="visually-hidden">Search events</label>
            <input id="eventSearch" type="search" name="q" value="${q}" placeholder="Search events…" autocomplete="off">
          </form>
        </div>
        <div id="eventResults">${listMarkup(list, total)}</div>
      </div>`,

    mount(el, ctx) {
      const input = $('#eventSearch', el);
      const results = $('#eventResults', el);
      let token = 0;

      async function refresh(category, q) {
        const mine = ++token;                         // ignore answers to older searches
        const list = await S.api.getEvents({ category, q });
        if (mine !== token) return;
        const total = (await S.api.getAll()).events.length;
        results.innerHTML = listMarkup(list, total);
        S.store.setState({ lastEventsQuery: S.router.current().query.toString() });
      }

      const onType = debounce(() => {
        const { category } = readQuery(S.router.current().query);
        const q = input.value.trim();
        S.router.setQuery({ type: category === 'all' ? '' : category, q });   // replace, not push
        // keep the category links pointing at the current search
        $$('.filter', el).forEach(a => a.setAttribute('href', filterHref(a.dataset.type, q)));
        refresh(category, q);
      }, 200);

      input.addEventListener('input', onType);
      $('[data-search]', el).addEventListener('submit', e => { e.preventDefault(); input.blur(); });
      S.store.setState({ lastEventsQuery: ctx.query.toString() });

      // Called by the app when only the query string changed (filter link, Back, Forward):
      // update the list in place instead of re-rendering the whole page.
      this.update = next => {
        const { category, q } = readQuery(next.query);
        $$('.filter', el).forEach(a => {
          if (a.dataset.type === category) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          a.setAttribute('href', filterHref(a.dataset.type, q));
        });
        if (input.value !== q) input.value = q;
        refresh(category, q);
      };

      return () => { token++; this.update = null; };
    }
  };
})(window.Spectra);
