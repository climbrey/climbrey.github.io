"""Exercise legacy migration, published content updates and backup restoration."""
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/test_deps'))
from playwright.sync_api import sync_playwright, expect
from browser_helpers import open_settings, close_surface

OUT = ROOT / 'test-results/content-updates'
OUT.mkdir(parents=True, exist_ok=True)
PAGE = OUT / 'index.html'
HTML = (ROOT / 'offline.html').read_text(encoding='utf-8')
seed = json.loads(re.search(r'<script id="library-data" type="application/json">(.*?)</script>', HTML, re.S)[1])


def publish(library, baseline):
    text = HTML
    for key, data in [('library-data', library), ('legacy-content', baseline)]:
        payload = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
        text = re.sub(r'(<script id="' + key + r'" type="application/json">).*?(</script>)', lambda m: m[1] + payload + m[2], text, flags=re.S)
    PAGE.write_text(text, encoding='utf-8')


def work(data, identity='jingyesi'):
    return next(w for w in data['works'] if w['id'] == identity)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    PAGE.write_text(HTML, encoding='utf-8')
    page.goto(PAGE.as_uri())
    baseline = page.evaluate('ShanyuePersonal.fingerprints(ShanyueLibrary.validateLibrary(JSON.parse(document.querySelector("#library-data").textContent)))')
    legacy = copy.deepcopy(seed)
    legacy.pop('discovery', None)
    work(legacy)['background'] = '旧版用户自己补充的背景。'
    legacy['modules'].append({'id':'place','label':'一处地名','enabled':True})
    work(legacy)['extra']['place'] = '旧版用户的一处地名。'
    original = work(legacy)
    state = {
        'favorites':['jingyesi'], 'fontSize':26, 'lastWork':'jingyesi',
        'quotes':[{'id':'jingyesi-0','workId':'jingyesi','index':0,'text':original['lines'][0],'title':original['title'],'author':'李白','dynasty':'唐'}],
        'records':[{'id':'old-card','workId':'jingyesi','title':'静夜思','author':'李白','dynasty':'唐','lines':original['lines'],'picked':[0], 'text':original['lines'][0],'theme':'paper','mode':'quote','ratio':'portrait','note':'以前留下的诗卡'}],
    }
    raw = json.dumps({'version':1,'library':legacy,'state':state}, ensure_ascii=False)
    page.evaluate('(raw)=>localStorage.setItem("shanyue.reading.v1",raw)', raw)
    updated = copy.deepcopy(seed)
    work(updated)['background'] = '内置背景已经修订。'
    work(updated)['thought'] = '未被个人改动的思想解读已经更新。'
    updated['works'].append({**copy.deepcopy(work(seed)), 'id':'new-work', 'title':'新发布的作品'})
    publish(updated, baseline)
    page.reload()
    assert page.evaluate('localStorage.getItem("shanyue.reading.v1")') == raw
    stored = page.evaluate('JSON.parse(localStorage.getItem("shanyue.reading.v2"))')
    assert stored['version'] == 2 and 'library' not in stored
    assert stored['state']['favorites'] == ['jingyesi']
    assert stored['state']['quotes'][0]['text'] == original['lines'][0]
    assert stored['state']['records'][0]['note'] == '以前留下的诗卡'
    assert list(stored['personal']['groups']['works']) == ['jingyesi']
    page.goto(PAGE.as_uri() + '#work/jingyesi')
    expect(page.locator('.detail-actions [data-action="favorite"]')).to_have_attribute('aria-pressed','true')
    page.locator('[data-module="background"] summary').click()
    expect(page.locator('[data-module="background"]')).to_contain_text('旧版用户自己补充的背景。')
    page.locator('[data-module="thought"] summary').click()
    expect(page.locator('[data-module="thought"]')).to_contain_text('未被个人改动的思想解读已经更新。')
    page.locator('[data-module="place"] summary').click()
    expect(page.locator('[data-module="place"]')).to_contain_text('旧版用户的一处地名。')
    page.goto(PAGE.as_uri() + '#work/new-work')
    expect(page.locator('.detail-heading h1')).to_have_text('新发布的作品')
    print('PASS: legacy favorites, quotes, cards and custom text migrate; official additions and untouched fields update', flush=True)

    open_settings(page)
    page.locator('[data-action="content-updates"]').click()
    expect(page.locator('.modal-body')).to_contain_text('静夜思 · 写作缘起')
    page.locator('[data-action="keep-content"]').click()
    open_settings(page)
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as download:
        page.locator('[data-action="export-backup"]').click()
    backup = OUT / 'personal-v2.json'
    download.value.save_as(str(backup))
    close_surface(page)
    page.evaluate('localStorage.clear()')
    page.reload()
    open_settings(page)
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    page.locator('#import-file').set_input_files(str(backup))
    page.locator('[data-action="apply-import"]').click()
    page.reload()
    assert page.evaluate('JSON.parse(localStorage.getItem("shanyue.reading.v2")).state.favorites') == ['jingyesi']
    print('PASS: version 2 backup restores personal changes and records without freezing the whole library', flush=True)

    newer = copy.deepcopy(updated)
    work(newer)['background'] = '再次修订后的内置背景。'
    work(newer)['thought'] = '第二次内置解读。'
    publish(newer, baseline)
    page.reload()
    open_settings(page)
    page.locator('[data-action="content-updates"]').click()
    page.locator('[data-action="use-published"]').click()
    page.locator('[data-action="confirm-published"]').click()
    page.goto(PAGE.as_uri() + '#work/jingyesi')
    page.locator('[data-module="background"] summary').click()
    expect(page.locator('[data-module="background"]')).to_contain_text('再次修订后的内置背景。')
    page.locator('[data-module="place"] summary').click()
    expect(page.locator('[data-module="place"]')).to_contain_text('旧版用户的一处地名。')
    print('PASS: choosing published conflicts updates only those fields and preserves unrelated personal text', flush=True)

    old_backup = OUT / 'personal-v1.json'
    old_backup.write_text(json.dumps({'format':'shanyue','version':1,'kind':'backup','library':legacy,'state':state}, ensure_ascii=False), encoding='utf-8')
    open_settings(page)
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    page.locator('#import-file').set_input_files(str(old_backup))
    page.locator('[data-action="apply-import"]').click()
    page.reload()
    saved = page.evaluate('JSON.parse(localStorage.getItem("shanyue.reading.v2"))')
    assert saved['state']['records'][0]['id'] == 'old-card'
    assert saved['personal']['groups']['works']['jingyesi']['set']['background'] == '旧版用户自己补充的背景。'
    page.locator('[data-module="thought"] summary').click()
    expect(page.locator('[data-module="thought"]')).to_contain_text('第二次内置解读。')
    print('PASS: old backup import retains personal text while adopting current untouched content', flush=True)

    page.evaluate('localStorage.setItem("shanyue.reading.v2", "broken-data")')
    page.reload()
    expect(page.locator('.detail-heading h1')).to_have_text('静夜思')
    page.locator('.detail-actions [data-action="favorite"]').click()
    assert page.evaluate('localStorage.getItem("shanyue.reading.v2")') == 'broken-data'
    assert not errors, errors
    print('PASS: unreadable storage stays intact and cannot be overwritten by normal reading actions', flush=True)
    browser.close()
