/* =========================================================
   About view — "/about"     (venue map + FAQ)
   Not-found view            (any unknown URL or event id)
   Error view                (data failed to load)
   ========================================================= */
'use strict';

(function (S) {
  const { html } = S.utils;

  S.views.about = {
    title: () => "About & FAQ | Spectra '26",
    render: () => html`
      <section class="page-head" aria-labelledby="pageTitle">
        <div class="container">
          <h1 id="pageTitle" tabindex="-1">About Spectra</h1>
          <p class="lead">A student-run symposium built around one idea: you learn faster when you build something with other people.</p>
        </div>
      </section>

      <div class="container">
        <ul class="stats">
          <li class="stat"><span class="stat-num">1,200+</span><span class="stat-label">Participants</span></li>
          <li class="stat"><span class="stat-num">12</span><span class="stat-label">Sessions</span></li>
          <li class="stat"><span class="stat-num">40</span><span class="stat-label">Colleges</span></li>
          <li class="stat"><span class="stat-num">24</span><span class="stat-label">Hackathon hours</span></li>
        </ul>
      </div>

      <section class="section" aria-labelledby="venueTitle">
        <div class="container">
          <h2 id="venueTitle">Venue</h2>
          <figure class="venue">
            <svg class="venue-map" viewBox="0 0 800 500" role="img" aria-labelledby="mapTitle mapDesc">
              <title id="mapTitle">Campus map for Spectra '26</title>
              <desc id="mapDesc">From the Main Gate at the bottom, a central path leads straight up to the Main Hall, where the hackathon is held. Halfway up, a cross path runs left to the Auditorium and right to the Registration Desk. Labs A and B are at the bottom left; Lab C and the Food Court are at the bottom right.</desc>
              <path class="m-path" d="M400 500V300M60 300h680M400 300V60"/>
              <rect class="m-hall" x="300" y="20" width="200" height="110" rx="10"/>
              <rect class="m-bld" x="60" y="160" width="230" height="110" rx="10"/>
              <rect class="m-bld" x="510" y="160" width="230" height="110" rx="10"/>
              <rect class="m-bld" x="60" y="330" width="110" height="90" rx="10"/>
              <rect class="m-bld" x="180" y="330" width="110" height="90" rx="10"/>
              <rect class="m-bld" x="510" y="330" width="110" height="90" rx="10"/>
              <rect class="m-food" x="630" y="330" width="110" height="90" rx="10"/>
              <g class="m-label" aria-hidden="true">
                <text class="m-on-accent" x="400" y="82">Main Hall</text>
                <text x="175" y="222">Auditorium</text>
                <text x="625" y="222">Registration Desk</text>
                <text x="115" y="381">Lab A</text>
                <text x="235" y="381">Lab B</text>
                <text x="565" y="381">Lab C</text>
                <text x="685" y="381" font-size="16">Food Court</text>
                <circle class="m-gate" cx="400" cy="470" r="18"/>
                <path class="m-arrow" d="M400 460l-8 10h5v8h6v-8h5z"/>
                <text x="432" y="476" text-anchor="start" font-size="16">Main Gate</text>
              </g>
            </svg>
            <figcaption>Main Hall: hackathon · Auditorium: talks · Labs A–C: workshops</figcaption>
          </figure>
        </div>
      </section>

      <section class="section section-alt" aria-labelledby="faqTitle">
        <div class="container narrow">
          <h2 id="faqTitle">FAQ</h2>
          ${[
            ['Is there a registration fee?', 'Workshops are free. The hackathon has a ₹200 team fee to cover food for the night.'],
            ['Can first-year students join?', 'Yes. Every session marked "Beginner" assumes no prior experience.'],
            ['Do I need to bring a laptop?', 'For workshops and the hackathon, yes. Talks don’t need one.'],
            ['Is my schedule saved?', 'Yes — My Schedule is stored in your browser on this device. Clearing site data removes it.'],
            ['Is the venue wheelchair accessible?', 'Yes. All halls and labs are on the ground floor with step-free access.']
          ].map(([q, a]) => html`<details class="acc-item" name="faq"><summary>${q}</summary><p>${a}</p></details>`)}
        </div>
      </section>`
  };

  S.views.notFound = {
    title: () => "Page not found | Spectra '26",
    render: (_, ctx) => html`
      <div class="container narrow">
        <section class="status-card" aria-labelledby="pageTitle">
          <p class="status-code" aria-hidden="true">404</p>
          <h1 id="pageTitle" tabindex="-1">We couldn't find that page</h1>
          <p>${ctx.message || `Nothing lives at "${ctx.path}".`} It may have moved, or the link may be mistyped.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${S.router.href('/events')}">Browse events</a>
            <a class="btn btn-ghost" href="${S.router.href('/')}">Go home</a>
          </div>
        </section>
      </div>`
  };

  S.views.error = {
    title: () => "Something went wrong | Spectra '26",
    render: (_, ctx) => html`
      <div class="container narrow">
        <section class="status-card" aria-labelledby="pageTitle">
          <p class="status-code" aria-hidden="true">!</p>
          <h1 id="pageTitle" tabindex="-1">We couldn't load this page</h1>
          <p>${ctx.message || 'The event data did not arrive.'} Check your connection and try again.</p>
          <div class="hero-actions">
            <button type="button" class="btn btn-primary" data-retry>Try again</button>
            <a class="btn btn-ghost" href="${S.router.href('/')}">Go home</a>
          </div>
        </section>
      </div>`
  };
})(window.Spectra);
