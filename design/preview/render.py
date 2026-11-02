from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path('/workspace/scratch/yuanxiang_release_preview')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
 results=[]
 for key in ['home','tasks','gifts','mine','read','sign','product']:
  page.set_content((ROOT/(key+'.html')).read_text(),wait_until='load')
  page.evaluate('document.fonts.ready')
  page.screenshot(path=str(ROOT/(key+'.png')))
  geometry=page.evaluate('''() => {const p=document.querySelector('.mini-page');return {w:p.clientWidth,scrollWidth:p.scrollWidth,height:p.clientHeight,scrollHeight:p.scrollHeight,documentWidth:document.documentElement.scrollWidth,images:[...document.images].length}}''')
  results.append({'screen':key,**geometry})
 page.set_viewport_size({'width':1790,'height':1150})
 page.set_content((ROOT/'index.html').read_text(),wait_until='load')
 page.evaluate('document.fonts.ready')
 # Four root destinations shown in one high resolution overview; others remain in HTML and PNGs.
 page.locator('.preview-card').nth(4).evaluate('el=>el.style.display="none"')
 page.locator('.preview-card').nth(5).evaluate('el=>el.style.display="none"')
 page.locator('.preview-card').nth(6).evaluate('el=>el.style.display="none"')
 page.screenshot(path=str(ROOT/'overview.png'),full_page=True)
 (ROOT/'geometry.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print(json.dumps(results,ensure_ascii=False))
 browser.close()
