from pathlib import Path
import json,html
import core,commerce,trial,social
R=Path(__file__).parent
SCREENS=sorted(core.build()+commerce.build()+trial.build()+social.build(),key=lambda x:x['id'])
assert [s['id'] for s in SCREENS]==list(range(1,49))
for d in ['pages','boards','images','board-images']: (R/d).mkdir(exist_ok=True)
css='\n'.join((R/p).read_text() for p in ['style.css','core.css','commerce.css','trial.css','social.css'])
css+='''
/* Design presentation only. Phone layout itself is defined independently above. */
.gallery{background:radial-gradient(ellipse at 80% 0,#FFD4CF,transparent 45%),linear-gradient(145deg,#FFF6F3,#FBEAF0);padding:36px 42px;color:#4B122C;min-width:1782px}.gallery-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;border-bottom:1px solid #CF0C3528;padding-bottom:25px;margin-bottom:27px}.gallery-wordmark{display:flex;gap:16px;align-items:center}.brand-box{height:62px;width:62px;background:linear-gradient(135deg,#F22B31,#C6083D);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:27px;font-weight:800;color:white;box-shadow:0 9px 23px #C70F3820}.gallery-head h1{font-size:31px;line-height:1.4;color:#B20D35;letter-spacing:-.5px}.gallery-head p{font-size:12px;line-height:1.8;color:#9B6C7C;margin-top:5px}.gallery-meta{font-size:11px;line-height:1.9;text-align:right;color:#9B6A7C;max-width:310px}.gallery-meta b{color:#C51743;font-weight:600}.gallery-nav{display:flex;gap:9px;flex-wrap:wrap;max-width:1700px;margin-bottom:25px}.gallery-nav a{font-size:12px;color:#BE1A47;border:1px solid #EABEC9;background:#FFF8F8;text-decoration:none;padding:8px 12px;border-radius:19px}.screen-grid{display:grid;grid-template-columns:repeat(4,390px);gap:30px 35px}.screen-item{width:390px}.screen-caption{display:flex;align-items:center;gap:10px;font-size:15px;line-height:1.4;font-weight:650;margin-bottom:13px;color:#813951}.screen-caption>b{font:500 12px Arial;color:#D72A4E}.screen-description{font-size:11px;line-height:1.8;color:#AA7487;margin-top:14px;min-height:21px}.board-footer{display:flex;align-items:center;justify-content:space-between;gap:25px;border-top:1px solid #D31A3F24;padding-top:18px;margin-top:25px;font-size:11px;line-height:1.8;color:#9B7183}.board-footer>div:last-child{font:500 11px Arial;white-space:nowrap;color:#BA1845}.screen-group-block{padding-bottom:38px;margin-bottom:26px;border-bottom:1px solid #EDC4D0}.group-title{font-size:21px;color:#AD153F;margin:15px 0 20px}.standalone{margin:0;background:#FFF6F5;width:390px;height:844px}.standalone .phone{border-radius:0;box-shadow:none}.pdf-sheet{width:438px;height:930px;padding:18px 24px;background:#FFF2F1;break-after:page}.pdf-sheet:last-child{break-after:auto}.pdf-sheet .screen-caption{margin-bottom:12px;font-size:15px}.pdf-sheet .phone{border-radius:24px;box-shadow:0 0 0 1px #F4D3DB}.pdf-footer{font-size:9px;line-height:1.6;margin-top:11px;color:#926272;white-space:nowrap} @media print{@page{size:438px 930px;margin:0}body{background:white}.screen-content{scrollbar-width:none}.pdf-sheet{page-break-after:always}.pdf-sheet:last-child{page-break-after:auto}}
'''
(R/'design.css').write_text(css)
def defs():
 return '<svg class="svg-defs" aria-hidden="true"><defs><g id="product-photo-sheet"><image href="assets/products.png" width="1536" height="1024"/></g><g id="brand-hero"><image href="assets/hero.png" width="1280" height="1280"/></g></defs></svg>'
def doc(body,title='元享 · 红耀新生',base='./',cls=''):
 return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="'+base+'"><title>'+html.escape(title)+'</title><link rel="stylesheet" href="design.css"></head><body class="'+cls+'">'+defs()+body+'</body></html>'
