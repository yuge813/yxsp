"""Fresh design drawing primitives for Red Nova. No application source imports."""
from html import escape
P={
'home':'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
'coin':'<circle cx="12" cy="12" r="9"/><path d="m12 6 2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>',
'gift':'<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13m0-13c-8 0-7-7-3-5l3 5c8 0 7-7 3-5z"/>',
'bag':'<path d="M5 8h14l2 13H3zM8 8V6a4 4 0 0 1 8 0v2"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
'play':'<path d="m9 7 8 5-8 5z"/><rect x="2" y="3" width="20" height="18" rx="5"/>',
'check':'<rect x="3" y="5" width="18" height="17" rx="4"/><path d="M7 2v6m10-6v6M3 11h18m-13 5 3 3 5-5"/>',
'yes':'<path d="m5 12 5 5L20 7"/>',
'arrow':'<path d="m9 4 8 8-8 8"/>',
'back':'<path d="m15 4-8 8 8 8"/>',
'close':'<path d="m6 6 12 12M6 18 18 6"/>',
'bell':'<path d="M4 18h16l-2-4V9a6 6 0 0 0-12 0v5zM10 22h4"/>',
'order':'<path d="M5 2h14v20l-3-2-4 2-4-2-3 2zM9 7h6m-6 5h6m-6 5h4"/>',
'friend':'<circle cx="9" cy="8" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m0-17a3 3 0 0 1 0 6m3 3a6 6 0 0 1 3 6"/>',
'share':'<path d="M12 15V2m-5 5 5-5 5 5M5 12H3v10h18V12h-2"/>',
'location':'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2.5"/>',
'heart':'<path d="M12 21C2 14-1 7 4 4c3-2 6 0 8 2 2-2 5-4 8-2 5 3 2 10-8 17z"/>',
'settings':'<path d="m9 2 6 0 1 3 4 2v4l-2 2 2 2v4l-4 2-1 2H9l-1-2-4-2v-4l2-2-2-2V7l4-2z"/><circle cx="12" cy="13" r="3"/>',
'help':'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 3-3 2-3 5m0 3v1"/>',
'shield':'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6"/>',
'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/>',
'search':'<circle cx="10" cy="10" r="6"/><path d="m15 15 7 7"/>',
'edit':'<path d="m4 16 12-13 5 5L8 21H3zM13 6l5 5"/>',
'copy':'<rect x="7" y="7" width="14" height="15" rx="2"/><path d="M3 17V2h14"/>',
'package':'<path d="m3 7 9-5 9 5v12l-9 4-9-4zM3 7l9 5 9-5m-9 5v11M7 4l10 5"/>',
'van':'<path d="M2 5h13v13H2zM15 10h4l3 4v4h-7"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
'refresh':'<path d="M20 9a9 9 0 1 0-1 10M16 9h6V3"/>',
'info':'<circle cx="12" cy="12" r="9"/><path d="M12 11v7m0-12v1"/>',
'photo':'<rect x="2" y="3" width="20" height="18" rx="4"/><circle cx="8" cy="9" r="2"/><path d="m3 19 6-6 4 3 4-7 4 6"/>',
'headset':'<path d="M3 15V9a9 9 0 0 1 18 0v6M3 12h4v8H3zm14 0h4v8h-4zm1 8-3 3h-3"/>',
'wallet':'<rect x="2" y="5" width="20" height="16" rx="3"/><path d="M17 11h5v5h-5zM3 6V3h16"/>',
'flash':'<path d="M14 2 4 14h7l-1 8 10-13h-7z"/>',
}
def ic(name,size=22):return f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{P.get(name,P["info"])}</svg>'
def coin_art():
 return '''<svg viewBox="0 0 240 210" class="reward-art"><defs><linearGradient id="gold"><stop stop-color="#FFF4CD"/><stop offset=".3" stop-color="#FFE6A0"/><stop offset=".65" stop-color="#FFC44D"/><stop offset="1" stop-color="#E89A14"/></linearGradient><linearGradient id="edge" x2="1" y2="1"><stop stop-color="#F4BD50"/><stop offset=".5" stop-color="#C9770E"/><stop offset="1" stop-color="#FFE7A2"/></linearGradient></defs><ellipse cx="126" cy="187" rx="81" ry="12" fill="#7F002A" opacity=".2"/><g transform="translate(55 127)"><ellipse cx="70" cy="30" rx="65" ry="22" fill="url(#edge)"/><path d="M5 16v14c0 28 130 28 130 0V16" fill="url(#edge)"/><ellipse cx="70" cy="16" rx="65" ry="22" fill="url(#gold)"/><ellipse cx="70" cy="15" rx="53" ry="15" fill="none" stroke="#FFF5CD" stroke-width="2"/></g><g transform="rotate(-17 100 90)"><ellipse cx="110" cy="83" rx="60" ry="69" fill="url(#edge)"/><ellipse cx="101" cy="78" rx="60" ry="69" fill="url(#gold)"/><ellipse cx="101" cy="78" rx="48" ry="56" fill="none" stroke="#FFEEB6" stroke-width="3"/><text x="102" y="94" text-anchor="middle" font-family="Noto Sans CJK SC,sans-serif" font-weight="800" font-size="45" fill="#C98012">享</text><path d="m55 46 8-11" stroke="#FFF9D9" stroke-width="6" stroke-linecap="round"/></g><g fill="#FFF2BB"><path d="m203 35 3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="m33 141 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g></svg>'''
