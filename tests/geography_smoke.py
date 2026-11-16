"""Geographic discovery, combined filters, routes and responsive reading."""
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/test_deps'))
from playwright.sync_api import sync_playwright, expect
from browser_helpers import close_surface

URL=sys.argv[1] if len(sys.argv)>1 else (ROOT/'offline.html').as_uri()
OUT=ROOT/'test-results/geography'
OUT.mkdir(parents=True,exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    for width in [320,390,768,1440]:
        context=browser.new_context(viewport={'width':width,'height':900},is_mobile=width<600,has_touch=width<600,reduced_motion='reduce')
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL+'#explore?view=places')
        expect(page.locator('[data-action="explore-view"][data-id="places"]')).to_have_attribute('aria-pressed','true')
        expect(page.locator('[data-action="explore-view"][data-id="landscape"]')).to_have_attribute('aria-pressed','false')
        expect(page.locator('#discovery-cards .discovery-card')).to_have_count(6)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        # The actual touch targets in the three-tab header must neither overlap nor leave the viewport.
        boxes=page.locator('.discovery-tabs button, .discovery-heading>[data-action="filters"]').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right}})')
        assert all(b['x']>=0 and b['right']<=width for b in boxes)
        assert all(a['right']<=b['x'] for a,b in zip(boxes,boxes[1:]))
        def results():
            return set(page.locator('.result-list .tile-link').evaluate_all('(els)=>els.map(e=>e.hash.split("/")[1])'))
        # Ancient and modern aliases resolve to the same Chengdu collection.
        page.locator('#search').fill('成都')
        page.wait_for_timeout(150)
        modern=results()
        page.locator('#search').fill('锦官城')
        page.wait_for_timeout(150)
        assert results()==modern and 'chunyu' in modern
        page.locator('#search').fill('四川')
        page.wait_for_timeout(150)
        assert modern<=results() and 'emeishanyuege' in results()
        page.locator('[data-action="clear-search"]').click()
        # Geography AND scenery; alternate locations within geography are OR.
        page.locator('#discovery-cards [data-id="geo_chengdu"]').click()
        assert results()==modern
        page.locator('[data-action="explore-view"][data-id="landscape"]').click()
        page.locator('#discovery-cards [data-id="rain"]').click()
        assert 'chunyu' in results() and results()<modern
        page.locator('[data-action="explore-view"][data-id="places"]').click()
        page.locator('#discovery-cards [data-id="geo_hangzhou"]').click()
        assert 'yinhu' in results() and 'chunyu' in results()
        selected=results()
        page.reload()
        assert results()==selected
        page.locator('[data-action="clear-filters"]').click()
        page.locator('[data-action="filters"]').click()
        assert page.locator('.advanced-filters>.filter-row').first.get_attribute('class').find('geography-filters')>=0
        region=page.locator('.place-group').filter(has=page.locator('[data-id="geo_region_sichuan"]'))
        region.locator('summary').click()
        region.locator('[data-id="geo_region_sichuan"]').click()
        close_surface(page)
        assert modern<=results() and 'emeishanyuege' in results()
        page.screenshot(path=str(OUT/f'places-{width}.png'),full_page=True)
        # Following a result, place note and a geographic tag returns to the place view.
        page.goto(URL+'#work/chunyu')
        module=page.locator('[data-module="places"]')
        module.locator('summary').click()
        expect(module).to_contain_text('锦官城 → 成都')
        page.locator('[data-action="tag"][data-id="geo_chengdu"]').click()
        expect(page.locator('[data-action="explore-view"][data-id="places"]')).to_have_attribute('aria-pressed','true')
        assert results()==modern
        assert not errors,errors
        context.close()
    browser.close()
print('PASS: geography search, region hierarchy, combined filters, reload/navigation and four viewport widths')
