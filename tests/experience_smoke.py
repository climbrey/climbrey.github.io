"""Check poem-letter discovery, reading continuations and finite motion."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/test_deps'))
from playwright.sync_api import sync_playwright, expect

OUT = ROOT / 'test-results/experience'
OUT.mkdir(parents=True, exist_ok=True)
URL = (ROOT / 'offline.html').as_uri()


def settle(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    page.wait_for_function('document.getAnimations().every(a => a.playState !== "running")', timeout=2000)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    corpus = {w['id']: w for w in page.evaluate('JSON.parse(document.querySelector("#library-data").textContent).works')}
    choices = page.locator('.poem-letter')
    expect(choices).to_have_count(3)
    ids = choices.evaluate_all('els => els.map(el => el.dataset.id)')
    assert len(set(ids)) == 3
    choices.first.focus()
    page.keyboard.press('Enter')
    expect(choices.first).to_have_attribute('aria-expanded', 'true')
    expect(choices.first).to_be_focused()
    expect(page.locator('#letter-result')).to_contain_text(corpus[ids[0]]['title'])
    text = '\n'.join(corpus[ids[0]]['lines'][i] for i in corpus[ids[0]]['quote'][:2])
    excerpt = page.locator('.letter-revealed blockquote').inner_text()
    assert text.startswith(excerpt.removesuffix('…')), (text, excerpt)
    assert page.locator('#letter-result a').get_attribute('href') == '#work/' + ids[0]
    expect(page.locator('#letter-announcement')).to_contain_text(corpus[ids[0]]['title'])
    page.locator('.letter-room').scroll_into_view_if_needed()
    settle(page)
    page.screenshot(path=str(OUT / 'mobile-letter.png'))
    page.locator('#letter-result a').evaluate('el => el.scrollIntoView({block: "center", behavior: "instant"})')
    y = page.evaluate('scrollY')
    page.locator('#letter-result a').click()
    expect(page.locator('.detail-heading h1')).to_have_text(corpus[ids[0]]['title'])
    page.locator('.breadcrumb a').click()
    expect(page.locator('.letter-room')).to_be_visible()
    settle(page)
    assert page.locator('.poem-letter').evaluate_all('els => els.map(el => el.dataset.id)') == ids
    expect(page.locator('.poem-letter').first).to_have_attribute('aria-expanded', 'true')
    assert abs(page.evaluate('scrollY') - y) < 3, (y, page.evaluate('scrollY'))
    page.locator('[data-action="new-letters"]').click()
    next_ids = choices.evaluate_all('els => els.map(el => el.dataset.id)')
    assert not set(ids).intersection(next_ids)
    expect(page.locator('.letter-waiting')).to_be_visible()
    # Rapid changes must leave the last chosen real poem visible.
    choices.evaluate_all('els => {els[0].click(); els[1].click(); els[2].click();}')
    expect(choices.nth(2)).to_have_attribute('aria-expanded', 'true')
    expect(page.locator('#letter-result')).to_contain_text(corpus[next_ids[2]]['title'])
    settle(page)
    assert page.evaluate('document.getAnimations().length') == 0
    page.locator('#letter-result [data-action="share"]').click()
    expect(page.locator('#share-image')).to_be_visible()
    print('PASS: keyboard reveal, real excerpts, stable return, fresh choices, rapid clicks and poem-card entry', flush=True)

    page.goto(URL + '#work/niaomingjian')
    trail = page.locator('.trail-card')
    expect(trail).to_have_count(min(2, len(corpus['niaomingjian']['related'])))
    expected_id = trail.first.get_attribute('href').split('/')[-1]
    page.locator('.reader-trail').scroll_into_view_if_needed()
    settle(page)
    page.screenshot(path=str(OUT / 'mobile-trail.png'))
    trail.first.click()
    expect(page.locator('.detail-heading h1')).to_have_text(corpus[expected_id]['title'])
    page.locator('.detail-actions [data-action="favorite"]').click()
    expect(page.locator('.detail-actions [data-action="favorite"]')).to_have_attribute('aria-pressed', 'true')
    settle(page)
    assert page.locator('.save-petal').count() == 0
    print('PASS: related reading resolves to original works and favorite effects clean up', flush=True)

    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 940 if width > 700 else 844})
        page.goto(URL + '#home')
        choices.first.click()
        settle(page)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        # All three choices remain touchable without horizontal scrolling.
        for box in choices.evaluate_all('els => els.map(el => {const r=el.getBoundingClientRect(); return {x:r.x,right:r.right,width:r.width,height:r.height};})'):
            assert box['x'] >= 0 and box['right'] <= width and box['width'] >= 44 and box['height'] >= 44, box
        if width == 1440:
            page.screenshot(path=str(OUT / 'desktop-home.png'), full_page=True, animations='disabled')
        page.goto(URL + '#work/niaomingjian')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    page.goto(URL + '#home')
    choices.first.click()
    page.emulate_media(reduced_motion='reduce')
    settle(page)
    assert page.evaluate('document.getAnimations().length') == 0
    print('PASS: 320/390/768/1440px fit and reduced-motion reading stays fully usable', flush=True)

    # A valid one-work library must not loop or render broken related links.
    html = (ROOT / 'offline.html').read_text(encoding='utf-8')
    seed = json.loads(re.search(r'<script id="library-data" type="application/json">(.*?)</script>', html, re.S)[1])
    seed['works'] = [next(w for w in seed['works'] if w['id'] == 'niaomingjian')]
    seed['works'][0]['related'] = []
    seed['topics'] = []
    payload = json.dumps(seed, ensure_ascii=False).replace('<', '\\u003c')
    html = re.sub(r'(<script id="library-data" type="application/json">).*?(</script>)', lambda m: m[1] + payload + m[2], html, flags=re.S)
    limited = OUT / 'one-work.html'
    limited.write_text(html, encoding='utf-8')
    solo = browser.new_page(viewport={'width': 320, 'height': 740}, reduced_motion='reduce')
    solo.on('pageerror', lambda error: errors.append(str(error)))
    solo.goto(limited.as_uri())
    expect(solo.locator('.poem-letter')).to_have_count(1)
    solo.locator('.poem-letter').click()
    expect(solo.locator('#letter-result')).to_contain_text('鸟鸣涧')
    solo.locator('[data-action="new-letters"]').click()
    solo.locator('.poem-letter').click()
    solo.locator('#letter-result a').click()
    expect(solo.locator('.detail-heading h1')).to_have_text('鸟鸣涧')
    expect(solo.locator('.reader-trail')).to_have_count(0)
    assert not errors, errors
    print('PASS: one-work custom library safely reveals, renews and reads without missing links', flush=True)
    browser.close()
