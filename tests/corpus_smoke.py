"""Check every published work's mobile reading and default share card."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/test_deps'))
from playwright.sync_api import sync_playwright, expect

URL = (ROOT / 'offline.html').as_uri()
OUT = ROOT / 'test-results/corpus'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    page = browser.new_page(viewport={'width': 320, 'height': 740}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    corpus = page.evaluate('JSON.parse(document.querySelector("#library-data").textContent).works')
    failures = []
    for i, w in enumerate(corpus):
        page.evaluate('(id)=>location.hash="#work/"+id', w['id'])
        expect(page.locator('.detail-heading h1')).to_have_text(w['title'])
        assert page.locator('.verse-line').all_text_contents() == w['lines'], w['title']
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), w['title']
        page.locator('[data-module="sources"] summary').click()
        links = page.locator('[data-module="sources"] a').evaluate_all('(els)=>els.map(e=>({href:e.href,rel:e.rel}))')
        assert links and all(x['href'].startswith('https://') and 'noopener' in x['rel'] for x in links), w['title']
        page.evaluate('(id)=>location.hash="#card/"+id', w['id'])
        expect(page.locator('body')).to_have_attribute('data-page', 'card')
        page.wait_for_function('() => document.querySelector("#share-image")?.getAttribute("src") || !document.querySelector("#share-error")?.hidden')
        if page.locator('#share-error').is_visible():
            failures.append((w['title'], page.locator('#share-error').inner_text()))
        else:
            expect(page.locator('#share-image')).to_be_visible()
            expect(page.locator('[data-action="download-image"]')).to_be_enabled()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), w['title']
        if (i+1) % 40 == 0:
            print(f'CHECKED: {i+1}/{len(corpus)} mobile works and default cards', flush=True)
    assert not failures, failures
    for identity in ['kongquedongnanfeibingxu', 'chibifu', 'shizuo', 'tengwanggexu']:
        page.evaluate('(id)=>location.hash="#work/"+id', identity)
        expect(page.locator('.detail-heading h1')).to_be_visible()
        page.screenshot(path=str(OUT / (identity+'.png')))
    assert not errors, errors
    print(f'PASS: all {len(corpus)} works render with complete text, source links, 320px layout and usable default cards', flush=True)
    browser.close()
