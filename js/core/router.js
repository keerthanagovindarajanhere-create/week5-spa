/* =========================================================
   router.js — maps URLs to views without reloading the page.

   Two modes, chosen automatically:
   • "history" (served over http/https): clean URLs like /events/3,
     using history.pushState() and the popstate event.
   • "hash" (opened from disk, file://): URLs like index.html#/events/3,
     because browsers block pushState to new paths on file:// pages.

   Views and the rest of the app never build URLs by hand. They call
   router.href('/events/3') and router.navigate('/events/3'), so the
   same code works in both modes.
   ========================================================= */
'use strict';

(function (S) {
  /* Turn '/events/:id' into a regex and a list of parameter names. */
  function compile(pattern) {
    const keys = [];
    const re = pattern
      .replace(/\/$/, '')
      .replace(/:([a-zA-Z]+)/g, (_, key) => { keys.push(key); return '([^/]+)'; });
    return { regex: new RegExp(`^${re || ''}/?$`), keys };
  }

  function createRouter({ routes, notFound, onChange, onBeforeChange }) {
    const mode = location.protocol === 'file:' ? 'hash' : 'history';

    // The app's root path. On GitHub Pages a project lives under /<repo>/,
    // so the inline script in index.html works this out and stores it.
    const root = mode === 'history' ? (window.__SPA_ROOT__ || '/') : '';

    const table = routes.map(r => ({ ...r, ...compile(r.path) }));

    /* ---------- Reading the current location ---------- */
    function current() {
      let path, search;
      if (mode === 'hash') {
        const h = location.hash.slice(1) || '/';           // "#/events?type=talk" → "/events?type=talk"
        [path, search = ''] = h.split('?');
        search = search ? '?' + search : '';
      } else {
        path = '/' + location.pathname.slice(root.length);
        search = location.search;
      }
      if (path === '/index.html') path = '/';               // opened as .../index.html
      path = path.replace(/\/{2,}/g, '/');
      try { path = decodeURI(path); } catch { /* keep the raw path */ }
      return { path, query: new URLSearchParams(search) };
    }

    function match(path) {
      for (const r of table) {
        const m = path.match(r.regex);
        if (m) {
          const params = {};
          r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
          return { route: r, params };
        }
      }
      return { route: notFound, params: {} };
    }

    /* ---------- Building URLs ---------- */
    function href(to) {
      if (mode === 'hash') return '#' + to;
      return root + to.replace(/^\//, '');
    }

    /* ---------- Navigating ---------- */
    function navigate(to, { replace = false, state = {} } = {}) {
      const url = href(to);
      // Remember where we were scrolled before leaving this entry.
      saveScroll();
      if (replace) history.replaceState({ ...state, scrollY: 0 }, '', url);
      else history.pushState({ ...state, scrollY: 0 }, '', url);
      resolve({ kind: replace ? 'replace' : 'push' });
    }

    // Update the URL's query string without creating a history entry or
    // re-rendering (used while typing in the search box).
    function setQuery(params) {
      const { path } = current();
      const qs = new URLSearchParams(params);
      [...qs.keys()].forEach(k => { if (!qs.get(k)) qs.delete(k); });
      const str = qs.toString();
      history.replaceState(history.state, '', href(path + (str ? '?' + str : '')));
    }

    function saveScroll() {
      history.replaceState({ ...(history.state || {}), scrollY: window.scrollY }, '');
    }

    function resolve({ kind }) {
      const loc = current();
      const { route, params } = match(loc.path);
      const scrollY = kind === 'pop' ? (history.state && history.state.scrollY) || 0 : 0;
      onChange({ route, params, query: loc.query, path: loc.path, kind, scrollY });
    }

    /* ---------- Link interception ---------- */
    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]');
      if (!a || a.target || a.hasAttribute('download') || a.dataset.external !== undefined) return;

      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;           // external link: let the browser handle it

      let to;
      if (mode === 'hash') {
        if (url.pathname !== location.pathname || !url.hash.startsWith('#/')) return;
        to = url.hash.slice(1);
      } else {
        if (!url.pathname.startsWith(root)) return;
        to = '/' + url.pathname.slice(root.length) + url.search;
      }

      e.preventDefault();
      if (onBeforeChange && onBeforeChange(to) === false) return;
      const here = current();
      const sameUrl = to === here.path + (here.query.toString() ? '?' + here.query : '');
      navigate(to, { replace: sameUrl });
    }

    function start() {
      history.scrollRestoration = 'manual';     // we restore scroll ourselves after each render
      document.addEventListener('click', onClick);
      window.addEventListener('popstate', () => resolve({ kind: 'pop' }));

      // Deep link arriving through 404.html (GitHub Pages): put the real URL back.
      let redirect = null;
      try { redirect = sessionStorage.getItem('spa-redirect'); sessionStorage.removeItem('spa-redirect'); } catch { /* ignore */ }
      if (redirect && mode === 'history') history.replaceState(null, '', root + redirect.replace(/^\//, ''));

      resolve({ kind: 'initial' });
    }

    return { start, navigate, href, current, setQuery, mode, root };
  }

  S.createRouter = createRouter;
})(window.Spectra);
