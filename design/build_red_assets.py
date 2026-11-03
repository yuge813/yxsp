"""Rasterize original approved SVG icons/coin; app never depends on SVG at runtime."""
from pathlib import Path
import json
from PIL import Image
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
paths=json.loads((R/'design/red-icons.json').read_text())
colors={'ink':'#27212C','brand':'#D50D3C','muted':'#806574','light':'#FFFFFF','green':'#6F5968','gold':'#D99A22'}
D=R/'sage_dksy/resource/ui';D.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':96,'height':96},device_scale_factor=1)
 for name,shape in paths.items():
  for tone,color in colors.items():
   svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{shape}</svg>'
   page.set_content('<style>*{margin:0;padding:0}body{background:transparent}</style>'+svg)
   file=D/f'{name}-{tone}.png';page.screenshot(path=str(file),omit_background=True)
   Image.open(file).convert('RGBA').quantize(colors=32,method=Image.Quantize.FASTOCTREE).save(file,optimize=True)
 page.set_viewport_size({'width':420,'height':368})
 page.set_content('<style>*{margin:0;padding:0}body{background:transparent}</style>'+(R/'design/coin.svg').read_text());page.evaluate('document.fonts.ready')
 file=R/'sage_dksy/resource/red/coin.png';page.screenshot(path=str(file),omit_background=True)
 Image.open(file).convert('RGBA').quantize(colors=128,method=Image.Quantize.FASTOCTREE).save(file,optimize=True)
 b.close()
print('Red icon family ready:',len(paths),'names,',len(colors),'tones; coin.png generated')
