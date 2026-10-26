/* =========================================================
   components.js — small pieces of markup reused by several views.
   ========================================================= */
'use strict';

(function (S) {
  S.views = S.views || {};            // every view file adds itself to S.views
  const { html, formatTime } = S.utils;

  const DAY_LABEL = { 1: 'Day 1 · Sat 14 Nov', 2: 'Day 2 · Sun 15 Nov' };
  const CAT_LABEL = { workshop: 'Workshop', competition: 'Competition', talk: 'Talk' };

  const timeRange = e => `${formatTime(e.start)} – ${formatTime(e.end)}`;

  function seats(e) {
    const low = e.seats <= 10;
    return html`<span class="seats${low ? ' low' : ''}">${low ? 'Only ' : ''}${e.seats} seats left</span>`;
  }

  function saveButton(e, { compact = false } = {}) {
    const saved = S.actions.isSaved(e.id);
    return html`
      <button type="button" class="save-btn${compact ? ' compact' : ''}" data-save="${e.id}" aria-pressed="${saved}">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></svg>
        <span class="save-label">${saved ? 'Saved' : 'Save'}</span><span class="visually-hidden"> ${e.title} to My Schedule</span>
      </button>`;
  }

  function eventCard(e, i = 0) {
    return html`
      <li class="card-item" style="--i:${Math.min(i, 8)}">
        <article class="event-card" aria-labelledby="ev-${e.id}">
          <div class="card-top">
            <span class="tag tag-${e.category}">${CAT_LABEL[e.category]}</span>
            ${saveButton(e, { compact: true })}
          </div>
          <h3 id="ev-${e.id}"><a class="card-link" href="${S.router.href('/events/' + e.id)}">${e.title}</a></h3>
          <p class="meta">${DAY_LABEL[e.day]} · ${timeRange(e)}</p>
          <p class="meta">${e.venue} · ${e.level}</p>
          <p class="summary">${e.summary}</p>
          <div class="card-bottom">${seats(e)}<span class="more" aria-hidden="true">View details →</span></div>
        </article>
      </li>`;
  }

  // Placeholder cards shown while data loads, so the layout doesn't jump.
  function skeletonCards(n = 6) {
    return html`<ul class="card-grid" aria-hidden="true">${Array.from({ length: n }, () => html`
      <li><div class="event-card skeleton"><span class="sk sk-tag"></span><span class="sk sk-title"></span><span class="sk sk-line"></span><span class="sk sk-line short"></span></div></li>`)}</ul>`;
  }

  // Keeps every Save button for the same event in sync, wherever it is on screen.
  function syncSaveButtons(scope = document) {
    S.utils.$$('[data-save]', scope).forEach(btn => {
      const saved = S.actions.isSaved(Number(btn.dataset.save));
      btn.setAttribute('aria-pressed', String(saved));
      btn.querySelector('.save-label').textContent = saved ? 'Saved' : 'Save';
    });
  }

  S.components = { DAY_LABEL, CAT_LABEL, timeRange, seats, saveButton, eventCard, skeletonCards, syncSaveButtons };
})(window.Spectra);
