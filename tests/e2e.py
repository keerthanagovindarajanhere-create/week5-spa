"""
End-to-end tests for the Spectra '26 SPA (Playwright + Chromium).

    pip install playwright && python -m playwright install chromium
    npx serve . -l 8095          # in another terminal, from the project folder
    python tests/e2e.py          # or: python tests/e2e.py http://localhost:8095/

Each check prints PASS/FAIL; the script exits with code 1 if anything failed.
"""
import pathlib, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8095/'
INDEX_FILE = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond)))
    print(f"{'PASS' if cond else 'FAIL'}  {name}" + (f'  ({detail})' if detail else ''))

def page_errors(pg):
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    return errs

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---------- 1. Routing, titles, active nav, focus ----------
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    pg = ctx.new_page(); errs = page_errors(pg)
    pg.goto(BASE); pg.wait_for_selector('#featured .card-link')
    check('Home renders featured events after the hero', pg.locator('#featured .card-link').count() == 3)
    start_len = pg.evaluate('history.length')

    pg.click('.nav-link[data-nav="/events"]'); pg.wait_for_selector('.card-link >> nth=11')
    check('Events link changes URL without reload', pg.url == BASE + 'events')
    check('Document title updates', pg.title().startswith('Events'))
    check('Nav link marked aria-current="page"', pg.get_attribute('[data-nav="/events"]', 'aria-current') == 'page')
    check('Focus moves to the new page heading', pg.evaluate('document.activeElement.id') == 'pageTitle')
    pg.wait_for_timeout(150)
    check('Page change is announced to screen readers', 'Events' in pg.inner_text('#announcer'))
    check('Navigation created a history entry', pg.evaluate('history.length') == start_len + 1)

    # ---------- 2. URL-driven filters and search ----------
    pg.click('.filter[data-type=talk]'); pg.wait_for_timeout(400)
    check('Filter link updates the query string', pg.url.endswith('events?type=talk'))
    check('Filter shows only talks', pg.locator('.event-card').count() == 4)
    search_handle = pg.query_selector('#eventSearch')
    pg.go_back(); pg.wait_for_timeout(400)
    check('Back restores the previous filter', pg.locator('.event-card').count() == 12 and pg.url.endswith('/events'))
    check('Query-only change updates in place (search box not re-created)', pg.evaluate('el => el.isConnected', search_handle))
    len_before = pg.evaluate('history.length')
    pg.fill('#eventSearch', 'git'); pg.wait_for_timeout(500)
    check('Search writes ?q= to the URL', 'q=git' in pg.url)
    check('Typing does not add history entries', pg.evaluate('history.length') == len_before)
    pg.reload(); pg.wait_for_selector('.result-count')
    check('Reload keeps the search results', pg.input_value('#eventSearch') == 'git' and pg.locator('.event-card').count() >= 1)

    # ---------- 3. Scroll restoration ----------
    pg.goto(BASE + 'events'); pg.wait_for_selector('.card-link >> nth=11')
    pg.evaluate('window.scrollTo(0, 700)'); pg.wait_for_timeout(200)
    saved_y = pg.evaluate('window.scrollY')
    # el.click() instead of Playwright's click(), which would scroll the link into view first
    pg.locator('.card-link').nth(8).evaluate('el => el.click()'); pg.wait_for_selector('.detail-card')
    check('New page starts at the top', pg.evaluate('window.scrollY') == 0)
    pg.go_back(); pg.wait_for_selector('.card-link >> nth=11'); pg.wait_for_timeout(300)
    check('Back restores the previous scroll position', abs(pg.evaluate('window.scrollY') - saved_y) < 2, f"{saved_y} → {pg.evaluate('window.scrollY')}")
    pg.go_forward(); pg.wait_for_selector('.detail-card')
    check('Forward works', '/events/' in pg.url)

    # ---------- 4. Deep links and 404 ----------
    for path, h1 in [('events/4', '24-Hour Hackathon'), ('schedule?day=2', 'Schedule'), ('about', 'About Spectra'), ('my-schedule', 'My Schedule')]:
        pg.goto(BASE + path); pg.wait_for_selector('#pageTitle')
        check(f'Deep link /{path} opens the right view', pg.inner_text('#pageTitle') == h1 and pg.url == BASE + path)
    pg.goto(BASE + 'does/not/exist'); pg.wait_for_selector('#pageTitle')
    check('Unknown URL shows the 404 view', 'find that page' in pg.inner_text('#pageTitle'))
    pg.goto(BASE + 'events/999'); pg.wait_for_selector('#pageTitle')
    check('Unknown event id shows the 404 view', 'find that page' in pg.inner_text('#pageTitle'))

    # ---------- 5. Error handling and retry ----------
    pg.goto(BASE); pg.wait_for_selector('#featured .card-link')
    # Navigate in code: hovering a link would prefetch and use up the simulated failure.
    pg.evaluate("Spectra.api.failNext(); Spectra.router.navigate('/schedule')"); pg.wait_for_selector('[data-retry]')
    check('Failed data load shows the error view', "couldn't load" in pg.inner_text('#pageTitle').lower())
    pg.click('[data-retry]'); pg.wait_for_selector('.timeline .slot')
    check('"Try again" recovers', pg.inner_text('#pageTitle') == 'Schedule')

    # ---------- 6. Race condition: a slow page must not overwrite a newer one ----------
    pg.goto(BASE); pg.wait_for_selector('#featured .card-link')
    pg.evaluate('Spectra.api.failNext(); Spectra.api.setLatency(900)')   # clears the cache → next load is slow
    pg.evaluate("Spectra.router.navigate('/events')")
    pg.wait_for_timeout(100)
    pg.evaluate("Spectra.router.navigate('/about')")
    pg.wait_for_timeout(1400)
    check('Slow earlier navigation is discarded', pg.inner_text('#pageTitle') == 'About Spectra' and pg.url.endswith('/about'))
    pg.evaluate('Spectra.api.setLatency(300)')

    # ---------- 7. Shared state: save, badge, clashes, persistence ----------
    pg.evaluate('localStorage.clear()'); pg.goto(BASE + 'events'); pg.wait_for_selector('.card-link >> nth=11')
    for eid in (1, 5):   # Web Dev 10:00–12:30 and Code Relay 11:30–13:00 overlap on Day 1
        pg.click(f'.event-card [data-save="{eid}"]')
    check('Header badge counts saved events', pg.inner_text('#savedCount') == '2')
    check('Save button reports state (aria-pressed)', pg.get_attribute('[data-save="1"]', 'aria-pressed') == 'true')
    pg.goto(BASE + 'events/1'); pg.wait_for_selector('.detail-card')
    check('Saved state is shared across views', pg.get_attribute('.detail-actions [data-save]', 'aria-pressed') == 'true')
    pg.goto(BASE + 'my-schedule'); pg.wait_for_selector('.slot')
    check('My Schedule lists saved events after reload', pg.locator('.slot').count() == 2)
    check('Clash between overlapping sessions is flagged', pg.locator('.slot.clash').count() == 2)
    pg.locator('[data-remove]').first.click(); pg.wait_for_timeout(200)
    check('Removing updates list and badge', pg.locator('.slot').count() == 1 and pg.inner_text('#savedCount') == '1')
    check('Focus moves to the next Remove button', pg.evaluate("document.activeElement.matches('[data-remove]')"))

    # Cross-tab sync
    other = ctx.new_page(); other.goto(BASE + 'events'); other.wait_for_selector('.card-link >> nth=11')
    other.click('.event-card [data-save="7"]'); pg.wait_for_timeout(400)
    check('Another tab\'s change appears here (storage event)', pg.inner_text('#savedCount') == '2' and pg.locator('.slot').count() == 2)
    other.close()

    # ---------- 8. Register: prefill, draft, validation, guard ----------
    pg.goto(BASE + 'events/10'); pg.wait_for_selector('.detail-card')
    pg.click('text=Register for this event'); pg.wait_for_selector('#regForm')
    check('Event page pre-selects the event in the form', pg.input_value('#event') == '10')
    pg.fill('#fullName', 'Keerthana G'); pg.fill('#email', 'k@example.com'); pg.wait_for_timeout(400)
    pg.click('.nav-link[data-nav="/about"]'); pg.wait_for_selector('.venue')
    pg.go_back(); pg.wait_for_selector('#regForm')
    check('Draft survives leaving and coming back', pg.input_value('#fullName') == 'Keerthana G' and pg.input_value('#email') == 'k@example.com')
    pg.click('#submitBtn'); pg.wait_for_timeout(200)
    check('Invalid submit focuses the first invalid field', pg.evaluate('document.activeElement.id') == 'phone')
    check('Errors are linked to fields', pg.evaluate("document.getElementById(document.getElementById('phone').getAttribute('aria-describedby')).textContent") != '')
    pg.fill('#phone', '98765 43210'); pg.fill('#college', 'KPRIET'); pg.check('#agree')
    pg.click('#submitBtn'); pg.wait_for_url('**/register/done'); pg.wait_for_selector('.done-card')
    check('Successful submit routes to /register/done', "You're in" in pg.inner_text('#pageTitle'))
    pg.goto(BASE + 'register'); pg.wait_for_selector('#regForm')
    check('Draft is cleared after a successful submit', pg.input_value('#fullName') == '')
    pg.evaluate('localStorage.clear()'); pg.goto(BASE + 'register/done'); pg.wait_for_selector('#regForm')
    check('Route guard: /register/done without a registration redirects', pg.url == BASE + 'register')

    # ---------- 9. No leaks: the home countdown stops when you leave ----------
    leak = ctx.new_page()
    leak.add_init_script("""(() => { window.__active = new Set();
      const si = window.setInterval, ci = window.clearInterval;
      window.setInterval = (...a) => { const id = si(...a); window.__active.add(id); return id; };
      window.clearInterval = id => { window.__active.delete(id); return ci(id); }; })();""")
    leak.goto(BASE); leak.wait_for_selector('#featured .card-link')
    on_home = leak.evaluate('window.__active.size')
    leak.click('.nav-link[data-nav="/about"]'); leak.wait_for_selector('.venue')
    check('Leaving Home clears its countdown interval', on_home >= 1 and leak.evaluate('window.__active.size') == 0, f'{on_home} → {leak.evaluate("window.__active.size")}')
    leak.close()

    check('No JavaScript errors during the run', not errs, '; '.join(errs))
    ctx.close()

    # ---------- 10. Mobile layout and menu ----------
    m = browser.new_page(viewport={'width': 390, 'height': 844})
    m.goto(BASE + 'events'); m.wait_for_selector('.card-link')
    check('No horizontal scrolling at 390px', m.evaluate('document.documentElement.scrollWidth') <= 390)
    check('Empty saved-count badge is hidden', not m.is_visible('#savedCount'))
    m.click('#navToggle'); m.wait_for_timeout(350)
    m.click('.nav-link[data-nav="/schedule"]'); m.wait_for_selector('.timeline')
    check('Mobile menu navigates and closes itself', m.get_attribute('#navToggle', 'aria-expanded') == 'false')
    m.close()

    # ---------- 11. Opened straight from disk (file://) → hash routing ----------
    f = browser.new_page(); ferrs = page_errors(f)
    f.goto(INDEX_FILE); f.wait_for_selector('#featured .card-link')
    f.click('.nav-link[data-nav="/events"]'); f.wait_for_selector('.card-link >> nth=11')
    check('file:// uses hash URLs', f.url.endswith('index.html#/events'))
    f.locator('.card-link').first.click(); f.wait_for_selector('.detail-card')
    f.go_back(); f.wait_for_selector('.card-link >> nth=11')
    check('file:// Back/Forward work', f.url.endswith('#/events') and not ferrs, '; '.join(ferrs))
    f.close()

    browser.close()

failed = [n for n, ok in results if not ok]
print(f'\n{len(results) - len(failed)}/{len(results)} checks passed')
sys.exit(1 if failed else 0)
