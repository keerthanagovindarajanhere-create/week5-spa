/* =========================================================
   Event detail view — "/events/:id"
   A dynamic route: the same view renders any event, using the
   id from the URL. An unknown id shows the "not found" view.
   ========================================================= */
'use strict';

(function (S) {
  const { html } = S.utils;
  const C = S.components;

  S.views.eventDetail = {
    title: (ctx, data) => (data ? `${data.event.title} | Spectra '26` : "Event | Spectra '26"),

    async load(ctx) {
      const id = Number(ctx.params.id);
      const all = await S.api.getAll();
      const event = Number.isInteger(id) ? all.byId.get(id) : null;
      if (!event) throw S.notFoundError(`There is no event with id "${ctx.params.id}".`);
      const related = all.events.filter(e => e.category === event.category && e.id !== event.id).slice(0, 3);
      return { event, related };
    },

    loading: () => html`
      <div class="container detail"><div class="detail-skel" aria-hidden="true">
        <span class="sk sk-tag"></span><span class="sk sk-h1"></span><span class="sk sk-line"></span><span class="sk sk-line"></span><span class="sk sk-line short"></span>
      </div><p class="visually-hidden">Loading event…</p></div>`,

    render: ({ event: e, related }) => {
      const backQuery = S.store.getState().lastEventsQuery;
      return html`
      <div class="container detail">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="${S.router.href('/')}">Home</a></li>
            <li><a href="${S.router.href('/events' + (backQuery ? '?' + backQuery : ''))}">Events</a></li>
            <li><span aria-current="page">${e.title}</span></li>
          </ol>
        </nav>

        <article class="detail-card" aria-labelledby="pageTitle">
          <span class="tag tag-${e.category}">${C.CAT_LABEL[e.category]}</span>
          <h1 id="pageTitle" tabindex="-1">${e.title}</h1>
          <p class="lead">${e.summary}</p>

          <dl class="facts">
            <div><dt>When</dt><dd>${C.DAY_LABEL[e.day]}<br>${C.timeRange(e)}</dd></div>
            <div><dt>Where</dt><dd>${e.venue}</dd></div>
            <div><dt>Level</dt><dd>${e.level}</dd></div>
            <div><dt>Hosted by</dt><dd>${e.host}</dd></div>
          </dl>

          <h2 class="h3">About this session</h2>
          <p>${e.description}</p>

          ${e.bring.length ? html`<h2 class="h3">What to bring</h2><ul class="bring">${e.bring.map(b => html`<li>${b}</li>`)}</ul>` : ''}

          <div class="detail-actions">
            ${C.saveButton(e)}
            <a class="btn btn-primary" href="${S.router.href('/register?event=' + e.id)}">Register for this event</a>
            ${C.seats(e)}
          </div>
        </article>

        ${related.length ? html`
          <section class="related" aria-labelledby="relTitle">
            <h2 id="relTitle">More ${C.CAT_LABEL[e.category].toLowerCase()}s</h2>
            <ul class="card-grid">${related.map(C.eventCard)}</ul>
          </section>` : ''}
      </div>`;
    }
  };
})(window.Spectra);
