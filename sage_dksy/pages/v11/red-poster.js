'use strict';
// Page-owned Red Nova artwork renderer. The invitation QR must be a verified WeChat local image.
const THEMES=[
 {id:0,name:'元享红',start:'#D80C3E',middle:'#F82C4E',end:'#D70B3E',accent:'#FFECC2'},
 {id:1,name:'心动粉',start:'#E22B59',middle:'#FB738A',end:'#C50E47',accent:'#FFF0D3'},
 {id:2,name:'暖金红',start:'#C32C30',middle:'#ED7544',end:'#CE2341',accent:'#FFF1BA'},
 {id:3,name:'玫瑰红',start:'#A50A4A',middle:'#D84776',end:'#AB124E',accent:'#FFE7C6'}
];
function validLocal(path){let dir='';try{dir=wx.env&&wx.env.USER_DATA_PATH||'';}catch(_){}return typeof path==='string'&&!!path&&((dir&&path.indexOf(dir.replace(/\/+$/,'')+'/')===0)||/^(?:wxfile:\/\/|file:\/\/|ttfile:\/\/|https?:\/\/tmp\/|\/(?!\/))/i.test(path)||/^[a-z]:[\\/]/i.test(path));}
const BRAND_IMAGE='/sage_dksy/resource/red/hero.png';
const BRAND_LOGO='/sage_dksy/resource/brand/logo.png';
// getImageInfo may strip the package-root slash. Legacy canvas resolves that
// returned string relative to the current page, so restore it for this asset.
function brandCanvasPath(path,source){if(typeof path!=='string'||!path)return '';if(path.replace(/^\.\//,'')===source.slice(1))return source;return validLocal(path)?path:'';}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function render(page,qrPath,themeId,person,success,failure,progress){
 const theme=THEMES.find(item=>item.id===Number(themeId));
 if(!theme||!validLocal(qrPath)){failure('专属小程序码尚未准备好，请重新获取');return;}
 let finished=false,drawingStarted=false,exportStarted=false;const assets={hero:null,logo:null};const timeout=setTimeout(()=>fail('海报生成超时，请重试'),25000);
 const active=()=>!finished&&page._alive!==false;
 function fail(message){if(finished)return;finished=true;clearTimeout(timeout);if(page._alive!==false)failure(message);}
 function phase(message){if(active()&&typeof progress==='function')try{progress(message);}catch(_){/* Display progress cannot interrupt export. */}}
 phase('正在准备品牌素材');
 function loadAsset(key,source,message){
  if(!active())return;let handled=false;
  try{wx.getImageInfo({src:source,success(info){
   if(!active()||handled)return;handled=true;
   const path=brandCanvasPath(info&&info.path,source);
   if(!info||!path||!Number.isFinite(info.width)||!Number.isFinite(info.height)||info.width<=0||info.height<=0){fail(message);return;}
   assets[key]={path,width:info.width,height:info.height};
   if(assets.hero&&assets.logo)drawPoster(assets.hero,assets.logo);
  },fail(){if(handled)return;handled=true;fail(message);}});}catch(_){fail(message);}
 }
 function drawPoster(info,logo){
  if(!active()||drawingStarted)return;drawingStarted=true;
  phase('正在绘制真实专属海报');
  try{
   const ctx=wx.createCanvasContext('v11ShareCanvas',page),W=540,H=678;
   const background=ctx.createLinearGradient(0,0,W,H);background.addColorStop(0,theme.start);background.addColorStop(.54,theme.middle);background.addColorStop(1,theme.end);ctx.setFillStyle(background);ctx.fillRect(0,0,W,H);
   ctx.setStrokeStyle('rgba(255,220,178,.35)');ctx.setLineWidth(1.5);ctx.beginPath();ctx.arc(317,391,235,0,Math.PI*2);ctx.stroke();
   [268,300].forEach((r,i)=>{ctx.setStrokeStyle(i?'rgba(255,225,190,.055)':'rgba(255,225,190,.09)');ctx.setLineWidth(30);ctx.beginPath();ctx.arc(317,391,r,0,Math.PI*2);ctx.stroke();});
   ctx.setFillStyle('rgba(255,235,173,.09)');ctx.beginPath();ctx.moveTo(0,427);ctx.lineTo(480,205);ctx.lineTo(540,247);ctx.lineTo(0,493);ctx.closePath();ctx.fill();
   ctx.setFillStyle('#FFFDF7');rounded(ctx,26,21,66,66,16);ctx.fill();const logoScale=Math.min(58/logo.width,58/logo.height),logoWidth=logo.width*logoScale,logoHeight=logo.height*logoScale;ctx.drawImage(logo.path,30+(58-logoWidth)/2,25+(58-logoHeight)/2,logoWidth,logoHeight);ctx.setFillStyle('#FFFFFF');ctx.setFontSize(29);ctx.fillText('元享',105,62);ctx.setFontSize(13);ctx.setFillStyle('#FFE2DF');ctx.fillText('每天一点金币，每天一点惊喜',282,57);
   ctx.setFillStyle(theme.accent);ctx.setFontSize(53);ctx.fillText('好礼，',29,165);ctx.fillText('就要一起享。',29,227);ctx.setFillStyle('#FFE5E5');ctx.setFontSize(19);ctx.fillText('签到赚金币 · 好物随心换',30,277);
   const box={x:255,y:264,w:295,h:260},ratio=Math.min(box.w/info.width,box.h/info.height),iw=info.width*ratio,ih=info.height*ratio;ctx.drawImage(info.path,box.x+(box.w-iw)/2,box.y+(box.h-ih)/2,iw,ih);
   ctx.setFillStyle('#FFF7E9');ctx.fillRect(0,506,W,H-506);ctx.setStrokeStyle('#E8C3B6');ctx.setLineWidth(1);ctx.beginPath();ctx.moveTo(0,506);ctx.lineTo(W,506);ctx.stroke();
   ctx.setFillStyle('#F9D9CD');ctx.beginPath();ctx.arc(52,591,29,0,Math.PI*2);ctx.fill();ctx.setStrokeStyle('#F0B8AC');ctx.setLineWidth(1);ctx.stroke();ctx.setStrokeStyle('#BB1B45');ctx.setLineWidth(2.4);ctx.beginPath();ctx.arc(52,580,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(52,606,16,Math.PI,0);ctx.stroke();
   const nickname=String(person&&person.nickname||'').trim().slice(0,9);ctx.setFillStyle('#9B254B');ctx.setFontSize(19);ctx.fillText(nickname?'好友'+nickname+'邀请你':'元享好友邀请你',96,586);ctx.setFontSize(16);ctx.setFillStyle('#A36D78');ctx.fillText('长按识别，开启元享',96,615);
   ctx.setFillStyle('#FFFFFF');rounded(ctx,392,531,126,126,8);ctx.fill();ctx.setStrokeStyle('#EFCFC0');ctx.setLineWidth(1);ctx.stroke();ctx.drawImage(qrPath,399,538,112,112);
   ctx.draw(false,()=>{if(!active()||exportStarted)return;exportStarted=true;phase('正在导出高清海报');try{wx.canvasToTempFilePath({canvasId:'v11ShareCanvas',width:W,height:H,destWidth:W*2,destHeight:H*2,fileType:'jpg',quality:.94,success(result){if(!active())return;if(!result||!validLocal(result.tempFilePath)){fail('海报导出未成功，请重试');return;}finished=true;clearTimeout(timeout);success(result.tempFilePath);},fail(){fail('海报导出未成功，请重试');}},page);}catch(_){fail('海报导出未成功，请重试');}});
  }catch(_){fail('当前微信环境暂时无法生成海报，请重试');}
 }
 loadAsset('hero',BRAND_IMAGE,'品牌插画暂时无法读取，请重试');
 loadAsset('logo',BRAND_LOGO,'元享LOGO暂时无法读取，请重试');
}
module.exports={THEMES,render,validLocal};
