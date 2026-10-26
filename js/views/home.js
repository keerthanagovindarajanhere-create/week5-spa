/* =========================================================
   Home view — "/"
   The hero renders instantly; the featured events are loaded
   after mount and fill in their own section, so the page never
   waits for data before showing something useful.
   ========================================================= */
'use strict';

(function (S) {
  const { html, $, reduceMotion } = S.utils;
  const C = S.components;
  const EVENT_START = new Date('2026-11-14T09:00:00+05:30');
  const FEATURED = [4, 10, 8];

  S.views = S.views || {};
  S.views.home = {
    title: () => "Spectra '26 | Student Tech Symposium",

    render: () => html`
      <section class="hero" aria-labelledby="pageTitle">
        <div class="container">
          <p class="eyebrow">Student Tech Symposium · <time datetime="2026-11-14">14</time>–<time datetime="2026-11-15">15 Nov 2026</time></p>
          <h1 id="pageTitle" tabindex="-1">Build. Break. <span class="accent">Learn.</span></h1>
          <p class="hero-sub">Two days of hands-on workshops, a 24-hour hackathon and talks from people who actually ship things.</p>

          <div role="timer" aria-label="Time left until Spectra starts">
            <ul class="countdown">
              <li class="cd-box"><span data-cd="d">--</span><small>Days</small></li>
              <li class="cd-box"><span data-cd="h">--</span><small>Hours</small></li>
              <li class="cd-box"><span data-cd="m">--</span><small>Minutes</small></li>
              <li class="cd-box"><span data-cd="s">--</span><small>Seconds</small></li>
            </ul>
          </div>

          <div class="hero-actions">
            <a class="btn btn-primary" href="${S.router.href('/register')}">Register now</a>
            <a class="btn btn-ghost" href="${S.router.href('/events')}" data-prefetch>Browse events</a>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="featTitle">
        <div class="container">
          <div class="section-head">
            <h2 id="featTitle">Featured this year</h2>
            <a class="text-link" href="${S.router.href('/events')}" data-prefetch>All 12 events →</a>
          </div>
          <div id="featured">${C.skeletonCards(3)}</div>
        </div>
      </section>

      <section class="section section-alt" aria-labelledby="howTitle">
        <div class="container">
          <h2 id="howTitle">Plan your two days</h2>
          <ol class="steps">
            <li><strong>Browse</strong> the workshops, talks and competitions.</li>
            <li><strong>Save</strong> the ones you like — they appear in My Schedule, which warns you about clashes.</li>
            <li><strong>Register</strong> once and pick your main event.</li>
          </ol>
        </div>
      </section>`,

    mount(el) {
      /* Countdown — the interval is cleared when the view unmounts,
         otherwise it would keep running on every other page. */
      const boxes = { d: $('[data-cd="d"]', el), h: $('[data-cd="h"]', el), m: $('[data-cd="m"]', el), s: $('[data-cd="s"]', el) };
      const pad = n => String(n).padStart(2, '0');
      const set = (node, val) => {
        if (node.textContent === val) return;
        node.textContent = val;
        if (!reduceMotion() && node.animate) node.animate([{ transform: 'translateY(-6px)' }, { transform: 'none' }], { duration: 300 });
      };
      function tick() {
        const diff = EVENT_START - Date.now();
        if (diff <= 0) { boxes.d.closest('[role=timer]').innerHTML = '<p class="hero-sub">Spectra is live!</p>'; clearInterval(timer); return; }
        set(boxes.d, pad(Math.floor(diff / 864e5)));
        set(boxes.h, pad(Math.floor(diff / 36e5) % 24));
        set(boxes.m, pad(Math.floor(diff / 6e4) % 60));
        set(boxes.s, pad(Math.floor(diff / 1e3) % 60));
      }
      tick();
      let timer = setInterval(tick, 1000);
      const onVisibility = () => { clearInterval(timer); if (!document.hidden) { tick(); timer = setInterval(tick, 1000); } };
      document.addEventListener('visibilitychange', onVisibility);

      /* Featured events load after the hero is already on screen. */
      let alive = true;
      S.api.getAll().then(d => {
        if (!alive) return;                      // user already left this page
        const list = FEATURED.map(id => d.byId.get(id));
        $('#featured', el).innerHTML = html`<ul class="card-grid">${list.map(C.eventCard)}</ul>`;
      }).catch(() => {
        if (!alive) return;
        $('#featured', el).innerHTML = html`<p class="inline-error">Couldn't load events right now. <a href="${S.router.href('/events')}">Try the events page</a>.</p>`;
      });

      return () => {                              // cleanup on leaving the view
        alive = false;
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }
  };
})(window.Spectra);
