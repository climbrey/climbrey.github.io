"""Verify the PWA at a repository subpath, or the committed homepage with --root."""
import argparse
import functools
import http.server
import json
import os
import re
import shutil
import sys
import time
import threading
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright, expect
OUT=ROOT/'test-results'
parser=argparse.ArgumentParser()
parser.add_argument('--root',action='store_true',help='Exercise the committed main / root release')
args=parser.parse_args()
COPY=OUT/('pwa-root' if args.root else 'pwa-site')
shutil.copytree(ROOT/'site',COPY,dirs_exist_ok=True)
if args.root:
    for relative in [p.relative_to(ROOT/'site') for p in (ROOT/'site').rglob('*') if p.is_file()]:
        shutil.copyfile(ROOT/relative,COPY/relative)
    shutil.copyfile(ROOT/'offline.html',COPY/'offline.html')
    shutil.copyfile(ROOT/'logo.png',COPY/'logo.png')
    shutil.copytree(ROOT/'legacy',COPY/'legacy',dirs_exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(COPY if args.root else OUT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL='http://127.0.0.1:'+str(server.server_port)+'/'+('' if args.root else 'pwa-site/')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce',accept_downloads=True)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL)
    expect(page.locator('.hero-copy h2')).to_have_text('鸟鸣涧')
    page.wait_for_function('navigator.serviceWorker.controller !== null')
    manifest=context.request.get(URL+'manifest.webmanifest').json()
    assert manifest['scope']=='./' and manifest['display']=='standalone'
    for icon in manifest['icons']:
        assert context.request.get(URL+icon['src']).status==200
    expect(page.locator('link[rel="apple-touch-icon"]')).to_have_attribute('sizes','180x180')
    expect(page.locator('.site-footer [data-hosted-only]')).to_have_count(1)
    print('PASS: '+('root homepage' if args.root else 'repository subpath')+', manifest, icons and active service worker',flush=True)
    if args.root:
        page.goto(URL+'legacy/previous-site/')
        expect(page.locator('h1')).to_have_text('Hello, GitHub Pages!')
        page.goto(URL+'offline.html')
        expect(page.locator('.hero-copy h2')).to_have_text('鸟鸣涧')
        expect(page.locator('link[rel="manifest"]')).to_have_count(0)
        page.goto(URL)
        expect(page.locator('.hero-copy h2')).to_have_text('鸟鸣涧')
        print('PASS: old page and standalone HTML remain accessible under the root service worker',flush=True)

    context.set_offline(True)
    page.reload()
    expect(page.locator('.hero-copy h2')).to_have_text('鸟鸣涧')
    page.locator('.hero-actions a').click()
    expect(page.locator('.detail-heading h1')).to_have_text('鸟鸣涧')
    page.locator('.detail-actions [data-action="share"]').click()
    expect(page.locator('#share-image')).to_be_visible()
    with page.expect_download() as download:
        page.locator('[data-action="download-image"]').click()
    download.value.save_as(str(OUT/'pwa-offline-card.png'))
    page.locator('[data-action="close-modal"]').click()
    print('PASS: offline reload, full reading and real image export',flush=True)

    page.locator('[data-action="settings"]').click()
    page.locator('.settings-group summary').filter(has_text='导入、导出与备份').click()
    with page.expect_download() as download:
        page.locator('[data-action="export-html"]').click()
    single=OUT/'pwa-export-single.html'
    download.value.save_as(str(single))
    html=single.read_text(encoding='utf-8')
    assert 'src="./pwa.js"' not in html and 'rel="manifest"' not in html
    page.locator('[data-action="close-modal"]').click()
    print('PASS: PWA exports remain self-contained HTML files',flush=True)

    context.set_offline(False)
    page.locator('.detail-actions [data-action="favorite"]').click()
    page.evaluate("caches.open('unrelated-application-cache')")
    index=COPY/'index.html'
    index.write_text(index.read_text(encoding='utf-8').replace('</head>','<meta name="pwa-test-release" content="second"></head>'),encoding='utf-8')
    sw=COPY/'sw.js'
    sw.write_text(re.sub(r"const RELEASE = '[^']+';","const RELEASE = 'update-test-second-release';",sw.read_text(encoding='utf-8')),encoding='utf-8')
    os.utime(sw,(time.time()+2,time.time()+2))
    page.evaluate('(async () => { const registration=await navigator.serviceWorker.ready; await registration.update(); })()')
    expect(page.locator('[data-pwa-update]')).to_be_visible(timeout=20000)
    expect(page.locator('meta[name="pwa-test-release"]')).to_have_count(0)
    page.locator('[data-pwa-update]').click()
    expect(page.locator('meta[name="pwa-test-release"]')).to_have_attribute('content','second')
    expect(page.locator('.detail-actions [data-action="favorite"]')).to_have_attribute('aria-pressed','true')
    assert page.evaluate("caches.has('unrelated-application-cache')")
    print('PASS: updates wait for user action, preserve favorites and keep unrelated caches',flush=True)

    context.set_offline(True)
    page.goto(URL+'index.html?source=homescreen')
    expect(page.locator('.hero-copy h2')).to_be_visible()
    page.screenshot(path=str(OUT/'pwa-mobile-home.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    print('PASS: homescreen start URL works offline with no script errors',flush=True)
    browser.close()
server.shutdown()
server.server_close()
