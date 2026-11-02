/**
 * 元享 V11.7.3 远端高清海报 + 本地真实小程序码，兼容 http://tmp 临时文件。
 * 保护：不生成假码；底图不存在则拒绝导出；不修改邀请码、登录或服务端关系。
 */
var siteinfo = require('../../siteinfo.js');
var siteroot = String((siteinfo && siteinfo.siteroot) || '');
var matchSite = /^https:\/\/([^/]+)\/app\/index\.php(?:\?.*)?$/.exec(siteroot);
var assetBase = matchSite ? ('https://' + matchSite[1] + '/app/v11-posters-v117/') : '';
var THEMES = [
  {id:1, name:'每日礼遇', tag:'签到从今天开始', src:assetBase+'poster_01.jpg', qr:{x:760,y:1080,w:186}, qrLeft:'70.3704', qrTop:'75.0000', qrWPct:'17.2222', qrHPct:'12.9167'},
  {id:2, name:'金币慢慢攒', tag:'每份坚持都有惊喜', src:assetBase+'poster_02.jpg', qr:{x:481,y:1140,w:174}, qrLeft:'44.5370', qrTop:'79.1667', qrWPct:'16.1111', qrHPct:'12.0833'},
  {id:3, name:'每日兑好礼', tag:'从签到到精选兑换', src:assetBase+'poster_03.jpg', qr:{x:138,y:1131,w:201}, qrLeft:'12.7778', qrTop:'78.5417', qrWPct:'18.6111', qrHPct:'13.9583'},
  {id:4, name:'轻松上手', tag:'元享初体验', src:assetBase+'poster_04.jpg', qr:{x:114,y:1109,w:215}, qrLeft:'10.5556', qrTop:'77.0139', qrWPct:'19.9074', qrHPct:'14.9306'},
  {id:5, name:'好礼兑换', tag:'把期待带回家', src:assetBase+'poster_05.jpg', qr:{x:110,y:1107,w:219}, qrLeft:'10.1852', qrTop:'76.8750', qrWPct:'20.2778', qrHPct:'15.2083'},
  {id:6, name:'每日小确幸', tag:'收获一份好心情', src:assetBase+'poster_06.jpg', qr:{x:757,y:1073,w:182}, qrLeft:'70.0926', qrTop:'74.5139', qrWPct:'16.8519', qrHPct:'12.6389'}
];
var cache = {};
var pending = {};
function clock(){return Date.now();}
// V13.1.5：与推广页共用微信沙盒路径识别原则；开发者工具的 http://usr 不是网络 URL。
function validLocal(path){
  if (typeof path !== 'string' || !path) return false;
  var userDir = '';
  try { userDir = wx && wx.env && typeof wx.env.USER_DATA_PATH === 'string'
    ? wx.env.USER_DATA_PATH.replace(/\/+$/, '') : ''; } catch (e) {}
  if (userDir && path.indexOf(userDir + '/') === 0) return true;
  return /^(?:wxfile:\/\/|file:\/\/|ttfile:\/\/|https?:\/\/tmp(?:\/|$)|\/(?!\/))/i.test(path)
    || /^[a-zA-Z]:[\\/]/.test(path);
}
function readPoster(theme, done){
  var id=theme.id, cached=cache[id];
  if(cached && validLocal(cached.path)){done(null,cached.path,'memory');return;}
  if(pending[id]){pending[id].push(done);return;}
  pending[id]=[done];
  var started=clock(), settled=false, errors=[];
  var src=theme.src;
  var timeout=setTimeout(function(){finish(new Error('海报下载超时'));},20000);
  function finish(err,path,from){
    if(settled)return;
    settled=true;clearTimeout(timeout);
    if(!err && validLocal(path))cache[id]={path:path};
    var listeners=pending[id]||[];delete pending[id];
    console.info('[元享 V11.7 远端底图]',JSON.stringify({id:id,ok:!err,ms:clock()-started,from:from||'',errors:errors}));
    listeners.forEach(function(cb){try{cb(err,path,from);}catch(e){console.error('[元享海报素材回调]',e);}});
  }
  function inspect(local,source){
    if(settled)return;
    try{wx.getImageInfo({src:local,success:function(info){
      if(settled)return;
      var path=info && (info.path||info.tempFilePath);
      if(!validLocal(path) && validLocal(local))path=local;
      if(info && info.width===1080 && info.height===1440 && validLocal(path))finish(null,path,source);
      else finish(new Error('高清素材尺寸不正确（应为1080×1440）'));
    },fail:function(e){errors.push('解码失败:'+String(e&&e.errMsg||'unknown').slice(0,100));finish(new Error('海报图片读取失败'));}});}
    catch(e){finish(new Error('本地图片验证异常'));}
  }
  if(!/^https:\/\//i.test(src))return finish(new Error('海报地址未配置HTTPS，请核查siteinfo.js'));
  try{wx.downloadFile({url:src,success:function(r){
    if(settled)return;
    if(r && r.statusCode===200 && validLocal(r.tempFilePath))inspect(r.tempFilePath,'downloadFile');
    else finish(new Error('海报下载失败：HTTP '+String(r&&r.statusCode)));
  },fail:function(e){errors.push(String(e&&e.errMsg||'download fail').slice(0,160));
    // 备用 getImageInfo 仍使用同一真实远端图，不允许用假的本地素材。
    try{wx.getImageInfo({src:src,success:function(info){
      if(settled)return;
      var path=info&&(info.path||info.tempFilePath);
      if(!validLocal(path) && validLocal(src))path=src;
      if(info && info.width===1080 && info.height===1440 && validLocal(path))finish(null,path,'getImageInfo');
      else finish(new Error('备用读取返回了无效文件'));
    },fail:function(e2){errors.push(String(e2&&e2.errMsg||'fallback fail').slice(0,160));finish(new Error('请检查图片网络及downloadFile合法域名'));}});}
    catch(e2){finish(new Error('海报备用下载失败'));}
  }});}catch(e){finish(new Error('当前微信环境无法下载海报'));}
}
function invalidateTheme(id){delete cache[Number(id)];}
function preload(themeId, success, fail){
  var t=THEMES.filter(function(x){return x.id===Number(themeId);})[0];
  if(!t){if(fail)fail('款式不存在');return;}
  readPoster(t,function(err){if(err){if(fail)fail('第'+t.id+'款海报加载失败');}else{if(success)success();}});
}
function render(page, qrLocalPath, themeId, success, failure, progress){
  var begin=clock(), ended=false, step='底图准备';
  var theme=THEMES.filter(function(x){return x.id===Number(themeId);})[0];
  if(!theme){failure('请选择海报款式');return;}
  if(!validLocal(qrLocalPath)){
    console.warn('[元享 V11.7.3 专属码路径不可用]',JSON.stringify({type:typeof qrLocalPath,hasValue:!!qrLocalPath}));
    failure('真实专属码本地路径无效，请重新获取');return;
  }
  var watchdog=setTimeout(function(){failed('高清海报导出超时，请重试');},27000);
  function phase(p){step=p;if(typeof progress==='function')progress(p);}
  function failed(message){if(ended)return;ended=true;clearTimeout(watchdog);
    console.error('[元享 V11.6.2 海报失败]',JSON.stringify({id:theme.id,step:step,ms:clock()-begin,message:message}));failure(message);
  }
  function finished(path){if(ended)return;if(!path)return failed('导出文件不存在');ended=true;clearTimeout(watchdog);
    console.info('[元享 V11.7 海报完成]',JSON.stringify({id:theme.id,ms:clock()-begin}));success(path);
  }
  phase('正在读取海报底图…');
  readPoster(theme,function(err,path){
    if(ended)return;
    if(err || !path){return failed('第'+theme.id+'款海报下载失败，请检查网络与图片域名');}
    phase('正在绘制专属小程序码…');
    try{
      var c=wx.createCanvasContext('v11ShareCanvas',page),q=theme.qr;
      // 必须绘制已由 getImageInfo 验证的真实本地 JPG，拒绝空白底图导出。
      c.drawImage(path,0,0,540,720);
      c.setFillStyle('#FFFFFF');c.fillRect(q.x/2,q.y/2,q.w/2,q.w/2);
      c.drawImage(qrLocalPath,q.x/2,q.y/2,q.w/2,q.w/2);
      c.draw(false,function(){
        if(ended)return;
        phase('正在导出高清图片…');
        try{
          wx.canvasToTempFilePath({canvasId:'v11ShareCanvas',width:540,height:720,destWidth:1080,destHeight:1440,
            fileType:'jpg',quality:0.93,
            success:function(r){finished(r&&r.tempFilePath);},
            fail:function(e){console.error('[元享 V11.6.2 Canvas 导出错误]',e);failed('海报导出失败，请重试');}
          },page);
        }catch(e){failed('图片导出异常，请重试');}
      });
    }catch(e){console.error('[元享 V11.6.2 Canvas 绘制异常]',e);failed('海报绘制失败，请重试');}
  });
}
module.exports={THEMES:THEMES,render:render,preload:preload,invalidateTheme:invalidateTheme};
