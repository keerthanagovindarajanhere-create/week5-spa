/*
 * Event data for Spectra '26.
 *
 * This file is NOT loaded with the page. js/core/api.js injects it on demand
 * the first time a view needs event data, the way an SPA would call an API.
 * It hands its payload to the API layer instead of creating globals, which is
 * why it calls Spectra.api.receive(...).
 *
 * Times are 24-hour "HH:MM" strings so clashes can be checked in My Schedule.
 */
Spectra.api.receive({
  version: 1,
  event: { name: "Spectra '26", start: '2026-11-14T09:00:00+05:30', days: ['Sat 14 Nov', 'Sun 15 Nov'] },
  categories: [
    { id: 'workshop', label: 'Workshops' },
    { id: 'competition', label: 'Competitions' },
    { id: 'talk', label: 'Talks' }
  ],
  events: [
    { id: 1, slug: 'web-dev-from-zero', title: 'Web Dev from Zero', category: 'workshop', level: 'Beginner',
      day: 1, start: '10:00', end: '12:30', venue: 'Lab A', seats: 40, host: 'Frontend Club',
      summary: 'Build and deploy your first responsive website.',
      description: 'Start with an empty folder and finish with a live link. We cover semantic HTML, a responsive layout with Flexbox and Grid, and a small sprinkle of JavaScript, then deploy to GitHub Pages together.',
      bring: ['Laptop', 'GitHub account'] },
    { id: 2, slug: 'git-github-bootcamp', title: 'Git & GitHub Bootcamp', category: 'workshop', level: 'Beginner',
      day: 1, start: '14:00', end: '16:00', venue: 'Lab B', seats: 6, host: 'Open Source Society',
      summary: 'Branches, pull requests and merge conflicts — hands-on.',
      description: 'Practise the Git workflow on a shared repository so the mistakes happen here, not at work: branching, rebasing, resolving merge conflicts and reviewing pull requests.',
      bring: ['Laptop with Git installed'] },
    { id: 3, slug: 'intro-to-ml', title: 'Intro to Machine Learning', category: 'workshop', level: 'Intermediate',
      day: 2, start: '10:00', end: '13:00', venue: 'Lab A', seats: 30, host: 'AI Club',
      summary: 'Train and compare simple models with scikit-learn.',
      description: 'Load a real dataset, explore it, train three classifiers with scikit-learn and compare them properly with cross-validation — with an honest look at where each one fails.',
      bring: ['Laptop with Python 3.10+'] },
    { id: 4, slug: 'hackathon', title: '24-Hour Hackathon', category: 'competition', level: 'All levels',
      day: 1, start: '18:00', end: '23:59', venue: 'Main Hall', seats: 25, host: 'Spectra Core Team',
      summary: 'Build a working prototype in 24 hours.',
      description: 'Teams of up to four build a working prototype around a theme announced at the start. Mentors are around all night, and the final demos are on Day 2 at 5 PM in the Main Hall.',
      bring: ['Laptop', 'Charger', 'Team of 2–4'] },
    { id: 5, slug: 'code-relay', title: 'Code Relay', category: 'competition', level: 'Intermediate',
      day: 1, start: '11:30', end: '13:00', venue: 'Lab C', seats: 4, host: 'Coding Club',
      summary: 'Solve one problem in turns, without talking.',
      description: 'Teammates take turns solving parts of one problem without speaking to each other. Readable code wins, because the next person has to understand it in seconds.',
      bring: ['Team of 3'] },
    { id: 6, slug: 'ui-clone-challenge', title: 'UI Clone Challenge', category: 'competition', level: 'Beginner',
      day: 2, start: '13:00', end: '14:30', venue: 'Lab B', seats: 20, host: 'Design Club',
      summary: 'Recreate a screen in 90 minutes with HTML and CSS.',
      description: 'You get a screenshot of an app screen and 90 minutes. Recreate it as closely as you can using only HTML and CSS. Judged on accuracy, responsiveness and code quality.',
      bring: ['Laptop'] },
    { id: 7, slug: 'first-open-source-pr', title: 'Shipping Your First Open-Source PR', category: 'talk', level: 'All levels',
      day: 1, start: '16:00', end: '17:00', venue: 'Auditorium', seats: 150, host: 'Guest maintainer',
      summary: 'How to find good first issues and get merged.',
      description: 'A maintainer walks through how to pick a project, find a good first issue, communicate with maintainers and write a pull request that actually gets merged.',
      bring: [] },
    { id: 8, slug: 'accessibility-is-a-feature', title: 'Accessibility Is a Feature', category: 'talk', level: 'All levels',
      day: 2, start: '11:00', end: '12:00', venue: 'Auditorium', seats: 150, host: 'Guest speaker',
      summary: 'Why keyboard, contrast and labels matter.',
      description: 'Live demos of common accessibility mistakes — missing labels, low contrast, focus traps — and how a few lines of HTML fix most of them.',
      bring: [] },
    { id: 9, slug: 'careers-panel', title: 'Careers Panel: First Year in Tech', category: 'talk', level: 'All levels',
      day: 2, start: '15:30', end: '16:30', venue: 'Auditorium', seats: 150, host: 'Alumni panel',
      summary: 'Recent graduates on interviews and internships.',
      description: 'Recent graduates talk honestly about interviews, internships and what they wish they had learned earlier. Bring questions — half the session is Q&A.',
      bring: [] },
    { id: 10, slug: 'spa-without-frameworks', title: 'SPAs Without a Framework', category: 'workshop', level: 'Intermediate',
      day: 2, start: '14:00', end: '16:00', venue: 'Lab C', seats: 25, host: 'Frontend Club',
      summary: 'Build a client-side router with the History API.',
      description: 'Build a tiny single page app from scratch: a router on top of the History API, views that load data on demand, and the focus and scroll handling that frameworks usually hide.',
      bring: ['Laptop'] },
    { id: 11, slug: 'opening-keynote', title: 'Opening Keynote', category: 'talk', level: 'All levels',
      day: 1, start: '09:00', end: '09:45', venue: 'Auditorium', seats: 300, host: 'Spectra Core Team',
      summary: 'Welcome, themes and how the two days work.',
      description: 'A short welcome, the hackathon theme reveal, and everything you need to know about the venue, food and schedule.',
      bring: [] },
    { id: 12, slug: 'demo-day', title: 'Hackathon Demo Day', category: 'competition', level: 'All levels',
      day: 2, start: '17:00', end: '19:00', venue: 'Main Hall', seats: 200, host: 'Spectra Core Team',
      summary: 'Hackathon teams present their prototypes.',
      description: 'Every hackathon team gets four minutes to demo. Judges and the audience pick the winners, followed by the closing ceremony.',
      bring: [] }
  ]
});
