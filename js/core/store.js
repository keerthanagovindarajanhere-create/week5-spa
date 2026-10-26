/* =========================================================
   store.js — one place for the app's shared state.

   Views never talk to each other directly. They read from the
   store, call setState(), and subscribe to changes. When "Save"
   is clicked on an event page, the header badge and the My
   Schedule page update because they subscribed, not because the
   event page knows about them.
   ========================================================= */
'use strict';

(function (S) {
  const { storage } = S.utils;

  function createStore(initial, { persist = [], storageKey = 'spectra-state' } = {}) {
    // Restore only the keys we chose to persist.
    const saved = storage.get(storageKey, {});
    let state = { ...initial };
    persist.forEach(k => { if (saved && k in saved) state[k] = saved[k]; });

    const listeners = new Set();

    function getState() { return state; }

    function setState(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      const prev = state;
      state = { ...state, ...next };

      if (persist.some(k => k in next)) {
        const toSave = {};
        persist.forEach(k => { toSave[k] = state[k]; });
        storage.set(storageKey, toSave);
      }
      listeners.forEach(fn => fn(state, prev));
    }

    // Keep several open tabs in sync: when another tab saves an event,
    // the browser fires a "storage" event here and we apply the change.
    window.addEventListener('storage', e => {
      if (e.key !== storageKey || !e.newValue) return;
      try {
        const incoming = JSON.parse(e.newValue);
        const prev = state;
        state = { ...state, ...incoming };
        listeners.forEach(fn => fn(state, prev));
      } catch { /* ignore malformed data */ }
    });

    // Returns an unsubscribe function, so a view can clean up when it leaves.
    function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

    return { getState, setState, subscribe };
  }

  S.store = createStore(
    {
      saved: [],              // ids of events in "My Schedule"
      draft: {},              // unfinished registration form
      registration: null,     // last confirmed registration
      lastEventsQuery: ''     // so "Back to events" returns to the same filter
    },
    { persist: ['saved', 'draft', 'registration'] }
  );

  /* Small, named actions keep the update logic in one place. */
  S.actions = {
    toggleSaved(id) {
      S.store.setState(s => ({
        saved: s.saved.includes(id) ? s.saved.filter(x => x !== id) : [...s.saved, id]
      }));
    },
    isSaved: id => S.store.getState().saved.includes(id)
  };
})(window.Spectra);
