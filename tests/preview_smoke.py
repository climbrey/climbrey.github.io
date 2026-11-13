"""Exercise the delivered offline HTML in an isolated Chromium profile."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'test_deps'))
from playwright.sync_api import sync_playwright, expect

OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
URL = (ROOT / 'offline.html').as_uri()
results = []

def passed(name):
    results.append(name)
    print('PASS:', name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, accept_downloads=True, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('https://**/*', lambda route: route.abort())
    page.route('http://**/*', lambda route: route.abort())
    page.goto(URL)
    expect(page.locator('.hero-copy h2')).to_have_text('鸟鸣涧')
    page.screenshot(path=str(OUT / 'desktop-home.png'), full_page=True)
    passed('offline desktop home renders without network dependencies')

    page.locator('.motif[data-id="moon"]').click()
    expect(page.locator('#explore-results .work-tile')).to_have_count(6)
    page.locator('[data-action="filter"][data-id="homesick"]').click()
    expect(page.locator('#explore-results .work-tile')).to_have_count(2)
    page.locator('#search').fill('李白')
    expect(page.locator('#explore-results .work-tile')).to_have_count(1)
    passed('hierarchical tags, cross-dimension filters and author search compose correctly')

    page.locator('.tile-link').click()
    expect(page.locator('.detail-heading h1')).to_have_text('静夜思')
    page.locator('.verse-line').nth(1).click()
    expect(page.locator('#line-note')).to_contain_text('比喻')
    page.locator('[data-action="save-quote"]').click()
    page.locator('.detail-actions [data-action="favorite"]').click()
    page.reload()
    expect(page.locator('.detail-actions [data-action="favorite"]')).to_have_attribute('aria-pressed', 'true')
    page.locator('[data-module="reading"] summary').click()
    expect(page.locator('[data-module="reading"]')).to_have_attribute('open', '')
    page.screenshot(path=str(OUT / 'desktop-detail.png'), full_page=True)
    passed('annotations, expanded reading and favorites survive reload')

    page.locator('.detail-actions [data-action="share"]').click()
    expect(page.locator('#share-image')).to_be_visible()
    page.locator('[data-action="share-theme"][data-id="night"]').click()
    page.locator('[data-action="share-mode"][data-id="memory"]').click()
    page.locator('#share-note').fill('把一轮月光，留给远方的人。')
    page.locator('#share-signature').fill('山间读者')
    page.locator('#share-record').check()
    expect(page.locator('#share-error')).not_to_be_visible()
    page.screenshot(path=str(OUT / 'desktop-share.png'), full_page=True)
    with page.expect_download() as downloaded:
        page.locator('[data-action="download-image"]').click()
    downloaded.value.save_as(str(OUT / 'share-night.png'))
    with page.expect_download():
        page.locator('[data-action="download-image"]').click()
    stored = page.evaluate('JSON.parse(localStorage.getItem("shanyue.reading.v1"))')
    assert len(stored['state']['records']) == 1, 'Repeated image downloads must not duplicate reading records'
    page.locator('[data-action="share-ratio"][data-id="square"]').click()
    expect(page.locator('#share-error')).not_to_be_visible()
    with page.expect_download() as downloaded:
        page.locator('[data-action="download-image"]').click()
    downloaded.value.save_as(str(OUT / 'share-square.png'))
    from PIL import Image
    assert Image.open(OUT / 'share-night.png').size == (1080, 1440)
    assert Image.open(OUT / 'share-square.png').size == (1080, 1080)
    page.locator('[data-action="close-modal"]').click()
    passed('portrait/square PNG export, optional notes and nonduplicating reading records')

    page.goto(URL + '#work/shuidiaogetou')
    page.locator('.detail-actions [data-action="share"]').click()
    page.locator('[data-action="share-mode"][data-id="whole"]').click()
    page.locator('[data-action="share-ratio"][data-id="square"]').click()
    expect(page.locator('#share-error')).to_be_visible()
    expect(page.locator('[data-action="download-image"]')).to_be_disabled()
    page.locator('[data-action="share-mode"][data-id="quote"]').click()
    expect(page.locator('[data-action="download-image"]')).to_be_enabled()
    page.locator('[data-action="close-modal"]').click()
    passed('overlong full-text cards are blocked rather than silently clipped')

    page.goto(URL + '#saved')
    expect(page.locator('.work-tile')).to_have_count(1)
    page.locator('[data-action="saved-tab"][data-id="quotes"]').click()
    expect(page.locator('.quote-card')).to_have_count(1)
    page.locator('[data-action="saved-tab"][data-id="records"]').click()
    expect(page.locator('.quote-card')).to_have_count(1)
    passed('saved works, selected lines and reading memories have distinct collections')

    page.locator('[data-action="settings"]').click()
    page.locator('.settings-group summary').filter(has_text='内容模块').click()
    page.locator('[data-module-toggle="background"]').uncheck()
    page.locator('#new-module').fill('我的一读')
    page.locator('[data-action="module-add"]').click()
    custom = page.locator('.module-row').filter(has_text='我的一读')
    custom.locator('[data-action="module-edit"]').click()
    page.locator('#module-content').fill('一句平常的话，也可以留很久。')
    page.locator('[data-action="save-module"]').click()
    page.locator('[data-action="close-modal"]').click()
    page.goto(URL + '#work/guiyuan')
    expect(page.locator('[data-module="background"]')).to_have_count(0)
    expect(page.locator('.content-module summary').filter(has_text='我的一读')).to_have_count(1)
    passed('module visibility and custom module content affect the reading page')

    page.locator('[data-action="settings"]').click()
    page.locator('.settings-group summary').filter(has_text='分类与作品标签').click()
    page.locator('#new-tag').fill('清晨重读')
    page.locator('#new-tag-parent').select_option('feeling')
    page.locator('[data-action="tag-add"]').click()
    page.locator('#tag-work').select_option('guiyuan')
    page.locator('[data-action="work-tags"]').click()
    page.get_by_label('清晨重读', exact=True).check()
    page.locator('[data-action="save-work-tags"]').click()
    page.locator('[data-action="close-modal"]').click()
    expect(page.locator('.detail-aside .tag').filter(has_text='清晨重读')).to_have_count(1)
    passed('custom nested classification and work tag assignment are functional')

    page.locator('[data-action="settings"]').click()
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as downloaded:
        page.locator('[data-action="export-backup"]').click()
    backup = OUT / 'reading-backup.json'
    downloaded.value.save_as(str(backup))
    with page.expect_download() as downloaded:
        page.locator('[data-action="export-html"]').click()
    exported = OUT / 'exported-reading.html'
    downloaded.value.save_as(str(exported))
    baseline = page.evaluate('localStorage.getItem("shanyue.reading.v1")')
    bad = json.loads(backup.read_text(encoding='utf-8'))
    bad['library']['tags'][0]['parent'] = bad['library']['tags'][0]['id']
    (OUT / 'bad-cycle.json').write_text(json.dumps(bad, ensure_ascii=False), encoding='utf-8')
    page.locator('#import-file').set_input_files(str(OUT / 'bad-cycle.json'))
    expect(page.locator('#import-preview')).to_contain_text('循环')
    assert page.evaluate('localStorage.getItem("shanyue.reading.v1")') == baseline
    page.locator('#import-file').set_input_files(str(backup))
    expect(page.locator('[data-action="apply-import"]')).to_be_visible()
    page.locator('[data-action="apply-import"]').click()
    expect(page.locator('#modal')).not_to_be_visible()
    passed('backup export/restore and atomic rejection of invalid classification trees')

    isolated = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce')
    mobile = isolated.new_page()
    mobile.on('pageerror', lambda error: errors.append(str(error)))
    mobile.goto(exported.as_uri())
    expect(mobile.locator('.hero-copy h2')).to_have_text('鸟鸣涧')
    mobile.goto(exported.as_uri() + '#saved')
    expect(mobile.locator('.work-tile')).to_have_count(0)
    mobile.goto(URL)
    mobile.screenshot(path=str(OUT / 'mobile-home.png'), full_page=True)
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.goto(URL + '#work/chengtian')
    mobile.screenshot(path=str(OUT / 'mobile-detail.png'), full_page=True)
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.locator('.detail-actions [data-action="share"]').click()
    expect(mobile.locator('#share-image')).to_be_visible()
    mobile.screenshot(path=str(OUT / 'mobile-share.png'), full_page=True)
    assert mobile.evaluate('document.querySelector("#modal").scrollWidth <= document.querySelector("#modal").clientWidth')
    mobile.locator('[data-action="close-modal"]').click()
    mobile.set_viewport_size({'width':320,'height':740})
    mobile.goto(URL)
    mobile.screenshot(path=str(OUT / 'mobile-320.png'), full_page=True)
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    passed('exported HTML opens independently without personal data; 390px/320px layouts fit')

    assert not errors, '\n'.join(errors)
    passed('no uncaught browser errors across the exercised flows')
    (OUT / 'results.json').write_text(json.dumps({'passed':results,'browser_errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
