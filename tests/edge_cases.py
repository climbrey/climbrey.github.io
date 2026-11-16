"""Targeted checks for saved-text snapshots, imported text and image styles."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright, expect
from browser_helpers import open_card_panel, open_settings, close_surface
OUT=ROOT/'test-results'
URL=(ROOT/'offline.html').as_uri()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce',accept_downloads=True)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL+'#work/jingyesi')
    page.locator('.verse-line').nth(1).click()
    page.locator('[data-action="save-quote"]').click()
    page.evaluate('''() => {const stored=JSON.parse(localStorage.getItem('shanyue.reading.v2'));const seed=ShanyueLibrary.validateLibrary(JSON.parse(document.querySelector('#library-data').textContent));const edited=ShanyuePersonal.apply(seed,stored.personal).library;edited.works.find(w=>w.id==='jingyesi').lines[1]='原文更新后的测试内容。';stored.personal=ShanyuePersonal.diff(seed,edited);localStorage.setItem('shanyue.reading.v2',JSON.stringify(stored));}''')
    page.goto(URL+'#saved')
    page.reload()
    page.locator('[data-action="saved-tab"][data-id="quotes"]').click()
    page.locator('[data-action="share-saved-quote"]').click()
    expect(page.locator('#share-image')).to_have_attribute('alt','静夜思分享卡：疑是地上霜。')
    close_surface(page)
    print('PASS: saved quotations retain their own text when library content changes',flush=True)

    data=page.evaluate("JSON.parse(document.querySelector('#library-data').textContent)")
    work=next(w for w in data['works'] if w['id']=='niaomingjian')
    payload='<img src=x onerror="window.__import_executed=true">'
    work['reading'][0]['text']=payload
    config_payload='<img src=x onerror="window.xss=1">'
    data['discovery']['landscape'][0]['label']=config_payload
    data['discovery']['motifs'][0]['hint']=config_payload
    source=OUT/'text-import.json'
    source.write_text(json.dumps({'format':'shanyue','version':1,'kind':'content','library':data},ensure_ascii=False),encoding='utf-8')
    open_settings(page)
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    page.locator('#import-file').set_input_files(str(source))
    page.locator('[data-action="apply-import"]').click()
    page.goto(URL+'#work/niaomingjian')
    page.locator('[data-module="reading"] summary').click()
    expect(page.locator('[data-module="reading"] .module-body')).to_contain_text(payload)
    assert page.locator('[data-module="reading"] img').count()==0
    assert page.evaluate('window.__import_executed === undefined')
    page.goto(URL+'#home')
    expect(page.locator('.motifs')).to_contain_text(config_payload)
    assert page.locator('.motifs img').count()==0
    page.goto(URL+'#explore')
    expect(page.locator('.discovery-cards')).to_contain_text(config_payload)
    assert page.locator('.discovery-cards img').count()==0
    assert page.evaluate('window.xss === undefined')
    page.goto(URL+'#work/niaomingjian')
    print('PASS: imported annotation markup is displayed as text, never executed',flush=True)

    page.locator('.detail-actions [data-action="share"]').click()
    open_card_panel(page, "quote")
    page.locator('[data-action="share-mode"][data-id="whole"]').click()
    for theme in ['paper','night','botanic']:
        page.locator('[data-action="share-theme"][data-id="'+theme+'"]').click()
        for ratio in ['portrait','square']:
            open_card_panel(page, "layout")
            page.locator('[data-action="share-ratio"][data-id="'+ratio+'"]').click()
            expect(page.locator('#share-error')).not_to_be_visible()
            with page.expect_download() as downloaded:
                page.locator('[data-action="download-image"]').click()
            downloaded.value.save_as(str(OUT/('bird-'+theme+'-'+ratio+'.png')))
    assert not errors,errors
    print('PASS: complete short poem exports in all three styles and both aspect ratios',flush=True)
    browser.close()
