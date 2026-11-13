"""Check navigation continuity, mobile dialogs and deferred share rendering."""
import base64
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'test_deps'))
from playwright.sync_api import sync_playwright, expect

OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
URL = (ROOT / 'offline.html').as_uri()


def settle(page):
    page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')


def unlocked(page):
    expect(page.locator('#modal')).not_to_be_visible()
    assert page.evaluate('document.body.style.position !== "fixed"')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script('''
        window.cardDraws = 0; window.cardText = [];
        const encode = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(...args) { window.cardDraws++; return encode.apply(this, args); };
        const fill = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function(...args) { window.cardText.push(args[0]); return fill.apply(this, args); };
    ''')
    page.goto(URL)
    settle(page)
    page.evaluate('window.originalTopics = document.querySelector(".topics")')
    title = page.locator('.hero-copy h2').inner_text()
    page.locator('.shuffle').click()
    expect(page.locator('.hero-copy h2')).not_to_have_text(title)
    assert page.evaluate('document.querySelector(".topics") === window.originalTopics')
    assert page.evaluate('scrollY') == 0
    print('PASS: shuffle replaces only the reading card and keeps the page position', flush=True)

    page.locator('.mobile-nav [data-nav="explore"]').click()
    settle(page)
    first_result_y = page.locator('.work-tile').first.bounding_box()['y']
    assert first_result_y < 600, first_result_y
    page.screenshot(path=str(OUT / 'mobile-explore.png'), animations='disabled')
    page.locator('.quick-landscape [data-id="moon"]').click()
    page.locator('#search').fill('李白')
    expect(page.locator('.work-tile')).to_have_count(1)
    page.locator('#more-filters summary').click()
    page.locator('#stage-filter').select_option(label='小学')
    page.locator('.tile-link').first.scroll_into_view_if_needed()
    saved_y = page.evaluate('scrollY')
    saved_hash = page.evaluate('location.hash')
    page.locator('.tile-link').first.click()
    expect(page.locator('.detail-heading h1')).to_be_visible()
    page.locator('.breadcrumb a').click()
    expect(page.locator('#search')).to_have_value('李白')
    settle(page)
    assert page.evaluate('location.hash') == saved_hash
    assert abs(page.evaluate('scrollY') - saved_y) < 3
    expect(page.locator('#more-filters')).to_have_attribute('open', '')
    expect(page.locator('#stage-filter')).to_have_value('小学')
    page.locator('.tile-link').first.click()
    page.go_back()
    expect(page.locator('#search')).to_have_value('李白')
    settle(page)
    assert abs(page.evaluate('scrollY') - saved_y) < 3
    print(f'PASS: first result at {first_result_y:.0f}px; filters, advanced panel and scroll survive both return paths', flush=True)

    page.locator('[data-action="clear-filters"]').click()
    expect(page.locator('.work-tile')).to_have_count(17)
    page.locator('#search').evaluate('''el => {
        el.focus(); el.dispatchEvent(new CompositionEvent('compositionstart', {bubbles:true}));
        el.value = 'libai'; el.dispatchEvent(new InputEvent('input', {bubbles:true, isComposing:true}));
    }''')
    page.wait_for_timeout(180)
    expect(page.locator('.work-tile')).to_have_count(17)
    assert 'q=' not in page.evaluate('location.hash')
    page.locator('#search').evaluate('''el => {
        el.value = '李白'; el.dispatchEvent(new CompositionEvent('compositionend', {bubbles:true}));
    }''')
    expect(page.locator('.work-tile')).to_have_count(3)
    expect(page.locator('#search')).to_be_focused()
    print('PASS: Chinese composition leaves results intact until the text is committed', flush=True)

    prose_id = page.evaluate('JSON.parse(document.querySelector("#library-data").textContent).works.find(w=>w.form.includes("古文")).id')
    page.goto(URL + '#work/' + prose_id)
    page.locator('.verse-line').first.click()
    expect(page.locator('.verse-line').first).to_have_attribute('aria-expanded', 'true')
    assert page.locator('.verse-line').first.evaluate('el=>el.nextElementSibling.id === "line-note"')
    page.screenshot(path=str(OUT / 'mobile-annotation.png'), animations='disabled')
    page.locator('[data-action="save-quote"]').click()
    expect(page.locator('#line-note')).to_contain_text('已收藏这句')
    page.locator('[data-action="close-line"]').click()
    expect(page.locator('.verse-line').first).to_have_attribute('aria-expanded', 'false')
    expect(page.locator('.verse-line').first).to_be_focused()
    print('PASS: prose annotations open beside the selected sentence and close without losing focus', flush=True)

    page.evaluate('scrollTo(0, 350)')
    settle(page)
    saved_y = page.evaluate('scrollY')
    settings_box = page.locator('[data-action="settings"]').bounding_box()
    page.touchscreen.tap(settings_box['x'] + settings_box['width'] / 2, settings_box['y'] + settings_box['height'] / 2)
    locked_top = page.evaluate('document.body.style.top')
    page.keyboard.press('Escape')
    unlocked(page)
    assert abs(page.evaluate('scrollY') - saved_y) < 3, (saved_y, locked_top, page.evaluate('scrollY'))
    page.locator('[data-action="settings"]').click()
    page.evaluate('location.hash = "#saved"')
    expect(page.locator('.collection-tabs')).to_be_visible()
    settle(page)
    unlocked(page)
    assert page.evaluate('scrollY') == 0
    print('PASS: Escape and route changes release modal scroll locks without jumping to stale positions', flush=True)

    page.goto(URL + '#work/niaomingjian')
    page.locator('.detail-actions [data-action="share"]').click()
    expect(page.locator('#share-image')).to_be_visible()
    for width, height in [(390, 844), (320, 568)]:
        page.set_viewport_size({'width': width, 'height': height})
        for scroll in [0, 10000]:
            page.locator('.modal-body').evaluate('(el, y)=>el.scrollTop=y', scroll)
            save = page.locator('[data-action="download-image"]')
            box = save.bounding_box()
            assert 0 <= box['x'] and box['x'] + box['width'] <= width
            assert 0 <= box['y'] and box['y'] + box['height'] <= height
            assert save.evaluate('el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('.modal-body').evaluate('el=>el.scrollTop=0')
        page.screenshot(path=str(OUT / f'mobile-share-{width}.png'), animations='disabled')
        for theme in ['night', 'botanic', 'paper']:
            choice = page.locator(f'[data-action="share-theme"][data-id="{theme}"]')
            choice.click(timeout=3000)
            expect(choice).to_have_attribute('aria-pressed', 'true')
        page.locator('#share-note').click(timeout=3000)
        expect(page.locator('#share-note')).to_be_focused()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('#share-note').fill('风来月往')
    page.wait_for_timeout(220)
    count = page.evaluate('cardDraws')
    page.locator('#share-record').check()
    assert page.evaluate('cardDraws') == count, 'A record-only toggle must not re-encode the same image'
    with page.expect_download() as downloaded:
        page.evaluate('''() => {
            const el = document.querySelector('#share-note');
            for (const value of ['风', '风来', '风来，月往。']) {
                el.value=value; el.dispatchEvent(new Event('input', {bubbles:true}));
            }
            document.querySelector('[data-action="download-image"]').click();
        }''')
    assert page.evaluate('cardDraws') == count + 1
    assert '风来，月往。' in page.evaluate('cardText')
    png = OUT / 'immediate-share.png'
    downloaded.value.save_as(str(png))
    assert png.read_bytes() == base64.b64decode(page.locator('#share-image').get_attribute('src').split(',', 1)[1])
    assert page.evaluate('JSON.parse(localStorage.getItem("shanyue.reading.v1")).state.records.at(-1).note') == '风来，月往。'
    page.locator('[data-action="close-modal"]').click()
    unlocked(page)
    print('PASS: save stays visible on 320/390px screens; immediate download includes the latest text with one image render', flush=True)

    page.locator('[data-action="settings"]').click()
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as exported:
        page.locator('[data-action="export-html"]').click()
    exported_path = OUT / 'unlocked-export.html'
    exported.value.save_as(str(exported_path))
    fresh = browser.new_context(viewport={'width': 390, 'height': 844})
    offline = fresh.new_page()
    offline.goto(exported_path.as_uri())
    expect(offline.locator('.reading-card')).to_be_visible()
    unlocked(offline)
    settle(offline)
    offline.evaluate('scrollTo(0, 500)')
    assert offline.evaluate('scrollY') == 500
    print('PASS: exported HTML opens independently with a freely scrolling page', flush=True)
    assert not errors, errors
    browser.close()
