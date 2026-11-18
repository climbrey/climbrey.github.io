"""Verify garden navigation, illustrated clues, native reading returns and PNG export."""
import struct
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright,expect
from browser_helpers import open_settings,close_surface
OUT=ROOT/'test-results/scenes';OUT.mkdir(parents=True,exist_ok=True)
URL=(ROOT/'offline.html').as_uri()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True,reduced_motion='reduce')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL)
    page.locator('.puzzle-entry').click()
    expect(page.locator('.garden-card')).to_have_count(2)
    page.screenshot(path=str(OUT/'mobile-garden.png'),full_page=True)
    page.locator('.garden-card[href="#play/scenes"]').click()
    expect(page.locator('.scene-game h1')).to_contain_text('诗里寻景')
    expect(page.locator('.mobile-nav [data-nav="play"]')).to_have_attribute('aria-current','page')
    data=page.evaluate('JSON.parse(document.querySelector("#scene-data").textContent).scenes')
    for i,scene in enumerate(data):
        page.locator('[data-scene="'+str(i)+'"]').click()
        expect(page.locator('.verse-choice')).to_have_count(3)
        page.locator('.hotspot').first.focus();page.keyboard.press('Enter')
        expect(page.locator('#clue-note')).to_have_text(scene['clues'][0]['text'])
        page.locator('#hint').click()
        expect(page.locator('#clue-note')).to_have_text(scene['clues'][1]['text'])
        wrong=next(n for n,o in enumerate(scene['options']) if o['workId']!=scene['answer'])
        correct=next(n for n,o in enumerate(scene['options']) if o['workId']==scene['answer'])
        page.locator('[data-choice="'+str(wrong)+'"]').click()
        expect(page.locator('#response')).to_have_text(scene['options'][wrong]['response'])
        page.locator('[data-choice="'+str(correct)+'"]').click()
        expect(page.locator('#discovery')).to_be_visible()
        expect(page.locator('#matched-quote')).to_have_text('\n'.join(scene['options'][correct]['expected']))
        page.locator('#read').click()
        expect(page.locator('.detail-heading h1')).to_be_visible()
        expect(page.locator('.breadcrumb a')).to_have_attribute('href','#play/scenes')
        page.locator('.breadcrumb a').click()
        expect(page.locator('#discovery')).to_be_visible()
        expect(page.locator('.scene-tab[aria-pressed="true"]')).to_contain_text(scene['name'])
        page.locator('#save').click()
        expect(page.locator('.scene-poster')).to_be_visible()
        assert scene['options'][correct]['expected'][0] in page.locator('.scene-poster').get_attribute('alt')
        with page.expect_download() as download:page.locator('.scene-download').click()
        file=OUT/(scene['id']+'.png');download.value.save_as(str(file))
        assert struct.unpack('>II',file.read_bytes()[16:24])==(1080,1440)
        page.keyboard.press('Escape');expect(page.locator('#save')).to_be_focused()
        assert page.evaluate('document.body.style.position!=="fixed"')
        page.locator('#again').click();expect(page.locator('.verse-choice')).to_have_count(3)
        page.locator('#reveal').click();expect(page.locator('#discovery')).to_be_visible()
    print('PASS: garden, three scenes, keyboard clues, feedback, original returns, exact quotes and 1080x1440 PNG',flush=True)
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':844 if width<700 else 1100})
        for route in ['play','play/scenes','play/compose']:
            page.goto(URL+'#'+route)
            expect(page.locator('body')).to_have_attribute('data-page','play')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,route)
        page.goto(URL+'#play/scenes')
        expect(page.locator('.hotspot')).to_have_count(2)
        assert page.locator('.hotspot').evaluate_all('els=>els.every(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44})')
        if width in [390,1440]:
            page.evaluate('document.activeElement.blur();scrollTo(0,0)')
            page.screenshot(path=str(OUT/f'scenes-{width}.png'),full_page=True,animations='disabled')
    # An in-flight image decode must not open a dialog after leaving the game.
    page.locator('#again').click()
    page.locator('#reveal').click()
    page.evaluate('''() => {const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return new Promise(resolve=>setTimeout(resolve,150)).then(()=>decode.call(this));};document.querySelector('#save').click();location.hash='#home';}''')
    expect(page.locator('body')).to_have_attribute('data-page','home')
    page.wait_for_timeout(250)
    expect(page.locator('#modal')).not_to_be_visible()
    page.emulate_media(reduced_motion='no-preference')
    page.goto(URL+'#play/scenes');page.locator('#again').click();page.locator('#reveal').click()
    page.wait_for_function('document.getAnimations().every(a=>a.playState!=="running")',timeout=2000)
    page.emulate_media(reduced_motion='reduce')
    print('PASS: four widths, both game routes, finite motion and image-generation navigation race',flush=True)
    # Export the complete app and exercise the new game without the hosted resources.
    page.goto(URL+'#saved');open_settings(page)
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as download:page.locator('[data-action="export-html"]').click()
    file=OUT/'exported.html';download.value.save_as(str(file));close_surface(page)
    exported=browser.new_page(reduced_motion='reduce')
    exported.on('pageerror',lambda e:errors.append(str(e)))
    exported.goto(file.as_uri()+'#play/scenes')
    expect(exported.locator('.scene-tab')).to_have_count(3)
    exported.locator('#reveal').click();expect(exported.locator('#discovery')).to_be_visible()
    # Existing personal content modifies only the quoted field; affected scenes pause safely.
    page.evaluate('''() => {const seed=ShanyueLibrary.validateLibrary(JSON.parse(document.querySelector('#library-data').textContent));const edited=JSON.parse(JSON.stringify(seed));for(const id of ['xiaochi','jiangxue'])edited.works.find(w=>w.id===id).lines[2]='个人改写的这一句。';localStorage.setItem('shanyue.reading.v2',JSON.stringify({version:2,personal:ShanyuePersonal.diff(seed,edited),state:{},notices:[]}));}''')
    page.goto(URL+'#play/scenes');page.reload()
    expect(page.locator('.scene-game')).to_have_count(0)
    expect(page.locator('.empty')).to_contain_text('暂时没有可用的寻景作品')
    page.locator('.empty a[href="#play/compose"]').click();expect(page.locator('#puzzle-title')).to_be_visible()
    assert not errors,errors
    browser.close()
print('PASS: exported offline HTML and changed personal texts preserve safe game availability',flush=True)