def gift_art():
 return '<svg viewBox="0 0 1280 1280" class="reward-art"><use href="#brand-hero"/></svg>'

def vector_gift_art():
 return '''<svg viewBox="0 0 240 210" class="reward-art"><defs><linearGradient id="box"><stop stop-color="#FF6A65"/><stop offset=".45" stop-color="#FA2943"/><stop offset="1" stop-color="#B20036"/></linearGradient><linearGradient id="ribbon"><stop stop-color="#FFF3BD"/><stop offset=".45" stop-color="#FFCC61"/><stop offset="1" stop-color="#E19A2A"/></linearGradient></defs><ellipse cx="123" cy="190" rx="79" ry="11" fill="#A50C34" opacity=".15"/><path d="m48 84 77-20 72 26v82l-75 23-74-29z" fill="url(#box)"/><path d="m122 108 75-18v82l-75 23z" fill="#BB0B39"/><path d="m43 71 82-22 79 29v23l-83 25-78-31z" fill="url(#box)"/><path d="m99 57 25-7 25 10-24 7zM100 100l25 10v85l-25-9zM100 100l80-25 24 9-79 26z" fill="url(#ribbon)"/><path d="M124 60C65 32 66-5 94 12c18 13 24 35 30 48 60-32 67-74 33-49-20 16-27 35-33 49z" fill="none" stroke="url(#ribbon)" stroke-width="12"/><path d="m42 31 3 9 9 3-9 3-3 9-3-9-9-3 9-3zm164 95 2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="#FFE7A4"/></svg>'''