GROUPS=['五项业务主入口','签到与每日习惯','广告领奖完整流程','金币账户与明细','商品兑换完整流程','订单与物流信息','试用申请完整流程','试用结果与资料提交','邀请好友与专属海报','我的账户与帮助','收货地址完整流程','冷却缺货与异常恢复']
DESCS=['每日签到、广告领奖、兑换、试用与邀请都可发现','每一次签到，都有明确奖励与记录','自愿观看、完整观看、服务端确认后到账','金币来源与使用清楚，收入支出不混淆','扣除前确认，成功后可追查，余额不足可恢复','从提交到发货，订单信息各有归属','免费申请，条件清楚，提交不等于中选','等待、中选、未中选及收件资料各有下一步','邀请不写虚假即时奖励，专属分享更清楚','服务于五项业务，不再增加旁支功能','填写、选择、修改、空状态形成完整链路','不只画理想页面，异常时也让用户知道怎么做']
def head(i):
 return f'<header class="gallery-head"><div class="gallery-wordmark"><div class="brand-box">元享</div><div><h1>元享 · 红耀新生</h1><p>{i+1:02d} / {GROUPS[i]}　　{DESCS[i]}</p></div></div><div class="gallery-meta"><b>从空白画布重构 · 红金炫丽视觉</b><br>390×844 逻辑像素 · 图稿 {i*4+1:02d}—{i*4+4:02d}<br>概念设计：金额、商品、用户与活动均为示例</div></header>'
def card(s):return f'<div class="screen-item"><div class="screen-caption"><b>{s["id"]:02d}</b>{s["name"]}</div>{s["html"]}<div class="screen-description">{s.get("description", "独立页面与状态图稿 · 可在单页HTML中向下滚动")}</div></div>'
footer='<footer class="board-footer"><div>本轮仅设计，未修改应用代码。广告控件与分享菜单由微信提供，图中仅表达所需上下文。<br>推广不承诺即时收益；试用申请不等于中选；正式奖励与商品规则以实际配置为准。</div><div>#FF352D / #CD1035 / #FFE093</div></footer>'
for i in range(12):
 body=head(i)+'<div class="screen-grid">'+''.join(card(s) for s in SCREENS[i*4:i*4+4])+'</div>'+footer
 (R/'boards'/f'{i+1:02d}.html').write_text(doc(body,base='../',cls='gallery'))
nav='<div class="gallery-nav">'+''.join(f'<a href="#group{i+1}">{i+1:02d} {t}</a>' for i,t in enumerate(GROUPS))+'</div>'
body='<header class="gallery-head"><div class="gallery-wordmark"><div class="brand-box">元享</div><div><h1>红耀新生 · 48 界面完整设计</h1><p>只围绕：签到赚金币 / 看广告赚金币 / 金币兑换商品 / 商品试用 / 推广好友</p></div></div><div class="gallery-meta"><b>全新布局与美术 · 纯设计交付</b><br>每组4张，可滚动查看每个手机界面<br>所有金额、用户、商品及活动均为设计示例</div></header>'+nav
for i,t in enumerate(GROUPS):body+=f'<section id="group{i+1}" class="screen-group-block"><h2 class="group-title">{i+1:02d} / {t}</h2><div class="screen-grid">'+''.join(card(s) for s in SCREENS[i*4:i*4+4])+'</div></section>'
(R/'index.html').write_text(doc(body,cls='gallery'))
for s in SCREENS:
 (R/'pages'/f'{s["id"]:02d}.html').write_text(doc(s['html'],title=f'{s["id"]:02d} {s["name"]}',base='../',cls='standalone'))
pdf=''.join(f'<section class="pdf-sheet"><div class="screen-caption"><b>{s["id"]:02d} / 48</b>{s["name"]}</div>{s["html"]}<div class="pdf-footer">元享 · 红耀新生 / 概念设计，图中数据与商品均为示例 / 尚未开发</div></section>' for s in SCREENS)
(R/'print.html').write_text(doc(pdf))
(R/'screens.json').write_text(json.dumps([{'id':s['id'],'name':s['name'],'group':GROUPS[(s['id']-1)//4],'html':f'pages/{s["id"]:02d}.html','image':f'images/{s["id"]:02d}.png'} for s in SCREENS],ensure_ascii=False,indent=2)+'\n')
print('48 independent drawings,12 boards and index created')
