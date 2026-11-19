"""Play both waterways, inspect motion lifecycle, and export the real scene."""
import json,struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright,expect
from browser_helpers import open_settings
OUT=ROOT/'test-results/voyage';OUT.mkdir(parents=True,exist_ok=True)
URL=sys.argv[1] if len(sys.argv)>1 else (ROOT/'offline.html').as_uri()
STATE='ShanyueVoyageView.snapshot().state'

def control(page,action,value=None):
    selector='#controls [data-action="'+action+'"]'+('' if value is None else '[data-value="'+str(value)+'"]')
    button=page.locator(selector);expect(button).to_be_enabled();button.click()

def stage(page,name):
    expect(page.locator('.pond-art')).to_have_attribute('data-stage',name)

def ready(page):
    expect(page.locator('#scene-controls')).to_have_attribute('data-busy','false')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL+'#play');expect(page.locator('.voyage-feature')).to_be_visible();expect(page.locator('.garden-card')).to_have_count(3)
    page.screenshot(path=str(OUT/'lobby.png'),full_page=True)
    page.locator('.voyage-feature').click();stage(page,'inlet')
    expect(page.locator('.site-header')).to_be_hidden();expect(page.locator('.mobile-nav')).to_be_hidden()
    assert page.locator('.boat-position').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.width>20&&r.height>15;}')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900 if width>520 else 844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.screenshot(path=str(OUT/f'inlet-{width}.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    # Visible causal motion: leaf starts opening before the boat advances.
    old=page.locator('.boat-position').get_attribute('transform');page.locator('.hotspot[data-action="sail"]').tap();stage(page,'fork')
    page.wait_for_timeout(450)
    assert page.locator('.boat-position').get_attribute('transform')==old
    assert page.locator('.blocking-leaf').get_attribute('transform')!='translate(456 354)'
    page.wait_for_timeout(1000);assert page.locator('.boat-position').get_attribute('transform')!=old;ready(page)
    page.screenshot(path=str(OUT/'fork.png'),full_page=True)
    control(page,'route','bamboo');ready(page);stage(page,'bend')
    control(page,'sail');ready(page);expect(page.locator('#feedback')).to_contain_text('浅石');stage(page,'bend')
    # Drag is an alternative to the equivalent direction buttons.
    leaf=page.locator('.hotspot[data-action="turn"]');box=leaf.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+40,y,steps=6);page.mouse.up()
    expect(page.locator('#controls [data-action="leaf"][data-value="1"]')).to_have_attribute('aria-pressed','true')
    control(page,'sail');ready(page);stage(page,'landing');assert page.evaluate(STATE)['method']=='outside'
    control(page,'discover');ready(page);expect(page.locator('#feedback')).to_contain_text('缓流')
    control(page,'flow',1);control(page,'discover');ready(page);stage(page,'done');expect(page.locator('.poem')).to_contain_text('早有蜻蜓立上头')
    page.screenshot(path=str(OUT/'bamboo-done.png'),full_page=True)
    control(page,'poster');expect(page.locator('#poster-preview img')).to_be_visible()
    with page.expect_download() as download:page.locator('#poster-actions a').click()
    poster=OUT/'bamboo.png';download.value.save_as(str(poster));assert struct.unpack('>II',poster.read_bytes()[16:24])==(1080,1440)
    first_src=page.locator('#poster-preview img').get_attribute('src');page.locator('[data-frame="wide"]').click()
    expect(page.locator('#poster-preview img')).not_to_have_attribute('src',first_src)
    with page.expect_download() as download:page.locator('#poster-actions a').click()
    wide=OUT/'bamboo-wide.png';download.value.save_as(str(wide));assert wide.read_bytes()!=poster.read_bytes()
    page.keyboard.press('Escape');expect(page.locator('#voyage-dialog')).not_to_be_visible()
    control(page,'read');expect(page.locator('.detail-heading h1')).to_have_text('小池');expect(page.locator('.site-header')).to_be_visible()
    page.locator('.breadcrumb a').click();stage(page,'done');assert page.evaluate('document.body.style.position')==''
    # Tap controls and keyboard also work with all ambient animation disabled.
    page.locator('#pause').click();expect(page.locator('#pause')).to_have_attribute('aria-pressed','true')
    frozen=page.locator('.boat-bob').get_attribute('transform');page.wait_for_timeout(200);assert page.locator('.boat-bob').get_attribute('transform')==frozen
    control(page,'fork');stage(page,'fork');control(page,'route','lotus');control(page,'flow',1)
    leaf_right=page.locator('#controls [data-action="leaf"][data-value="1"]');leaf_right.focus();page.keyboard.press('Enter')
    control(page,'sail');stage(page,'landing');control(page,'discover');stage(page,'done');expect(page.locator('.poem')).to_contain_text('鱼戏莲叶间')
    page.screenshot(path=str(OUT/'lotus-done.png'),full_page=True)
    assert page.evaluate('ShanyueVoyageView.snapshot().journal.length')==2
    page.locator('#journal').click();expect(page.locator('.journal-row')).to_have_count(2);page.keyboard.press('Escape')
    control(page,'poster');expect(page.locator('#poster-preview img')).to_be_visible()
    with page.expect_download() as download:page.locator('#poster-actions a').click()
    download.value.save_as(str(OUT/'lotus.png'));page.keyboard.press('Escape')
    # Repeat another method on the same shore without replaying the introduction.
    control(page,'fork');control(page,'route','lotus');control(page,'leaf',-1);control(page,'sail');control(page,'flow',0);control(page,'discover')
    assert page.evaluate(STATE)['method']=='outside';assert page.evaluate('ShanyueVoyageView.snapshot().journal.length')==3
    # Interrupted travel is committed; detached scenes do not keep animating.
    control(page,'fork');page.locator('#pause').click();control(page,'route','bamboo')
    page.evaluate('window.detachedPond=document.querySelector("#voyage-host").shadowRoot.querySelector(".boat-position");location.hash="#play"')
    expect(page.locator('.voyage-feature')).to_be_visible();before=page.evaluate('detachedPond.getAttribute("transform")');page.wait_for_timeout(180);assert page.evaluate('detachedPond.getAttribute("transform")')==before
    page.locator('.voyage-feature').click();stage(page,'bend');ready(page);page.reload();stage(page,'bend')
    page.locator('#undo').click();stage(page,'fork')
    page.locator('#help').click();page.evaluate('location.hash="#home"');expect(page.locator('.hero-copy')).to_be_visible();assert page.evaluate('document.body.style.position')==''
    # Actual exported backup includes voyage, and an older backup preserves it.
    page.goto(URL+'#saved');open_settings(page);page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as download:page.locator('[data-action="export-backup"]').click()
    backup=OUT/'backup.json';download.value.save_as(str(backup));payload=json.loads(backup.read_text(encoding='utf-8'));assert len(payload['games']['voyage']['journal'])==3
    with page.expect_download() as download:page.locator('[data-action="export-html"]').click()
    exported=OUT/'export.html';download.value.save_as(str(exported));assert 'ShanyueVoyageView' in exported.read_text(encoding='utf-8')
    page.evaluate('ShanyueVoyageView.restore(null)');page.locator('#import-file').set_input_files(str(backup));page.locator('[data-action="apply-import"]').click();assert page.evaluate('ShanyueVoyageView.snapshot().journal.length')==3
    del payload['games']['voyage'];old=OUT/'old.json';old.write_text(json.dumps(payload,ensure_ascii=False),encoding='utf-8')
    open_settings(page);page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click();page.locator('#import-file').set_input_files(str(old));page.locator('[data-action="apply-import"]').click();assert page.evaluate('ShanyueVoyageView.snapshot().journal.length')==3
    isolated=browser.new_page(viewport={'width':320,'height':650},reduced_motion='reduce');isolated.on('pageerror',lambda e:errors.append(str(e)))
    isolated.goto(exported.as_uri()+'#play/voyage');expect(isolated.locator('#pause')).to_have_attribute('aria-pressed','true');control(isolated,'sail');control(isolated,'route','bamboo');control(isolated,'flow',1);control(isolated,'leaf',-1);control(isolated,'sail');control(isolated,'discover');stage(isolated,'done')
    assert isolated.evaluate('document.documentElement.scrollWidth<=innerWidth')
    # Personal edits invalidate only the affected route; other shore stays playable.
    isolated.evaluate('''() => {const seed=JSON.parse(document.querySelector('#library-data').textContent),edited=structuredClone(seed);edited.works.find(w=>w.id==='xiaochi').lines[2]='个人改写的荷花';localStorage.setItem('shanyue.reading.v2',JSON.stringify({version:2,personal:ShanyuePersonal.diff(seed,edited),state:{},notices:[]}));}''')
    isolated.reload();stage(isolated,'inlet');control(isolated,'sail');expect(isolated.locator('#controls [data-value="bamboo"]')).to_be_disabled();control(isolated,'route','lotus');stage(isolated,'bend')
    # Short screens may put the controls below the scene: invisible motion must not lock the controls.
    short=browser.new_page(viewport={'width':320,'height':480});short.on('pageerror',lambda e:errors.append(str(e)))
    short.goto(URL+'#play/voyage');short.locator('#controls [data-action="sail"]').scroll_into_view_if_needed()
    short.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');short.wait_for_timeout(150)
    control(short,'sail');ready(short);stage(short,'fork');control(short,'route','lotus');ready(short);stage(short,'bend')
    assert short.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    browser.close()
print('PASS: responsive voyage, causal motion, drag/tap/keyboard, both shores/methods, failures, reading returns, 1080x1440 actual-scene PNGs, saved journal, interrupted travel, cleanup, backups, offline export and edited content.')
