/* =========================================================
   app.js — wires everything together.

   Flow of one navigation:
     click on a link ─► router.navigate() ─► history.pushState()
        ─► handleRoute() ─► view.load()   (data, may be async)
        ─► view.render()  (HTML string)   ─► swap <main> content
        ─► view.mount()   (event listeners; returns a cleanup function)
        ─► title, active nav link, focus, scroll, screen-reader announcement

   Back/Forward fire "popstate", which runs the same handleRoute().
   ========================================================= */
'use strict';

(function (S) {
  const { $, $$, html, storage, reduceMotion, rafThrottle } = S.utils;
  const outlet = $('#app');

  /* ---------- Special results a view's load() can throw ---------- */
  S.notFoundError = message => Object.assign(new Error(message), { notFound: true });
  S.redirect = to => Object.assign(new Error('redirect'), { redirectTo: to });

  /* ---------- Small UI services used by views ---------- */
  const announcer = $('#announcer');
  const progress = $('#progress');
  let toastTimer;

  S.ui = {
    toast(text, type = '') {
      const t = $('#toast');
      t.textContent = text;
      t.className = `toast show ${type}`;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
    },
    // Screen readers don't notice that <main> changed, so we tell them.
    announce(text) {
      announcer.textContent = '';
      setTimeout(() => { announcer.textContent = text; }, 60);
    }
  };

  /* ---------- Routes ---------- */
  const routes = [
    { path: '/',              view: 'home',         nav: null },
    { path: '/events',        view: 'events',       nav: '/events' },
    { path: '/events/:id',    view: 'eventDetail',  nav: '/events' },
    { path: '/schedule',      view: 'schedule',     nav: '/schedule' },
    { path: '/my-schedule',   view: 'mySchedule',   nav: '/my-schedule' },
    { path: '/register',      view: 'register',     nav: '/register' },
    { path: '/register/done', view: 'registerDone', nav: '/register' },
    { path: '/about',         view: 'about',        nav: '/about' }
  ];
  const notFoundRoute = { path: '*', view: 'notFound', nav: null };

  /* ---------- Rendering ---------- */
  let active = { key: null, view: null, cleanup: null };
  let navId = 0;            // increases on every navigation; older ones check it and give up
  let lastChange = null;

  function swap(markup) {
    if (typeof active.cleanup === 'function') active.cleanup();
    active.cleanup = null;
    outlet.innerHTML = markup;
  }

  async function handleRoute(change) {
    const myId = ++navId;
    lastChange = change;
    const { route, params, query, path, kind } = change;
    const key = route.path + JSON.stringify(params);
    const ctx = { params, query, path, kind };

    setActiveNav(route.nav);
    closeMenu();      // close the mobile menu as soon as navigation starts, not after the page has loaded

    // Same page, only the query changed (?type=talk → ?type=workshop):
    // let the view update itself in place, keeping focus and scroll.
    if (active.key === key && active.view && typeof active.view.update === 'function' && kind !== 'initial') {
      active.view.update(ctx);
      return;
    }

    let view = S.views[route.view];
    let data;

    if (route === notFoundRoute) ctx.message = null;

    if (typeof view.load === 'function') {
      progress.classList.add('active');
      // Only show a skeleton if loading takes a moment, to avoid a flash on fast loads.
      const skeletonTimer = setTimeout(() => {
        if (myId === navId && view.loading) { swap(view.loading(ctx)); active = { key: null, view: null, cleanup: null }; }
      }, 120);
      try {
        data = await view.load(ctx);
      } catch (err) {
        if (myId !== navId) return;
        if (err.redirectTo) { clearTimeout(skeletonTimer); progress.classList.remove('active'); S.router.navigate(err.redirectTo, { replace: true }); return; }
        if (err.notFound) { view = S.views.notFound; ctx.message = err.message; }
        else { view = S.views.error; ctx.message = err.message + '.'; }
      } finally {
        clearTimeout(skeletonTimer);
        if (myId === navId) progress.classList.remove('active');
      }
    }

    // A newer navigation started while we were loading: drop this one.
    if (myId !== navId) return;

    const markup = view.render(data, ctx);
    const commit = () => {
      swap(markup);
      const cleanup = typeof view.mount === 'function' ? view.mount(outlet, ctx, data) : null;
      active = { key: view === S.views[route.view] ? key : null, view, cleanup };
    };

    // View Transitions API gives a smooth cross-fade where supported.
    const animate = kind !== 'initial' && !reduceMotion();
    if (animate && document.startViewTransition) {
      const t = document.startViewTransition(commit);
      try { await t.updateCallbackDone; } catch { /* the DOM still updated */ }
    } else {
      commit();
      if (animate) { outlet.classList.remove('enter'); void outlet.offsetWidth; outlet.classList.add('enter'); }
    }
    if (myId !== navId) return;

    // Title, scroll and focus — the things a full page load would do for free.
    document.title = view.title(ctx, data);
    if (kind === 'pop') window.scrollTo(0, change.scrollY || 0);
    else if (kind !== 'initial') window.scrollTo(0, 0);

    if (kind !== 'initial') {
      const heading = $('#pageTitle', outlet) || outlet;
      heading.focus({ preventScroll: true });
      S.ui.announce(`${document.title.split(' | ')[0]}, page loaded`);
    }
  }

  function setActiveNav(navPath) {
    $$('[data-nav]').forEach(a => {
      if (a.dataset.nav === navPath) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------- Router ---------- */
  S.router = S.createRouter({ routes, notFound: notFoundRoute, onChange: handleRoute });

  // Static links in the header need the right href for the current mode.
  $$('[data-to]').forEach(a => { a.href = S.router.href(a.dataset.to); });

  /* ---------- Global, delegated event handlers ---------- */
  document.addEventListener('click', e => {
    // Save / unsave buttons anywhere in any view
    const save = e.target.closest('[data-save]');
    if (save) {
      const id = Number(save.dataset.save);
      S.actions.toggleSaved(id);
      const title = save.querySelector('.visually-hidden').textContent.replace(' to My Schedule', '').trim();
      S.ui.toast(S.actions.isSaved(id) ? `Saved "${title}" to My Schedule.` : `Removed "${title}" from My Schedule.`);
      return;
    }
    // "Try again" on the error view
    if (e.target.closest('[data-retry]') && lastChange) handleRoute({ ...lastChange, kind: 'retry' });
  });

  // Start loading event data as soon as someone shows interest in a link.
  const prefetch = e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && !S.api.isLoaded() && /events|schedule|register/.test(a.getAttribute('href'))) S.api.prefetch();
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);

  /* ---------- Store → shell (header badge, save buttons) ---------- */
  function renderBadge() {
    const n = S.store.getState().saved.length;
    const badge = $('#savedCount');
    badge.textContent = n;
    badge.hidden = n === 0;
    $('#myScheduleLink').setAttribute('aria-label', n ? `My Schedule, ${n} saved` : 'My Schedule');
  }
  S.store.subscribe((s, prev) => {
    if (s.saved !== prev.saved) { renderBadge(); S.components.syncSaveButtons(); }
  });
  renderBadge();

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const themeToggle = $('#themeToggle');
  const syncTheme = () => themeToggle.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
  syncTheme();
  themeToggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('spectra-theme', root.dataset.theme);
    syncTheme();
  });

  /* ---------- Mobile menu ---------- */
  const navToggle = $('#navToggle');
  const navMenu = $('#navMenu');
  function setMenu(open) {
    navMenu.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  function closeMenu() { if (navMenu.classList.contains('open')) setMenu(false); }
  navToggle.addEventListener('click', () => setMenu(!navMenu.classList.contains('open')));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) { setMenu(false); navToggle.focus(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav')) closeMenu(); });

  /* ---------- Header shadow on scroll ---------- */
  const header = $('#siteHeader');
  window.addEventListener('scroll', rafThrottle(() => header.classList.toggle('scrolled', window.scrollY > 8)), { passive: true });

  /* ---------- Go ---------- */
  S.router.start();
})(window.Spectra);
