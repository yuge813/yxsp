"""Render isolated browser layout screenshots, never application runtime data."""
from pathlib import Path
import argparse, html, json, re
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=Path('/workspace/scratch/yuanxiang_red_release_preview'))
parser.add_argument('--overview-limit', type=int, default=5)
args = parser.parse_args()
root = args.output.resolve()
manifest = json.loads((root / 'manifest.json').read_text())
screens = manifest['screens']
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                args=['--no-sandbox', '--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    results = []
    for screen in screens:
        key = screen['id']
        page.set_content((root / (key + '.html')).read_text(), wait_until='load')
        page.evaluate('document.fonts.ready')
        page.screenshot(path=str(root / (key + '.png')))
        geometry = page.evaluate('''() => {const p=document.querySelector('.mini-page');return {
            w:p.clientWidth,scrollWidth:p.scrollWidth,height:p.clientHeight,scrollHeight:p.scrollHeight,
            documentWidth:document.documentElement.scrollWidth,images:[...document.images].length}}''')
        results.append({'screen': key, **geometry})
    # Disk index stays small and links sibling HTML. Inject only the overview frames
    # in memory for Chromium's set_content mode; this never publishes fixture data.
    overview = (root / 'index.html').read_text()
    overview_ids = {s['id'] for s in screens[:args.overview_limit]}
    def inline_frame(match):
        key = match.group(1)
        document = (root / (key + '.html')).read_text() if key in overview_ids else ''
        return 'srcdoc="' + html.escape(document, quote=True) + '"'
    overview = re.sub(r'src="([a-z0-9-]+)\.html"', inline_frame, overview)
    page.set_viewport_size({'width': 2182, 'height': 1150})
    page.set_content(overview, wait_until='load')
    page.evaluate('document.fonts.ready')
    for i in range(args.overview_limit, len(screens)):
        page.locator('.preview-card').nth(i).evaluate('el=>el.style.display="none"')
    page.screenshot(path=str(root / 'overview.png'), full_page=True)
    (root / 'geometry.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(results, ensure_ascii=False))
    browser.close()
