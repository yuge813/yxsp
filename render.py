from pathlib import Path
import json,base64,re
from playwright.sync_api import sync_playwright
R=Path(__file__).parent
S=json.loads((R/'screens.json').read_text())
css=(R/'design.css').read_text()
cache={}
def inline(path):
 s=path.read_text().replace('<link rel="stylesheet" href="design.css">','<style>'+css+'</style>')
 for name in ['products.png','hero.png']:
  if name not in cache:cache[name]='data:image/png;base64,'+base64.b64encode((R/'assets'/name).read_bytes()).decode()
  s=s.replace('assets/'+name,cache[name])
 return s
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
 geometry=[]
 for s in S:
  page.set_content(inline(R/s['html']),wait_until='load');page.evaluate('document.fonts.ready')
  page.screenshot(path=str(R/s['image']));page.screenshot(path=str((R/s['image']).with_suffix('.jpg')),type='jpeg',quality=94)
  g=page.evaluate('''() => {const m=document.querySelector('main');const p=document.querySelector('.phone');return {width:p.clientWidth,contentWidth:m.scrollWidth,viewHeight:m.clientHeight,scrollHeight:m.scrollHeight,buttons:[...p.querySelectorAll('.primary,.gold')].map(e=>({text:e.textContent.trim(),top:Math.round(e.getBoundingClientRect().top),bottom:Math.round(e.getBoundingClientRect().bottom)}))}}''')
  geometry.append({'id':s['id'],'name':s['name'],**g})
 page.set_viewport_size({'width':1800,'height':1250})
 for i in range(1,13):
  page.set_content(inline(R/'boards'/f'{i:02d}.html'),wait_until='load');page.evaluate('document.fonts.ready')
  page.screenshot(path=str(R/'board-images'/f'{i:02d}.png'),full_page=True);page.screenshot(path=str(R/'board-images'/f'{i:02d}.jpg'),type='jpeg',quality=94,full_page=True)
 page.set_content(inline(R/'print.html'),wait_until='load');page.evaluate('document.fonts.ready')
 page.pdf(path=str(R/'yuanxiang-red-48-screens.pdf'),print_background=True,prefer_css_page_size=True)
 (R/'geometry.json').write_text(json.dumps(geometry,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'screens':len(geometry),'overflow':[{'id':x['id'],'width':x['contentWidth']} for x in geometry if x['contentWidth']>390],'boards':12,'pdf':'yuanxiang-red-48-screens.pdf'},ensure_ascii=False))
 b.close()
