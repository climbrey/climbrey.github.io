import struct
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright,expect

OUT=ROOT/'test-results/mystery';OUT.mkdir(parents=True,exist_ok=True)
URL=(ROOT/'offline.html').as_uri()+'#play/scenes'

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce',accept_downloads=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL)
    page.screenshot(path=str(OUT/'手机-初入小院.png'),full_page=True)
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900 if width>700 else 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
        if width==1440:page.screenshot(path=str(OUT/'桌面-初入小院.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-target="letter"]').click()
    expect(page.locator('#mystery-modal')).to_be_visible();expect(page.locator('.letter')).to_contain_text('青石下有旧物')
    page.keyboard.press('Escape');page.wait_for_function('document.body.style.position===""')
    page.locator('#hint').click();expect(page.locator('#hint-text')).to_contain_text('轻轻挪过')
    page.locator('#hint').click();expect(page.locator('#hint-text')).to_contain_text('青石下')
    page.locator('#hint').click();expect(page.locator('#hint-text')).to_contain_text('点击院角')
    page.locator('[data-target="box"]').click();expect(page.locator('#feedback')).to_contain_text('锁着')
    page.locator('[data-target="stone"]').click();page.locator('[data-target="key"]').click()
    page.locator('[data-item="key"]').click();page.locator('[data-target="letter"]').click()
    expect(page.locator('#feedback')).to_contain_text('锁孔');expect(page.locator('[data-item="key"]')).to_be_visible()
    page.locator('[data-target="box"]').click();expect(page.locator('[data-item="seed"]')).to_be_visible()
    expect(page.locator('[data-item="key"]')).to_have_count(0)
    page.reload();expect(page.locator('[data-item="seed"]')).to_be_visible()
    page.locator('[data-room="pond"]').click();page.locator('[data-item="seed"]').click();page.locator('[data-target="soil"]').click()
    expect(page.locator('[data-item="seed"]')).to_have_count(0)
    page.locator('[data-room="stream"]').click();page.locator('[data-target="gate"]').click()
    page.locator('#test-water').click();expect(page.locator('#pipe-message')).to_contain_text('还没进来')
    page.screenshot(path=str(OUT/'手机-水渠机关.png'))
    # Operate real tile buttons, preserving a partially completed mechanism across reload.
    page.locator('[data-pipe="0"]').click()
    page.keyboard.press('Escape');page.reload();page.locator('[data-target="gate"]').click()
    expect(page.locator('[data-pipe="0"]')).to_have_attribute('aria-label','第1段石渠，接口朝左和右')
    for index,count in [(1,3),(2,1),(3,2),(4,1)]:
        for _ in range(count):page.locator(f'[data-pipe="{index}"]').click()
    page.locator('#test-water').click();expect(page.locator('#go-pond')).to_be_visible()
    page.locator('#go-pond').click();expect(page.locator('#landscape #bud')).to_have_attribute('opacity','1')
    page.locator('[data-target="twig"]').click();expect(page.locator('#feedback')).to_contain_text('停在新荷')
    page.locator('[data-item="frame"]').click();page.locator('[data-target="lotus"]').click()
    page.locator('#capture').click();expect(page.locator('#frame-message')).to_contain_text('再挪一挪')
    page.locator('#viewfinder').focus()
    for _ in range(8):page.keyboard.press('ArrowRight')
    for _ in range(3):page.keyboard.press('ArrowDown')
    page.screenshot(path=str(OUT/'手机-取景机关.png'))
    page.locator('#capture').click();expect(page.locator('.ending-intro')).to_contain_text('早有蜻蜓立上头')
    page.locator('#save-modal').click();expect(page.locator('.poster')).to_be_visible()
    with page.expect_download() as download:page.locator('.download').click()
    file=OUT/'荷塘来信-诗景卡.png';download.value.save_as(str(file))
    assert struct.unpack('>II',file.read_bytes()[16:24])==(1080,1440)
    page.keyboard.press('Escape');page.locator('[data-target="fish"]').click()
    expect(page.locator('.reader-lines')).to_contain_text('鱼戏莲叶间')
    page.keyboard.press('Escape');page.reload()
    expect(page.locator('#ending')).to_be_visible();page.locator('#read').click()
    expect(page.locator('.detail-heading h1')).to_have_text('小池'); page.locator('.breadcrumb a').click()
    page.keyboard.press('Escape')
    page.screenshot(path=str(OUT/'手机-找到诗境.png'),full_page=True)
    # Real pointer dragging of the frame, in a restored completed scene.
    page.locator('[data-item="frame"]').click();page.locator('[data-target="lotus"]').click()
    box=page.locator('#viewfinder').bounding_box();stage=page.locator('#frame-stage').bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down()
    page.mouse.move(stage['x']+stage['width']*.56,stage['y']+stage['height']*.54,steps=8);page.mouse.up()
    page.locator('#capture').click();expect(page.locator('.ending-intro')).to_be_visible();page.keyboard.press('Escape')
    page.emulate_media(reduced_motion='no-preference')
    page.locator('[data-item="frame"]').click();page.locator('[data-target="lotus"]').click()
    box=page.locator('#viewfinder').bounding_box();stage=page.locator('#frame-stage').bounding_box()
    cdp=context.new_cdp_session(page)
    start={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}
    end={'x':stage['x']+stage['width']*.55,'y':stage['y']+stage['height']*.52}
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[start]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[end]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    page.locator('#capture').click();expect(page.locator('.ending-intro')).to_be_visible()
    page.keyboard.press('Escape');cdp.detach()
    page.wait_for_function('document.getAnimations().every(a=>a.playState!=="running")',timeout=2000)
    # Closing the export before decode must not replace a later modal.
    page.evaluate('''() => {const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return new Promise(r=>setTimeout(r,150)).then(()=>decode.call(this));};document.querySelector('#mystery-host').shadowRoot.querySelector('#save').click();document.querySelector('#mystery-host').shadowRoot.querySelector('#mystery-modal').close();document.querySelector('#mystery-host').shadowRoot.querySelector('#help').click();}''')
    page.wait_for_timeout(300);expect(page.locator('#modal-title')).to_have_text('在小院里，慢慢找')
    assert page.evaluate('document.body.style.position==="fixed"')
    page.keyboard.press('Escape')
    page.locator('#restart').click();page.locator('#continue').click();expect(page.locator('#ending')).to_be_visible()
    page.locator('#restart').click();page.locator('#confirm-restart').click();expect(page.locator('#ending')).not_to_be_visible()
    expect(page.locator('#inventory .item')).to_have_count(0)
    assert not errors,errors
    browser.close()
print('PASS: full chapter, three-level clues, wrong tools, persistence, real pipe rotation, keyboard/pointer framing, bonus, exact quote, PNG export, four widths and async cancellation')
