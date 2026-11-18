"""Production Feihua: actual UI, motion, persistence, backups and content changes."""
import json,struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright,expect
from browser_helpers import open_settings,close_surface
OUT=ROOT/'test-results/feihua';OUT.mkdir(parents=True,exist_ok=True)
URL=(ROOT/'offline.html').as_uri()
STATE='ShanyueFeihuaView.snapshot().state'
def choose(page,word):
    page.locator(f'[data-word="{word}"]').click()
    if page.locator('#confirm-word').is_visible():page.locator('#confirm-word').click()
def next_line(page):
    return page.evaluate('''() => {const s=ShanyueFeihuaView.snapshot().state,pool=ShanyueFeihua.collect(JSON.parse(document.querySelector('#library-data').textContent),JSON.parse(document.querySelector('#feihua-data').textContent));return ShanyueFeihua.available(pool,s)[0].text;}''')
def send(page,text=None):
    page.locator('#verse-input').fill(text or next_line(page));page.locator('#send').click()
    expect(page.locator('#turn-label')).not_to_contain_text('正送来')
def game(page):return page.evaluate(STATE)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL+'#play');expect(page.locator('.garden-card')).to_have_count(3)
    page.screenshot(path=str(OUT/'手机-游园.png'),full_page=True)
    page.locator('.garden-card[href="#play/feihua"]').click();expect(page.locator('#feihua-host')).to_be_visible()
    expect(page.locator('#landscape svg')).to_be_visible();assert not errors,errors
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900 if width>520 else 844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.screenshot(path=str(OUT/f'开场-{width}.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.locator('.garden').scroll_into_view_if_needed()
    first=page.locator('.sway-branch').evaluate('(e)=>getComputedStyle(e).transform')
    page.wait_for_function('(old)=>getComputedStyle(document.querySelector("#feihua-host").shadowRoot.querySelector(".sway-branch")).transform!==old',arg=first)
    box=page.locator('.garden').bounding_box();page.touchscreen.tap(box['x']+120,box['y']+box['height']*.82)
    expect(page.locator('.ripple')).to_have_count(2)
    page.locator('#motion').click();page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    frozen=page.locator('.sway-branch').evaluate('(e)=>getComputedStyle(e).transform');page.wait_for_timeout(120)
    assert page.locator('.sway-branch').evaluate('(e)=>getComputedStyle(e).transform')==frozen
    choose(page,'月')
    page.locator('#verse-input').fill('春眠不觉晓');page.locator('#send').click();expect(page.locator('#feedback')).to_contain_text('还没有“月”')
    page.locator('#verse-input').fill('月色落在我心间');page.locator('#send').click();expect(page.locator('#feedback')).to_contain_text('不代表你记错了');assert not game(page)['entries']
    send(page,' 床前明月光， ');assert len(game(page)['entries'])==2
    page.locator('#verse-input').fill(game(page)['entries'][1]['text']);page.locator('#send').click();expect(page.locator('#feedback')).to_contain_text('相逢过')
    page.locator('.source-link').first.click();expect(page.locator('#feihua-host #modal-title')).to_have_text('静夜思');expect(page.locator('.poem-text')).to_contain_text('低头思故乡')
    page.locator('[data-read="jingyesi"]').click();expect(page.locator('.detail-heading h1')).to_have_text('静夜思');assert page.evaluate('document.body.style.position')==''
    page.locator('.breadcrumb a').click();expect(page.locator('.verse')).to_have_count(2)
    page.locator('#hint').click();page.locator('#hint-next').click();page.locator('#hint-next').click();page.locator('#hint-next').click();page.locator('#send').click()
    expect(page.locator('#turn-label')).not_to_contain_text('正送来');expect(page.locator('.verse.user').last).to_contain_text('借来一缕灵感')
    page.reload();expect(page.locator('.verse')).to_have_count(4)
    for _ in range(4):send(page)
    expect(page.locator('#rest-panel')).to_be_visible();expect(page.locator('.blossom.open')).to_have_count(6)
    state=game(page);assert len({e['text'] for e in state['entries']})==12
    page.screenshot(path=str(OUT/'手机-六次相逢.png'),full_page=True)
    page.locator('#save-rest').click();expect(page.locator('.poster')).to_be_visible()
    with page.expect_download() as download:page.locator('.download-link').click()
    target=OUT/'飞花令-月-诗笺.png';download.value.save_as(str(target));assert struct.unpack('>II',target.read_bytes()[16:24])==(1080,1440)
    page.locator('#back-from-poster').click();page.locator('#continue').click();send(page);assert len(game(page)['entries'])==14
    # Export/import actual settings backup; older backup must preserve this game.
    page.goto(URL+'#saved');open_settings(page);page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as download:page.locator('[data-action="export-backup"]').click()
    backup=OUT/'feihua-backup.json';download.value.save_as(str(backup));payload=json.loads(backup.read_text(encoding='utf-8'));assert len(payload['games']['feihua']['state']['entries'])==14
    with page.expect_download() as download:page.locator('[data-action="export-html"]').click()
    exported=OUT/'feihua-export.html';download.value.save_as(str(exported))
    page.evaluate('ShanyueFeihuaView.restore(null)');page.locator('#import-file').set_input_files(str(backup));page.locator('[data-action="apply-import"]').click()
    page.goto(URL+'#play/feihua');expect(page.locator('.verse')).to_have_count(14)
    del payload['games']['feihua'];old=OUT/'old-backup.json';old.write_text(json.dumps(payload,ensure_ascii=False),encoding='utf-8')
    page.goto(URL+'#saved');open_settings(page);page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click();page.locator('#import-file').set_input_files(str(old));page.locator('[data-action="apply-import"]').click()
    page.goto(URL+'#play/feihua');expect(page.locator('.verse')).to_have_count(14)
    # Finite pool: seven complete exchanges with the fourteen snow lines.
    choose(page,'雪')
    for _ in range(6):send(page)
    page.locator('#continue').click();send(page);expect(page.locator('#rest-title')).to_contain_text('先陪你到这里');expect(page.locator('#continue')).to_be_hidden()
    page.locator('#restart').click();page.locator('#cancel-restart').click();assert len(game(page)['entries'])==14
    page.locator('#restart').click();page.locator('#confirm-restart').click();expect(page.locator('.verse')).to_have_count(0)
    # Leave while the visual reply is pending; the complete exchange must persist.
    choose(page,'花');page.locator('#motion').click();page.locator('#verse-input').fill(next_line(page));page.locator('#send').click()
    page.evaluate('window.oldFeihuaScene=document.querySelector("#feihua-host").shadowRoot.querySelector(".sway-branch");location.hash="#play"')
    expect(page.locator('.garden-card')).to_have_count(3);assert len(game(page)['entries'])==2
    assert page.evaluate('oldFeihuaScene.getAnimations().every(a=>a.playState!=="running")')
    page.locator('[href="#play/feihua"].garden-card').click();expect(page.locator('.verse')).to_have_count(2)
    page.locator('#rules').click();page.evaluate('location.hash="#home"');expect(page.locator('.hero-copy')).to_be_visible();assert page.evaluate('document.body.style.position')==''
    page.goto(URL+'#play/feihua');choose(page,'山');page.wait_for_timeout(1100);expect(page.locator('.verse')).to_have_count(0)
    # A self-contained export can play and render a card with no server.
    isolated=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');isolated.on('pageerror',lambda e:errors.append(str(e)));isolated.goto(exported.as_uri()+'#play/feihua')
    expect(isolated.locator('#motion')).to_have_attribute('aria-pressed','true');send(isolated);expect(isolated.locator('.blossom.open')).to_have_count(1)
    isolated.evaluate('''() => {const native=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){const image=this;return new Promise((resolve,reject)=>setTimeout(()=>native.call(image).then(resolve,reject),220));};const r=document.querySelector('#feihua-host').shadowRoot;r.querySelector('#finish').click();r.querySelector('#close').click();r.querySelector('#rules').click();}''')
    isolated.wait_for_timeout(450);expect(isolated.locator('#feihua-host #modal-title')).to_have_text('一字，一场相逢');expect(isolated.locator('.poster')).to_have_count(0);assert isolated.evaluate('document.body.style.position')=='fixed'
    isolated.keyboard.press('Escape');isolated.wait_for_function('document.body.style.position===""')
    # Content changes invalidate used quotations; the player sees why a new round starts.
    isolated.evaluate('''() => {const seed=JSON.parse(document.querySelector('#library-data').textContent),edited=structuredClone(seed),used=ShanyueFeihuaView.snapshot().state.entries[0],id=used.id.split(':')[0],index=Number(used.id.split(':')[1]);edited.works.find(w=>w.id===id).lines[index]='个人改写的这一行';localStorage.setItem('shanyue.reading.v2',JSON.stringify({version:2,personal:ShanyuePersonal.diff(seed,edited),state:{},notices:[]}));}''')
    isolated.reload();expect(isolated.locator('#feedback')).to_contain_text('原文或作者已更新');expect(isolated.locator('.verse')).to_have_count(0)
    assert not errors,errors
    browser.close()
print('PASS: Feihua UI, motion/touch/pause, four widths, sources, hints, saved rounds, six blooms, PNG, reading return, backups/old backups, exhaustion, reset, interrupted replies, cleanup, standalone HTML, reduced motion, modal races and edited-text recovery.')