def product(kind='cup'):
 photos={'cup':(768,512),'mug':(768,512),'bottle':(0,0),'tumbler':(0,0),'headphones':(768,0),'headphone':(768,0),'kettle':(0,512),'pot':(0,512)}
 if kind in photos:
  x,y=photos[kind]
  return f'<svg class="product-art product-photo" viewBox="{x} {y} 768 512" preserveAspectRatio="xMidYMid slice"><use href="#product-photo-sheet"/></svg>'
 defs='''<defs><linearGradient id="ivory"><stop stop-color="#CBC7C4"/><stop offset=".23" stop-color="#FFFDF9"/><stop offset=".7" stop-color="#F3F0EB"/><stop offset="1" stop-color="#CFC9C4"/></linearGradient><linearGradient id="metal"><stop stop-color="#B0B8BC"/><stop offset=".3" stop-color="#F7FCFF"/><stop offset=".6" stop-color="#D9E1E6"/><stop offset="1" stop-color="#8C979E"/></linearGradient><linearGradient id="pink"><stop stop-color="#F8D6DD"/><stop offset=".4" stop-color="#FFF0F2"/><stop offset="1" stop-color="#DBA0AF"/></linearGradient><radialGradient id="shadow"><stop stop-color="#44222F" stop-opacity=".2"/><stop offset="1" stop-color="#44222F" stop-opacity="0"/></radialGradient></defs>'''
 base='<ellipse cx="150" cy="221" rx="100" ry="17" fill="url(#shadow)"/>'
 if kind in ['cup','mug']:
  shape='<path d="M182 89h24c39 0 37 64 0 67h-23v-17h19c20 0 24-34 1-34h-21" fill="url(#ivory)" stroke="#D9CECA" stroke-width="2"/><path d="m79 78 11 112q3 24 52 25t52-25l10-112z" fill="url(#ivory)"/><ellipse cx="141" cy="78" rx="63" ry="14" fill="#FFFDF9" stroke="#D0C5C1" stroke-width="2"/><ellipse cx="141" cy="79" rx="53" ry="8" fill="#AD8B73"/><path d="M105 104v69" stroke="white" stroke-width="6" opacity=".7" stroke-linecap="round"/><text x="145" y="155" font-size="11" font-family="sans-serif" letter-spacing="3" fill="#A69B96" text-anchor="middle">DAILY</text>'
 elif kind in ['bottle','tumbler']:
  shape='<rect x="99" y="45" width="101" height="167" rx="24" fill="url(#metal)"/><rect x="102" y="33" width="95" height="30" rx="10" fill="#343C42"/><rect x="117" y="29" width="64" height="11" rx="5" fill="#69747B"/><path d="M107 68v108" stroke="white" stroke-width="4" opacity=".7"/><path d="M124 140h48" stroke="#ADB7BD" stroke-width="1"/><text x="150" y="164" text-anchor="middle" font-size="10" letter-spacing="2" fill="#6E7C85">EVERYDAY</text>'
 elif kind in ['headphone','headphones']:
  shape='<path d="M73 141v-34C73 13 228 13 228 107v34" fill="none" stroke="#D8D1C8" stroke-width="24"/><path d="M74 132v-28C74 25 226 25 226 104v28" fill="none" stroke="#F4EFE8" stroke-width="13"/><g transform="rotate(-9 78 151)"><rect x="49" y="119" width="57" height="91" rx="25" fill="url(#ivory)"/><rect x="87" y="128" width="27" height="75" rx="12" fill="#B7B0A7"/></g><g transform="rotate(9 220 151)"><rect x="194" y="119" width="57" height="91" rx="25" fill="url(#ivory)"/><rect x="188" y="128" width="27" height="75" rx="12" fill="#B7B0A7"/></g>'
 elif kind in ['kettle','pot']:
  shape='<path d="M181 69h26q41 58-4 90l-12-11q33-27-2-61" fill="none" stroke="#BEB4AA" stroke-width="15"/><path d="M79 78h111l18 102q5 30-66 30-73 0-65-30z" fill="url(#ivory)"/><path d="m82 103-37-21 18 56 16 12" fill="url(#ivory)"/><ellipse cx="137" cy="78" rx="57" ry="11" fill="#D4CBC2"/><rect x="120" y="58" width="34" height="20" rx="7" fill="#8A7969"/><path d="M102 102v67" stroke="white" stroke-width="5" opacity=".6"/><ellipse cx="140" cy="211" rx="66" ry="8" fill="#8D837B"/>'
 elif kind in ['cream','skincare']:
  shape='<rect x="61" y="74" width="63" height="136" rx="14" fill="url(#pink)"/><rect x="67" y="42" width="52" height="41" rx="6" fill="#D3B5AE"/><rect x="169" y="118" width="81" height="88" rx="20" fill="url(#ivory)"/><ellipse cx="209" cy="120" rx="41" ry="13" fill="#EBDED3"/><ellipse cx="209" cy="112" rx="41" ry="12" fill="#D4BDB0"/><text x="93" y="149" text-anchor="middle" fill="#B2828A" font-size="9" letter-spacing="2">CARE</text><text x="209" y="166" text-anchor="middle" fill="#A39487" font-size="9" letter-spacing="2">DAILY</text>'
 elif kind in ['bag','tote']:
  shape='<path d="M108 90V60q0-40 42-40t42 40v30" fill="none" stroke="#BCAE98" stroke-width="11"/><path d="M80 83h140l10 122q-82 26-160 0z" fill="url(#ivory)"/><path d="M93 86 82 200m124-114 12 114" stroke="#D9CFBF"/><text x="150" y="148" font-family="sans-serif" fill="#AC9F90" font-size="10" letter-spacing="3" text-anchor="middle">YUANXIANG</text><path d="m131 164 20 9 20-9" fill="none" stroke="#BEB2A2" stroke-width="2"/>'
 else:
  shape='<rect x="78" y="47" width="146" height="164" rx="21" fill="url(#ivory)"/><circle cx="151" cy="121" r="43" fill="#E6DEDC"/><path d="M118 122h66m-33-33v66" stroke="#BEA8A9" stroke-width="6"/>'
 return f'<svg class="product-art" viewBox="0 0 300 250">{defs}{base}{shape}</svg>'
