"""Execute the real page-owned poster renderer through an offline browser canvas adapter.
The demonstrative code pattern is intentionally not a real invitation QR.
"""
from pathlib import Path
import argparse, base64, json
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=Path('/workspace/scratch/yuanxiang_brand_fix_preview'))
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
args.output.mkdir(parents=True,exist_ok=True)
assets={}
for key in ['/sage_dksy/resource/red/hero.png','/sage_dksy/resource/brand/logo.png']:
    assets[key]='data:image/png;base64,'+base64.b64encode((root/key.lstrip('/')).read_bytes()).decode()
source=(root/'sage_dksy/pages/v11/red-poster.js').read_text()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':540,'height':714},device_scale_factor=2)
    page.set_content('<style>*{box-sizing:border-box}html,body{margin:0;background:#FFF6F5;font-family:sans-serif}canvas{display:block;width:540px;height:678px}.note{font-size:13px;line-height:36px;text-align:center;color:#806574;background:white}</style><canvas id="poster" width="540" height="678"></canvas><div class="note">浏览器实际绘图代码预览 · 演示码并非真实邀请二维码</div>')
    result=page.evaluate('''async({source,assets})=>{
      const images={};for(const [path,src] of Object.entries(assets)){const image=new Image();image.src=src;await image.decode();images[path]=image;}
      const qr=document.createElement('canvas');qr.width=qr.height=112;const q=qr.getContext('2d');q.fillStyle='#FFFFFF';q.fillRect(0,0,112,112);q.fillStyle='#806574';
      for(let y=0;y<25;y++)for(let x=0;x<25;x++)if((x*17+y*13+x*y)%7<3)q.fillRect(6+x*4,6+y*4,3,3);
      q.fillStyle='#FFFFFF';q.fillRect(24,43,64,28);q.fillStyle='#BE1744';q.font='bold 16px sans-serif';q.fillText('演示码',31,63);images['wxfile://demo-only-code']=qr;
      const canvas=document.querySelector('#poster'),native=canvas.getContext('2d'),drawn=[];
      const adapter=new Proxy({}, {get(_,key){
        if(key==='setFillStyle')return v=>native.fillStyle=v;
        if(key==='setStrokeStyle')return v=>native.strokeStyle=v;
        if(key==='setLineWidth')return v=>native.lineWidth=v;
        if(key==='setFontSize')return v=>native.font=v+'px "Noto Sans CJK SC", sans-serif';
        if(key==='draw')return (_,done)=>done();
        if(key==='drawImage')return (path,...args)=>{if(!images[path])throw new Error('Missing normalized image '+path);drawn.push(path);native.drawImage(images[path],...args);};
        const value=native[key];return typeof value==='function'?value.bind(native):value;
      }});
      const wx={env:{USER_DATA_PATH:'/demo-user'},getImageInfo({src,success}){const image=images[src];if(!image)throw new Error('Unknown asset '+src);queueMicrotask(()=>success({path:src.replace(/^\\//,''),width:image.naturalWidth||image.width,height:image.naturalHeight||image.height}));},createCanvasContext(){return adapter;},canvasToTempFilePath(opts){opts.success({tempFilePath:'wxfile://offline-poster-preview'});}};
      const module={exports:{}};new Function('module','wx',source)(module,wx);
      await new Promise((resolve,reject)=>module.exports.render({_alive:true},'wxfile://demo-only-code',0,{nickname:'演示用户'},resolve,reject));
      return {drawn,logo:drawn.includes('/sage_dksy/resource/brand/logo.png'),scope:'Actual page-owned renderer in browser CanvasContext adapter; demo code only, no WeChat SDK or backend execution.'};
    }''',{'source':source,'assets':assets})
    page.screenshot(path=str(args.output/'poster-canvas.png'))
    (args.output/'poster-canvas-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
    browser.close()
