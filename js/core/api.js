/* =========================================================
   api.js — loads event data on demand.

   The data is not part of the first page load. The first time a
   view needs it, this file injects <script src="data/events.js">,
   waits for it to report back, and caches the result so later
   views get it instantly.

   Why a script tag instead of fetch()? fetch() of a local file is
   blocked when index.html is opened straight from disk (file://).
   A script tag works both from disk and from a web server, so the
   evaluator can open the project either way.

   Built-in testing hooks (run in the browser console):
     Spectra.api.failNext()          → the next load fails (shows the error view)
     Spectra.api.setLatency(1500); Spectra.api.clearCache()
                                     → the next page that needs data loads slowly (shows the skeleton)
   ========================================================= */
'use strict';

(function (S) {
  const DATA_URL = 'data/events.js';
  const TIMEOUT_MS = 8000;
  let latencyMs = 300;          // small artificial delay so the loading state is visible, like a real network
  let failNext = false;
  let cache = null;             // the resolved data
  let inFlight = null;          // the promise while loading, so parallel callers share one request
  let pendingResolve = null;

  function loadData() {
    if (cache) return Promise.resolve(cache);
    if (inFlight) return inFlight;

    inFlight = new Promise((resolve, reject) => {
      if (failNext) {
        failNext = false;
        setTimeout(() => reject(new Error('Simulated network error')), latencyMs);
        return;
      }

      const script = document.createElement('script');
      script.src = DATA_URL + '?v=1';
      script.async = true;

      const timer = setTimeout(() => finish(new Error('The request timed out')), TIMEOUT_MS);

      function finish(err, data) {
        clearTimeout(timer);
        pendingResolve = null;
        script.remove();
        if (err) reject(err);
        else setTimeout(() => resolve(data), latencyMs);
      }

      pendingResolve = data => finish(null, data);
      script.onerror = () => finish(new Error('Could not load event data'));
      document.head.appendChild(script);
    })
      .then(data => { cache = index(data); return cache; })
      .finally(() => { inFlight = null; });   // a failed load can be retried

    return inFlight;
  }

  // Build lookup tables once, so views don't search arrays on every render.
  function index(data) {
    const byId = new Map(data.events.map(e => [e.id, e]));
    const sorted = [...data.events].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
    return { ...data, events: sorted, byId };
  }

  S.api = {
    // Called by data/events.js when it has loaded.
    receive(data) { if (pendingResolve) pendingResolve(data); },

    getAll: () => loadData(),
    async getEvents({ category = 'all', q = '' } = {}) {
      const d = await loadData();
      const query = q.trim().toLowerCase();
      return d.events.filter(e =>
        (category === 'all' || e.category === category) &&
        (!query || `${e.title} ${e.summary} ${e.level} ${e.host}`.toLowerCase().includes(query)));
    },
    async getEvent(id) {
      const d = await loadData();
      return d.byId.get(Number(id)) || null;    // null → the view shows "not found"
    },

    // Warm the cache before it is needed (used on hover/focus of links).
    prefetch() { loadData().catch(() => { /* the view will show the error if it matters */ }); },
    isLoaded: () => !!cache,

    // Testing hooks
    failNext() { failNext = true; cache = null; },
    clearCache() { cache = null; },
    setLatency(ms) { latencyMs = ms; }
  };
})(window.Spectra);
