/* =========================================================
   Schedule view — "/schedule?day=2"
   and My Schedule view — "/my-schedule"
   ========================================================= */
'use strict';

(function (S) {
  const { html, $, toMinutes } = S.utils;
  const C = S.components;

  function slot(e) {
    const saved = S.actions.isSaved(e.id);
    return html`
      <li class="slot${saved ? ' is-saved' : ''}" data-slot="${e.id}">
        <div class="slot-time"><time>${S.utils.formatTime(e.start)}</time><span>${S.utils.formatTime(e.end)}</span></div>
        <div class="slot-body">
          <span class="tag tag-${e.category}">${C.CAT_LABEL[e.category]}</span>
          <h3><a href="${S.router.href('/events/' + e.id)}">${e.title}</a></h3>
          <p class="meta">${e.venue} · ${e.level}</p>
        </div>
        ${C.saveButton(e, { compact: true })}
      </li>`;
  }

  /* ---------------- Full schedule ---------------- */
  S.views.schedule = {
    title: () => "Schedule | Spectra '26",
    async load(ctx) {
      const day = ctx.query.get('day') === '2' ? 2 : 1;
      const all = await S.api.getAll();
      return { day, all };
    },
    loading: () => html`<section class="page-head"><div class="container"><h1 id="pageTitle" tabindex="-1">Schedule</h1><p class="lead">Loading…</p></div></section>`,

    render: ({ day, all }) => html`
      <section class="page-head" aria-labelledby="pageTitle">
        <div class="container">
          <h1 id="pageTitle" tabindex="-1">Schedule</h1>
          <p class="lead">Everything in time order. Tap the bookmark to add a session to My Schedule.</p>
        </div>
      </section>
      <div class="container narrow">
        <nav class="day-switch" aria-label="Choose a day">
          ${[1, 2].map(d => html`<a href="${S.router.href('/schedule' + (d === 2 ? '?day=2' : ''))}" data-day="${d}" ${d === day ? html`aria-current="true"` : ''}>${C.DAY_LABEL[d]}</a>`)}
        </nav>
        <h2 class="visually-hidden" id="dayHeading">${C.DAY_LABEL[day]} sessions</h2>
        <ol class="timeline" id="timeline" aria-labelledby="dayHeading">${all.events.filter(e => e.day === day).map(slot)}</ol>
      </div>`,

    mount(el) {
      // Only the query changed (Day 1 ↔ Day 2): swap the list, keep focus where it is.
      this.update = async next => {
        const day = next.query.get('day') === '2' ? 2 : 1;
        const all = await S.api.getAll();
        el.querySelectorAll('[data-day]').forEach(a => {
          if (Number(a.dataset.day) === day) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
        $('#dayHeading', el).textContent = `${C.DAY_LABEL[day]} sessions`;
        $('#timeline', el).innerHTML = html`${all.events.filter(e => e.day === day).map(slot)}`;
      };
      const unsub = S.store.subscribe((s, prev) => {
        if (s.saved === prev.saved) return;
        el.querySelectorAll('[data-slot]').forEach(li => li.classList.toggle('is-saved', s.saved.includes(Number(li.dataset.slot))));
      });
      return () => { unsub(); this.update = null; };
    }
  };

  /* ---------------- My Schedule ---------------- */
  function findClashes(events) {
    const clashes = new Set();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i], b = events[j];
        if (a.day === b.day && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)) {
          clashes.add(a.id); clashes.add(b.id);
        }
      }
    }
    return clashes;
  }

  function myScheduleBody(all) {
    const saved = S.store.getState().saved.map(id => all.byId.get(id)).filter(Boolean)
      .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));

    if (!saved.length) {
      return html`
        <div class="empty">
          <p><strong>Your schedule is empty.</strong></p>
          <p>Save sessions from the events list or the schedule and they'll show up here.</p>
          <a class="btn btn-primary" href="${S.router.href('/events')}">Browse events</a>
        </div>`;
    }

    const clashes = findClashes(saved);
    return html`
      ${clashes.size ? html`<p class="notice warn" role="note"><strong>Heads up:</strong> ${clashes.size} saved sessions overlap. They're marked below.</p>` : ''}
      ${[1, 2].map(day => {
        const items = saved.filter(e => e.day === day);
        if (!items.length) return '';
        return html`
          <h2 class="day-title">${C.DAY_LABEL[day]}</h2>
          <ol class="timeline">${items.map(e => html`
            <li class="slot${clashes.has(e.id) ? ' clash' : ''}">
              <div class="slot-time"><time>${S.utils.formatTime(e.start)}</time><span>${S.utils.formatTime(e.end)}</span></div>
              <div class="slot-body">
                <h3><a href="${S.router.href('/events/' + e.id)}">${e.title}</a></h3>
                <p class="meta">${e.venue}${clashes.has(e.id) ? html` · <span class="clash-label">Overlaps another session</span>` : ''}</p>
              </div>
              <button type="button" class="remove-btn" data-remove="${e.id}">Remove<span class="visually-hidden"> ${e.title}</span></button>
            </li>`)}</ol>`;
      })}`;
  }

  S.views.mySchedule = {
    title: () => "My Schedule | Spectra '26",
    load: () => S.api.getAll(),
    loading: () => html`<section class="page-head"><div class="container"><h1 id="pageTitle" tabindex="-1">My Schedule</h1><p class="lead">Loading…</p></div></section>`,

    render: all => html`
      <section class="page-head" aria-labelledby="pageTitle">
        <div class="container">
          <h1 id="pageTitle" tabindex="-1">My Schedule</h1>
          <p class="lead">Saved on this device, so it's still here when you come back.</p>
        </div>
      </section>
      <div class="container narrow" id="mySchedule">${myScheduleBody(all)}</div>`,

    mount(el, ctx, all) {
      const box = $('#mySchedule', el);

      box.addEventListener('click', e => {
        const btn = e.target.closest('[data-remove]');
        if (!btn) return;
        // Work out where focus should go *before* the list is re-rendered,
        // otherwise keyboard focus would be lost with the removed button.
        const li = btn.closest('li');
        const neighbour = (li.nextElementSibling || li.previousElementSibling);
        const nextId = neighbour && neighbour.querySelector('[data-remove]') && neighbour.querySelector('[data-remove]').dataset.remove;
        const id = Number(btn.dataset.remove);
        const title = all.byId.get(id).title;
        S.actions.toggleSaved(id);                 // store update → list re-renders below
        S.ui.toast(`Removed "${title}" from My Schedule.`);
        const target = nextId && box.querySelector(`[data-remove="${nextId}"]`);
        (target || $('h1', el)).focus();
      });

      // Re-render whenever the saved list changes — including changes made in another browser tab (see store.js).
      const unsub = S.store.subscribe((s, prev) => {
        if (s.saved !== prev.saved) box.innerHTML = myScheduleBody(all);
      });
      return unsub;
    }
  };

  S.schedule = { findClashes };
})(window.Spectra);
