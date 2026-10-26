/* =========================================================
   utils.js — small helpers shared by every other file.

   All app code hangs off one global namespace, `Spectra`, so the
   files can be plain <script defer> tags. That keeps the app
   working even when index.html is opened by double-clicking it
   (file://), where ES modules are blocked by the browser.
   ========================================================= */
'use strict';

window.Spectra = window.Spectra || {};

(function (S) {
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

  /* ---------- Safe HTML templating ----------
     html`<p>${userText}</p>` escapes every interpolated value, so data can
     never inject markup. Nested html`` results and arrays are inserted as-is,
     because they were already escaped when they were built.               */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHTML = v => String(v).replace(/[&<>"']/g, ch => ESC[ch]);

  class SafeHTML { constructor(str) { this.str = str; } toString() { return this.str; } }

  function renderValue(v) {
    if (v == null || v === false) return '';
    if (v instanceof SafeHTML) return v.str;
    if (Array.isArray(v)) return v.map(renderValue).join('');
    return escapeHTML(v);
  }

  function html(strings, ...values) {
    let out = strings[0];
    values.forEach((v, i) => { out += renderValue(v) + strings[i + 1]; });
    return new SafeHTML(out);
  }

  /* ---------- Timing helpers ---------- */
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  function rafThrottle(fn) {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(); });
    };
  }

  /* ---------- Storage that never throws ---------- */
  const storage = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* blocked */ } }
  };

  /* ---------- Time helpers for the schedule ---------- */
  const toMinutes = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  function formatTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  S.utils = { $, $$, html, escapeHTML, SafeHTML, debounce, rafThrottle, storage, toMinutes, formatTime, reduceMotion };
})(window.Spectra);
