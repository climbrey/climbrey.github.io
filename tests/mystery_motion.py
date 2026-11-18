"""Check production motion lifecycle, backup round-trip and content compatibility."""
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright,expect
from browser_helpers import open_settings,close_surface
OUT=ROOT/'test-results/mystery';OUT.mkdir(parents=True,exist_ok=True)
URL=(ROOT/'offline.html').as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='no-preference',accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL+'#play/scenes')
    page.evaluate("ShanyueMysteryView.restore({state:{...ShanyueMystery.initial(),room:'pond',stone:true,key:true,box:true,planted:true,water:true,pipes:[0,3,1,3,1]}})")
    page.reload()
    first=page.locator('#landscape #fish').get_attribute('transform')
    page.wait_for_function('(v)=>document.querySelector("#mystery-host").shadowRoot.querySelector("#fish").getAttribute("transform")!==v',arg=first)
    page.locator('#splash').click();expect(page.locator('#ripples ellipse')).not_to_have_count(0)
    page.locator('#reeds').click();expect(page.locator('#feedback')).to_contain_text('鱼纹')
    page.locator('#rain-toggle').click();expect(page.locator('#rain')).to_have_attribute('opacity','1')
    page.locator('#pause').click()
    at_rest=page.locator('#landscape #fish').get_attribute('transform');page.wait_for_timeout(160)
    assert page.locator('#landscape #fish').get_attribute('transform')==at_rest
    page.locator('#pause').click();page.locator('#lure').click()
    page.wait_for_function('document.querySelector("#mystery-host").shadowRoot.querySelector("#dragon").classList.contains("landed")',timeout=5000)
    page.screenshot(path=str(OUT/'手机-动态诗境.png'),full_page=True)
    # A stored DOM reference stops changing after the route is removed.
    page.evaluate('window.detachedMysteryFish=document.querySelector("#mystery-host").shadowRoot.querySelector("#fish")')
    page.locator('.mystery-back').click();expect(page.locator('.garden')).to_be_visible()
    previous=page.evaluate('detachedMysteryFish.getAttribute("transform")');page.wait_for_timeout(180)
    assert page.evaluate('detachedMysteryFish.getAttribute("transform")')==previous
    page.locator('.garden-card[href="#play/scenes"]').click()
    expect(page.locator('#landscape #dragon')).to_have_class('landed')
    page.locator('#help').click();page.evaluate("location.hash='#home'")
    expect(page.locator('.hero-copy')).to_be_visible();page.wait_for_function('document.body.style.position!=="fixed"')
    # Export the real settings backup, clear the game, then import it through the UI.
    page.goto(URL+'#saved');open_settings(page)
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as download:page.locator('[data-action="export-backup"]').click()
    backup=OUT/'mystery-backup.json';download.value.save_as(str(backup));payload=json.loads(backup.read_text(encoding='utf-8'))
    assert payload['games']['mystery']['state']['visitor']
    with page.expect_download() as download:page.locator('[data-action="export-html"]').click()
    exported=OUT/'mystery-export.html';download.value.save_as(str(exported))
    page.evaluate('ShanyueMysteryView.restore(null)')
    page.locator('#import-file').set_input_files(str(backup));page.locator('[data-action="apply-import"]').click()
    page.goto(URL+'#play/scenes');expect(page.locator('#landscape #dragon')).to_have_class('landed')
    # An older backup without the optional games field retains the existing chapter.
    del payload['games'];old=OUT/'old-backup.json';old.write_text(json.dumps(payload,ensure_ascii=False),encoding='utf-8')
    page.goto(URL+'#saved');open_settings(page);page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    page.locator('#import-file').set_input_files(str(old));page.locator('[data-action="apply-import"]').click()
    page.goto(URL+'#play/scenes');expect(page.locator('#landscape #dragon')).to_have_class('landed')
    isolated=browser.new_page(reduced_motion='reduce');isolated.on('pageerror',lambda e:errors.append(str(e)))
    isolated.goto(exported.as_uri()+'#play/scenes');expect(isolated.locator('[data-target="letter"]')).to_be_visible()
    expect(isolated.locator('#inventory .item')).to_have_count(0)
    # Edited poetry must not be silently matched to an unchanged illustration.
    isolated.evaluate('''() => {const seed=JSON.parse(document.querySelector('#library-data').textContent),edited=JSON.parse(JSON.stringify(seed));edited.works.find(w=>w.id==='xiaochi').lines[2]='个人改写的这一句';localStorage.setItem('shanyue.reading.v2',JSON.stringify({version:2,personal:ShanyuePersonal.diff(seed,edited),state:{},notices:[]}));}''')
    isolated.reload();expect(isolated.locator('.empty')).to_contain_text('原文发生了变化')
    assert not errors,errors
    browser.close()
print('PASS: production ambient motion, reactive scenery, pause, flight, route/modal cleanup, backup round-trip, old backups, self-contained HTML and edited-text fallback')