def tag(t,cls=''):return f'<span class="tag {cls}">{t}</span>'
def btn(t,cls='primary'):return f'<div class="button {cls}">{t}</div>'
def section(t,r=''):return f'<div class="section"><h3>{t}</h3><span>{r}{ic("arrow",13) if r else ""}</span></div>'
def row(icon,title,sub='',right=''):
 return f'<div class="list-row"><span class="row-icon">{ic(icon)}</span><div><b>{title}</b>{f"<small>{sub}</small>" if sub else ""}</div><span>{right}</span>{ic("arrow",15)}</div>'
def balance(n='2,680',label='我的金币'):return f'<div class="balance-strip"><span>{label}</span><b>{n}</b><span class="balance-more">金币明细 {ic("arrow",13)}</span></div>'
def redhero(title,sub='',art='coin',extra=''):
 a=coin_art() if art=='coin' else gift_art() if art=='gift' else ''
 return f'<div class="red-hero"><div class="hero-orbit"></div><div class="hero-copy"><span class="hero-kicker">元享 · 每天都有新收获</span><h1>{title}</h1><p>{sub}</p>{extra}</div><div class="hero-art">{a}</div></div>'
def notice(t):return f'<div class="notice">{ic("info",16)}<span>{t}</span></div>'
def card_product(kind,name,cost,badge=''):
 return f'<div class="goods-card"><div class="goods-picture">{product(kind)}{tag(badge) if badge else ""}</div><div class="goods-copy"><b>{name}</b><div><strong>{cost}</strong><small>金币</small><span>{ic("arrow",14)}</span></div></div></div>'
def info_line(k,v,cls=''):return f'<div class="info-line {cls}"><span>{k}</span><b>{v}</b></div>'
def status_mark(icon='yes',cls=''):return f'<div class="status-mark {cls}">{ic(icon,38)}</div>'
def qr():
 # Visual symbol ONLY; deliberately not a real QR/invite credential.
 out='<svg class="qr-demo" viewBox="0 0 25 25" aria-label="二维码位置示意">'
 for x,y in [(1,1),(17,1),(1,17)]:out+=f'<rect x="{x}" y="{y}" width="7" height="7" rx="1" fill="#372432"/><rect x="{x+1}" y="{y+1}" width="5" height="5" fill="white"/><rect x="{x+2}" y="{y+2}" width="3" height="3" fill="#372432"/>'
 for y in range(2,24):
  for x in range(2,24):
   if (x<9 and y<9) or (x>15 and y<9) or (x<9 and y>15):continue
   if (x*11+y*7+x*y)%5<2:out+=f'<rect x="{x}" y="{y}" width=".85" height=".85" fill="#372432"/>'
 return out+'</svg>'
def screen(id,name,body,tab=None,back=True,footer=None,classes=''):
 tabs=[('home','首页'),('coin','赚金币'),('gift','好礼'),('bag','试用'),('user','我的')]
 nav='<nav class="tabbar">'+''.join(f'<div class="tab {"active" if tab==label else ""}"><span>{ic(icon,23)}</span><small>{label}</small></div>' for icon,label in tabs)+'<i class="home-indicator"></i></nav>' if tab else ''
 foot=f'<div class="fixed-footer">{footer}<i class="home-indicator"></i></div>' if footer else ''
 top=f'<div class="os-bar"><b>9:41</b><span>▮▮▮　⌁　▰</span></div><header class="native"><span class="native-back">{ic("back",22) if back else ""}</span><b>{name}</b><span class="capsule">•••<i></i>◉</span></header>'
 return {'id':id,'name':name,'html':f'<div class="phone {classes} {"has-tabs" if tab else ""} {"has-footer" if footer else ""}">{top}<main class="screen-content">{body}</main>{nav}{foot}{"<i class=home-indicator></i>" if not tab and not footer else ""}</div>'}
