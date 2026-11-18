"""Exercise the poem game through its touch/keyboard controls and reading routes."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/test_deps'))
from playwright.sync_api import sync_playwright, expect

OUT = ROOT / 'test-results/puzzle'
OUT.mkdir(parents=True, exist_ok=True)
URL = (ROOT / 'offline.html').as_uri()


def settle(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
    page.wait_for_function('document.getAnimations().every(a => a.playState !== "running")', timeout=2000)


def finish(page):
    for _ in range(6):
        if page.locator('.puzzle-complete').is_visible():
            return
        page.locator('[data-puzzle="hint"]').click()
    expect(page.locator('.puzzle-complete')).to_be_visible()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    expect(page.locator('.puzzle-entry')).to_be_visible()
    page.locator('.mobile-nav [data-nav="play"]').click()
    expect(page.locator('#puzzle-title')).to_have_text('拾句成诗')
    expect(page.locator('.mobile-nav [data-nav="play"]')).to_have_attribute('aria-current','page')
    expect(page.locator('.puzzle-source h2')).to_have_text('鸟鸣涧')
    settle(page)
    page.screenshot(path=str(OUT/'mobile-start.png'), full_page=True)
    pieces = page.locator('.puzzle-piece')
    pieces.first.focus()
    page.keyboard.press('Enter')
    expect(page.locator('.puzzle-slot.is-filled')).to_have_count(1)
    page.locator('[data-puzzle="undo"]').click()
    expect(page.locator('.puzzle-slot.is-filled')).to_have_count(0)
    pieces.first.click()
    first_text = pieces.first.inner_text()
    page.locator('.puzzle-slot.is-filled').click()
    expect(page.locator('.puzzle-slot.is-filled')).to_have_count(0)
    expect(pieces.first).to_be_focused()
    expect(pieces.first).to_be_enabled()
    # The bank is deliberately shuffled, so filling it in displayed order needs adjustment.
    for piece in pieces.all():
        piece.click()
    expect(page.locator('.puzzle-complete')).not_to_be_visible()
    expect(page.locator('.puzzle-status')).to_contain_text('再挪一挪')
    finish(page)
    expected_lines = ['人闲桂花落，','夜静春山空。']
    expect(page.locator('.puzzle-finished-quote')).to_be_visible()
    assert page.locator('.puzzle-finished-quote span').all_text_contents() == expected_lines
    settle(page)
    page.screenshot(path=str(OUT/'mobile-complete.png'), full_page=True)
    page.locator('[data-puzzle="undo"]').click()
    expect(page.locator('.puzzle-complete')).not_to_be_visible()
    finish(page)
    page.locator('.puzzle-read').click()
    expect(page.locator('.detail-heading h1')).to_have_text('鸟鸣涧')
    expect(page.locator('.breadcrumb a')).to_contain_text('返回游园')
    page.locator('.breadcrumb a').click()
    expect(page.locator('.puzzle-complete')).to_be_visible()
    page.locator('[data-puzzle="share"]').click()
    expect(page.locator('#share-image')).to_be_visible()
    expect(page.locator('.maker-back')).to_contain_text('返回游园')
    alt = page.locator('#share-image').get_attribute('alt')
    assert all(line in alt for line in expected_lines), alt
    with page.expect_download() as downloaded:
        page.locator('[data-action="download-image"]').click()
    path = OUT/'completed-poem.png'
    downloaded.value.save_as(str(path))
    assert path.read_bytes().startswith(b'\x89PNG') and path.stat().st_size>10000
    page.locator('.maker-back').click()
    expect(page.locator('.puzzle-complete')).to_be_visible()
    print('PASS: keyboard/touch play, remove, undo, misplaced fragments, hints, reading return and exact-pair PNG', flush=True)

    previous_title = page.locator('.puzzle-source h2').inner_text()
    page.locator('[data-puzzle="next"]').click()
    assert page.locator('.puzzle-source h2').inner_text() != previous_title
    page.locator('.puzzle-piece').first.click()
    page.locator('[data-puzzle="reset"]').click()
    expect(page.locator('.puzzle-slot.is-filled')).to_have_count(0)
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900 if width>700 else 844})
        page.goto(URL+'#play')
        settle(page)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        for box in page.locator('.puzzle-piece').evaluate_all('els => els.map(el => {const r=el.getBoundingClientRect(); return {x:r.x,right:r.right,w:r.width,h:r.height};})'):
            assert box['x']>=0 and box['right']<=width and box['w']>=44 and box['h']>=44, (width,box)
        if width == 1440:
            page.screenshot(path=str(OUT/'desktop-play.png'), full_page=True)
        page.goto(URL+'#home')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    page.goto(URL+'#play')
    page.emulate_media(reduced_motion='reduce')
    finish(page)
    settle(page)
    assert page.evaluate('document.getAnimations().length') == 0
    print('PASS: new work, reset, four responsive widths, touch target sizes and reduced-motion completion', flush=True)

    # Replaced/removed content is consulted again when returning to the game.
    page.evaluate('''() => {
      const seed=ShanyueLibrary.validateLibrary(JSON.parse(document.querySelector('#library-data').textContent));
      const current=JSON.parse(JSON.stringify(seed));
      const work=current.works.find(w=>w.id==='niaomingjian');
      work.lines=['原文已经更换，','此处暂不参与拼句。']; work.quote=[0,1];
      localStorage.setItem('shanyue.reading.v2',JSON.stringify({version:2,personal:ShanyuePersonal.diff(seed,current),state:{},notices:[]}));
    }''')
    page.reload()
    expect(page.locator('.puzzle-source h2')).not_to_have_text('鸟鸣涧')
    assert '人闲桂花落' not in page.locator('.puzzle-finished-quote').text_content()

    html = (ROOT/'offline.html').read_text(encoding='utf-8')
    seed = json.loads(re.search(r'<script id="library-data" type="application/json">(.*?)</script>',html,re.S)[1])
    # Deterministically exercise six fragments at the narrowest supported width.
    seven = json.loads(json.dumps(seed))
    seven['works'] = [next(w for w in seven['works'] if w['id']=='zhushi')]
    seven['works'][0]['related'] = []
    seven['topics'] = []
    seven['discovery']['defaultWork'] = 'zhushi'
    payload = json.dumps(seven,ensure_ascii=False).replace('<','\\u003c')
    narrow = OUT/'seven-character.html'
    narrow.write_text(re.sub(r'(<script id="library-data" type="application/json">).*?(</script>)',lambda m:m[1]+payload+m[2],html,flags=re.S),encoding='utf-8')
    seven_page = browser.new_page(viewport={'width':320,'height':740},reduced_motion='reduce')
    seven_page.on('pageerror',lambda error:errors.append(str(error)))
    seven_page.goto(narrow.as_uri()+'#play')
    expect(seven_page.locator('.puzzle-piece')).to_have_count(6)
    finish(seven_page)
    assert seven_page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    seven_page.locator('[data-puzzle="next"]').click()
    expect(seven_page.locator('.puzzle-complete')).not_to_be_visible()
    assert seven_page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    print('PASS: six-fragment seven-character rounds fit at 320px and renew in a one-work library',flush=True)

    seed['works'] = [next(w for w in seed['works'] if w['id']=='chengtian')]
    seed['works'][0]['related'] = []
    seed['topics'] = []
    payload = json.dumps(seed,ensure_ascii=False).replace('<','\\u003c')
    html = re.sub(r'(<script id="library-data" type="application/json">).*?(</script>)',lambda m:m[1]+payload+m[2],html,flags=re.S)
    empty = OUT/'prose-only.html'
    empty.write_text(html,encoding='utf-8')
    solo=browser.new_page(viewport={'width':320,'height':740}, reduced_motion='reduce')
    solo.on('pageerror',lambda error:errors.append(str(error)))
    solo.goto(empty.as_uri()+'#play')
    expect(solo.locator('.puzzle-empty')).to_be_visible()
    solo.locator('.puzzle-empty a').click()
    expect(solo.locator('.work-tile')).to_have_count(1)
    assert not errors, errors
    print('PASS: personal content changes and a prose-only custom library do not produce stale or invalid puzzles', flush=True)
    browser.close()
