// 元享 V11 公开分享图：只使用已获得的真实小程序码；不输出没有二维码的海报。
function render(page,card,qrUrl,onSuccess,onFailure){
 var start=Date.now();if(!qrUrl)return onFailure('真实小程序码未就绪');
 var pending=1,background='',qr='';
 function fail(){onFailure('图片下载失败，请重试');}
 function finish(){if(--pending!==0)return;try{
  var ctx=wx.createCanvasContext('v11ShareCanvas',page),bg=card.bg_color||'#8B2337',fg=card.text_color||'#FFF4DE';
  ctx.setFillStyle(bg);ctx.fillRect(0,0,540,720);if(background)ctx.drawImage(background,0,0,540,720);
  ctx.setStrokeStyle(fg);ctx.setLineWidth(1.5);ctx.strokeRect(20,20,500,680);ctx.strokeRect(27,27,486,666);
  ctx.setFillStyle(fg);ctx.setTextAlign('center');ctx.setFontSize(25);ctx.fillText('元享 · 心意问候',270,100);
  var greeting=String(card.greeting||'欢迎您使用元享'),arr=[],line='';ctx.setFontSize(25);
  for(var k=0;k<greeting.length;k++){var ch=greeting[k];if(ch==='\n'){arr.push(line);line='';continue;}if(ctx.measureText(line+ch).width>420&&line){arr.push(line);line=ch;}else line+=ch;}if(line)arr.push(line);
  if(arr.length>12)return onFailure('祝福文字过长，请制作同款时缩短');
  for(var i=0;i<arr.length;i++)ctx.fillText(arr[i],270,240+i*35);
  var signature=String(card.signature||'元享好友');ctx.setFontSize(19);while(ctx.measureText(signature).width>250&&signature.length)signature=signature.slice(0,-1);
  ctx.fillText('— '+signature+' —',195,580);
  if(card.dateText) {ctx.setFontSize(15);ctx.fillText(card.dateText,190,620);}
  ctx.setFillStyle('#FFFFFF');ctx.fillRect(360,536,135,135);ctx.drawImage(qr,366,542,123,123);
  ctx.setFillStyle(fg);ctx.setFontSize(16);ctx.fillText('扫码制作同款',425,690);
  ctx.draw(false,function(){wx.canvasToTempFilePath({canvasId:'v11ShareCanvas',destWidth:1080,destHeight:1440,success:function(result){if(result.tempFilePath){console.info('[V11 专属海报耗时]',Date.now()-start);onSuccess(result.tempFilePath);}else onFailure('海报导出失败');},fail:function(){onFailure('海报导出失败');}},page);});
 }catch(e){onFailure('画布生成失败');}}
 wx.getImageInfo({src:qrUrl,success:function(r){qr=r.path||r.tempFilePath;finish();},fail:fail});
 var backgroundUrl=card.background_path||card.background_url||'';
 if(backgroundUrl){pending++;wx.getImageInfo({src:backgroundUrl,success:function(r){background=r.path;finish();},fail:fail});}
}
module.exports={render:render};
