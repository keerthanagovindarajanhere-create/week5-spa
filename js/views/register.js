/* =========================================================
   Register view — "/register?event=4"
   and confirmation view — "/register/done"

   The form keeps a draft in the store as you type, so you can go
   and check an event's details and come back without losing what
   you entered (or even close the tab).
   ========================================================= */
'use strict';

(function (S) {
  const { html, $, debounce } = S.utils;

  const FIELDS = ['fullName', 'email', 'phone', 'college', 'event', 'agree'];
  const rules = {
    fullName: v => !v.trim() ? 'Please enter your name.'
      : !/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(v.trim()) ? 'Use letters only (2–50 characters).' : '',
    email: v => !v.trim() ? 'Please enter your email.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Enter an email like name@example.com.' : '',
    phone: v => !v ? 'Please enter your phone number.'
      : !/^[6-9]\d{9}$/.test(v) ? 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.' : '',
    college: v => v.trim().length < 3 ? 'Please enter your college name.' : '',
    event: v => !v ? 'Please choose an event.' : '',
    agree: (_, el) => !el.checked ? 'Please accept the code of conduct to continue.' : ''
  };

  const field = (id, label, type, extra = {}) => html`
    <div class="field">
      <label for="${id}">${label} <span aria-hidden="true">*</span></label>
      <input id="${id}" name="${id}" type="${type}" required aria-describedby="${id}Error"
        ${extra.autocomplete ? html`autocomplete="${extra.autocomplete}"` : ''} ${extra.inputmode ? html`inputmode="${extra.inputmode}"` : ''}>
      <small class="error-msg" id="${id}Error"></small>
    </div>`;

  S.views.register = {
    title: () => "Register | Spectra '26",
    load: () => S.api.getAll(),
    loading: () => html`<section class="page-head"><div class="container"><h1 id="pageTitle" tabindex="-1">Register</h1><p class="lead">Loading…</p></div></section>`,

    render: all => html`
      <section class="page-head" aria-labelledby="pageTitle">
        <div class="container narrow">
          <h1 id="pageTitle" tabindex="-1">Register</h1>
          <p class="lead" id="formHint">One form for both days. Fields marked <span aria-hidden="true">*</span><span class="visually-hidden">as required</span> are required. Your answers are kept as a draft if you leave this page.</p>
        </div>
      </section>
      <div class="container narrow">
        <form class="reg-form" id="regForm" novalidate aria-describedby="formHint">
          <div class="form-row">
            ${field('fullName', 'Full name', 'text', { autocomplete: 'name' })}
            ${field('email', 'Email', 'email', { autocomplete: 'email' })}
          </div>
          <div class="form-row">
            ${field('phone', 'Phone (10 digits)', 'tel', { autocomplete: 'tel-national', inputmode: 'numeric' })}
            ${field('college', 'College', 'text', { autocomplete: 'organization' })}
          </div>
          <div class="field">
            <label for="event">Main event <span aria-hidden="true">*</span></label>
            <select id="event" name="event" required aria-describedby="eventError">
              <option value="">Choose an event</option>
              ${all.events.map(e => html`<option value="${e.id}">${e.title}</option>`)}
            </select>
            <small class="error-msg" id="eventError"></small>
          </div>
          <div class="field">
            <div class="checkbox">
              <input type="checkbox" id="agree" name="agree" required aria-describedby="agreeError">
              <label for="agree">I agree to follow the event code of conduct <span aria-hidden="true">*</span></label>
            </div>
            <small class="error-msg" id="agreeError"></small>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="submitBtn">Submit registration</button>
            <button type="button" class="btn btn-ghost" id="clearBtn">Clear form</button>
          </div>
        </form>
      </div>`,

    mount(el, ctx, all) {
      const form = $('#regForm', el);
      const draft = S.store.getState().draft || {};

      // Restore the draft, then let ?event= from an event page override the choice.
      FIELDS.forEach(name => {
        const input = form.elements[name];
        if (!(name in draft)) return;
        if (input.type === 'checkbox') input.checked = !!draft[name]; else input.value = draft[name];
      });
      const fromUrl = ctx.query.get('event');
      if (fromUrl && all.byId.has(Number(fromUrl))) form.elements.event.value = fromUrl;

      function validate(input) {
        const error = rules[input.name](input.value, input);
        $(`#${input.id}Error`, form).textContent = error;
        const f = input.closest('.field');
        f.classList.toggle('invalid', !!error);
        f.classList.toggle('valid', !error && input.type !== 'checkbox');
        if (error) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
        return !error;
      }

      let submitted = false;
      const saveDraft = debounce(() => {
        if (submitted) return;               // don't bring back a draft we just cleared
        const d = {};
        FIELDS.forEach(n => { const i = form.elements[n]; d[n] = i.type === 'checkbox' ? i.checked : i.value; });
        S.store.setState({ draft: d });
      }, 300);

      form.elements.phone.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); });

      FIELDS.forEach(name => {
        const input = form.elements[name];
        const instant = input.type === 'checkbox' || input.tagName === 'SELECT';
        input.addEventListener('blur', () => validate(input));
        input.addEventListener(instant ? 'change' : 'input', () => {
          if (instant || input.closest('.field').classList.contains('invalid')) validate(input);
          saveDraft();
        });
      });

      $('#clearBtn', el).addEventListener('click', () => {
        form.reset();
        form.querySelectorAll('.field').forEach(f => f.classList.remove('valid', 'invalid'));
        form.querySelectorAll('.error-msg').forEach(m => { m.textContent = ''; });
        form.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
        S.store.setState({ draft: {} });
        form.elements.fullName.focus();
        S.ui.toast('Form cleared.');
      });

      form.addEventListener('submit', e => {
        e.preventDefault();
        const invalid = FIELDS.map(n => form.elements[n]).filter(i => !validate(i));
        if (invalid.length) {
          S.ui.toast(`Please fix ${invalid.length} field${invalid.length > 1 ? 's' : ''} before submitting.`, 'error');
          invalid[0].focus();
          return;
        }
        const btn = $('#submitBtn', form);
        btn.disabled = true;
        btn.textContent = 'Submitting…';
        submitted = true;
        // No backend for this task: simulate a short request, then move to the confirmation route.
        setTimeout(() => {
          const ev = all.byId.get(Number(form.elements.event.value));
          S.store.setState({
            draft: {},
            registration: {
              name: form.elements.fullName.value.trim(), email: form.elements.email.value.trim(),
              eventId: ev.id, eventTitle: ev.title, ref: 'SP26-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
              at: new Date().toISOString()
            }
          });
          S.router.navigate('/register/done');
        }, 700);
      });

      return () => saveDraft();   // flush any pending draft when leaving
    }
  };

  S.views.registerDone = {
    title: () => "You're registered | Spectra '26",
    // Route guard: this page only makes sense after a registration.
    load() {
      const reg = S.store.getState().registration;
      if (!reg) throw S.redirect('/register');
      return reg;
    },
    render: reg => html`
      <div class="container narrow">
        <section class="done-card" aria-labelledby="pageTitle">
          <div class="done-icon" aria-hidden="true">✓</div>
          <h1 id="pageTitle" tabindex="-1">You're in, ${reg.name.split(' ')[0]}!</h1>
          <p>We've noted your registration for <strong>${reg.eventTitle}</strong>. Your reference is <strong class="ref">${reg.ref}</strong>.</p>
          <p class="muted">A confirmation would go to ${reg.email} — this demo has no backend, so nothing is actually sent.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${S.router.href('/events/' + reg.eventId)}">View your event</a>
            <a class="btn btn-ghost" href="${S.router.href('/my-schedule')}">Plan My Schedule</a>
          </div>
        </section>
      </div>`
  };
})(window.Spectra);
