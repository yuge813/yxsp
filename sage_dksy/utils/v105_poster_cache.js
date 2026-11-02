// 元享 V10.5 · 极速海报素材预热（仅前端）
// 不生成二维码：始终调用已有 v10qrcode 接口，并只缓存其返回的真实图片。
var v10 = require('./v10.js');
var PREFIX = 'yx_v105_assets_v1';
var SINGLE_MS = 28000;
var PHOTO_TTL = 30 * 60 * 1000;
var QR_TTL = 10 * 60 * 1000;
var MAX_DISK = 12;
var inMemory = {};
var pending = {};
var serial = 0;

function now() { return Date.now(); }
function logError(e) { return String(e && (e.errMsg || e.message) || '失败').slice(0, 100); }
function hash(s) {
  var a=2166136261,b=5381;
  s=String(s);
  for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);a=Math.imul(a^c,16777619)>>>0;b=((b*33)^c)>>>0;}
  return (a>>>0).toString(36)+'_'+(b>>>0).toString(36);
}
function server() {
  try { var s=getApp().siteInfo.siteroot || '', m=String(s).match(/^https:\/\/[^/]+/i);return m?m[0]:''; } catch(e){return '';}
}
function normalize(raw) {
  if(raw && typeof raw==='object')raw=raw.url||raw.src||raw.image||raw.picurl||raw.path||'';
  var s=String(raw||'').trim().replace(/&amp;/g,'&');
  if(!s)return '';
  if(/^(wxfile:|file:|http:\/\/tmp\/)/i.test(s)||/^\/sage_dksy\//.test(s))return s;
  if(/^\/\//.test(s))return 'https:'+s;
  if(/^https?:\/\//i.test(s))return /^http:\/\//i.test(s)?'https://'+s.slice(7):s;
  var base=server();if(!base)return '';
  s=s.replace(/^\/+/, '');
  if(/^images\//i.test(s))s='attachment/'+s;
  return /^attachment\//i.test(s)?base+'/'+s:'';
}
function env() {
  try {var a=wx.getAccountInfoSync(),v=a&&a.miniProgram&&a.miniProgram.envVersion;return /^(develop|trial|release)$/.test(v)?v:'release';}catch(e){return 'release';}
}
function appID() {
  try {return String(wx.getAccountInfoSync().miniProgram.appId||'');}catch(e){return '';}
}
function userScope() {
  try {var id=wx.getStorageSync('openid');return typeof id==='string' && id.length>0 ? id : ''; }catch(e){return '';}
}
function localBase() { return wx.env&&wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : ''; }
function diskRead() {
  try {var o=wx.getStorageSync(PREFIX);return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return {};}
}
function diskWrite(index) {try{wx.setStorageSync(PREFIX,index);}catch(e){}}
function hasFile(path) {
  if(!path || !localBase() || path.indexOf(localBase()+'/yxv105_')!==0) return false;
  try {var fs=wx.getFileSystemManager();if(fs&&typeof fs.accessSync==='function'){fs.accessSync(path);return true;}}catch(e){return false;}
  return false;
}
function getCached(key,ttl) {
  var k=hash(key), p=inMemory[k];
  if(p&&p.at&&now()-p.at<ttl&&hasFile(p.path))return {path:p.path,width:p.width,height:p.height,cached:true};
  var disk=diskRead(),r=disk[k];
  if(r&&r.at&&now()-r.at<ttl&&hasFile(r.path)&&r.width>0&&r.height>0){
    inMemory[k]=r;
    return {path:r.path,width:r.width,height:r.height,cached:true};
  }
  return null;
}
function cleanupIndex(index) {
  var keys=Object.keys(index).sort(function(a,b){return ((index[a]&&index[a].at)||0)-((index[b]&&index[b].at)||0);});
  // 仅清理本模块创建的文件；至少保留近期文件，避免仍在画布中使用的图片被删除。
  while(keys.length>MAX_DISK){
    var k=keys.shift(), r=index[k];
    if(r&&now()-r.at<2*60*1000)break;
    delete index[k];delete inMemory[k];
    if(r&&hasFile(r.path)){
      try{wx.getFileSystemManager().unlink({filePath:r.path,fail:function(){}});}catch(e){}
    }
  }
  Object.keys(index).forEach(function(k){
    var r=index[k];
    if(!r || !r.at || now()-r.at>48*60*60*1000 || !hasFile(r.path)){
      if(r && hasFile(r.path)){try{wx.getFileSystemManager().unlink({filePath:r.path,fail:function(){}});}catch(e){}}
      delete index[k];delete inMemory[k];
    }
  });
}
function persist(key,asset) {
  // 不移动临时文件。异步复制，绘制先使用已校验的原路径。
  var base=localBase();
  if(!base||!asset||!asset.path || asset.cached)return;
  var fs;
  try{fs=wx.getFileSystemManager();}catch(e){return;}
  if(!fs||typeof fs.copyFile!=='function')return;
  var suffix=/^(png|webp)$/i.test(asset.type||'')?'.'+asset.type.toLowerCase():'.jpg';
  var k=hash(key),dst=base+'/yxv105_'+k+suffix;
  if(dst===asset.path)return;
  try {fs.copyFile({srcPath:asset.path,destPath:dst,success:function(){
    var record={path:dst,width:asset.width,height:asset.height,at:now()};
    // 仅延后清理本模块的二进制临时文件；绝不触及业务附件。
    if(asset.path.indexOf(base+'/v10_real_')===0){
      setTimeout(function(){try{fs.unlink({filePath:asset.path,fail:function(){}});}catch(e){}},70000);
    }
    var index=diskRead();index[k]=record;inMemory[k]=record;
    cleanupIndex(index);diskWrite(index);
  },fail:function(){}});}catch(e){}
}
function sameOriginCandidate(src) {
  var base=server(),match=String(src).match(/^https:\/\/[^/]+(\/.*)$/i);
  if(!base||!match)return '';
  if(src.indexOf(base+'/')===0)return src;
  return /^\/attachment\/images\//i.test(match[1])?base+match[1]:'';
}
function signature(data) {
  if(!data||!data.byteLength||data.byteLength>6*1024*1024||data.byteLength<24)return '';
  var a=new Uint8Array(data);
  if(a[0]===255&&a[1]===216&&a[2]===255)return 'jpeg';
  if(a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71&&a[4]===13&&a[5]===10&&a[6]===26&&a[7]===10)return 'png';
  if(a[0]===82&&a[1]===73&&a[2]===70&&a[3]===70&&a[8]===87&&a[9]===69&&a[10]===66&&a[11]===80)return 'webp';
  return '';
}
function loadNetwork(src,done) {
  var remote=/^https:\/\//i.test(src), fallback=remote?sameOriginCandidate(src):'';
  var completed=false,errors=[], states={info:'wait',download:remote?'wait':'fail',binary:fallback?'wait':'fail'};
  var timer=null, dlTimer=null,binTimer=null;
  var tasks=[];
  function finish(asset,error){
    if(completed)return;completed=true;
    clearTimeout(timer);clearTimeout(dlTimer);clearTimeout(binTimer);
    tasks.forEach(function(t){try{t&&t.abort&&t.abort();}catch(e){}});
    if(!asset)console.warn('[V10.5 图片失败]',error||errors.join(';'));
    done(asset||null,error||errors.join(';'));
  }
  function maybeFail(){if(states.info==='fail'&&states.download==='fail'&&states.binary==='fail')finish(null,errors.join(';'));}
  function inspect(path,source,onFail,type){
    if(completed)return;
    try{wx.getImageInfo({src:path,success:function(r){
      if(completed)return;
      if(r&&r.path&&Number(r.width)>0&&Number(r.height)>0){
        finish({path:r.path,width:r.width,height:r.height,type:type||r.type||'jpeg'},'');
      } else {errors.push(source+':无效尺寸');onFail();}
    },fail:function(e){if(completed)return;errors.push(source+':'+logError(e));onFail();}});}catch(e){errors.push(source+':'+logError(e));onFail();}
  }
  function startDownload(){
    if(completed||states.download!=='wait')return;
    states.download='pending';
    if(typeof wx.downloadFile!=='function'){states.download='fail';maybeFail();return;}
    try{tasks.push(wx.downloadFile({url:src,timeout:19000,success:function(r){
      if(completed)return;
      if(r&&r.statusCode===200&&r.tempFilePath)inspect(r.tempFilePath,'download',function(){states.download='fail';maybeFail();});
      else{states.download='fail';errors.push('download HTTP '+(r&&r.statusCode));maybeFail();}
    },fail:function(e){if(completed)return;states.download='fail';errors.push('download:'+logError(e));maybeFail();}}));}
    catch(e){states.download='fail';errors.push('download:'+logError(e));maybeFail();}
  }
  function startBinary(){
    if(completed||states.binary!=='wait')return;
    states.binary='pending';
    if(typeof wx.request!=='function'||!localBase()){states.binary='fail';maybeFail();return;}
    try{tasks.push(wx.request({url:fallback,responseType:'arraybuffer',method:'GET',timeout:15000,success:function(r){
      if(completed)return;
      if(!r||r.statusCode!==200){states.binary='fail';errors.push('binary HTTP '+(r&&r.statusCode));maybeFail();return;}
      var type=signature(r.data);
      if(!type){states.binary='fail';errors.push('binary 不是有效图片');maybeFail();return;}
      var path=localBase()+'/v10_real_'+hash(fallback)+'_'+(++serial)+'.'+(type==='jpeg'?'jpg':type);
      try{wx.getFileSystemManager().writeFile({filePath:path,data:r.data,success:function(){
        if(completed)return;
        inspect(path,'binary',function(){states.binary='fail';maybeFail();},type);
      },fail:function(e){states.binary='fail';errors.push('write:'+logError(e));maybeFail();}});}
      catch(e){states.binary='fail';errors.push('write:'+logError(e));maybeFail();}
    },fail:function(e){if(completed)return;states.binary='fail';errors.push('binary:'+logError(e));maybeFail();}}));}
    catch(e){states.binary='fail';errors.push('binary:'+logError(e));maybeFail();}
  }
  timer=setTimeout(function(){finish(null,'图片加载超时');},SINGLE_MS);
  dlTimer=remote?setTimeout(startDownload,2800):null;
  binTimer=fallback?setTimeout(startBinary,8500):null;
  inspect(src,'getImageInfo',function(){states.info='fail';startDownload();if(states.download==='fail')startBinary();maybeFail();});
}
function obtain(key,source,ttl,done) {
  var cached=getCached(key,ttl);
  if(cached){done(cached,'');return;}
  if(pending[key]){pending[key].push(done);return;}
  pending[key]=[done];
  loadNetwork(source,function(asset,error){
    var callbacks=pending[key]||[];delete pending[key];
    if(asset){asset.cached=false;persist(key,asset);}
    callbacks.forEach(function(cb){try{cb(asset,error);}catch(e){console.warn('[V10.5 回调失败]',logError(e));}});
  });
}
function image(raw,done){
  var src=normalize(raw);
  if(!src){done(null,'图片地址无效');return;}
  obtain('image|'+src,src,PHOTO_TTL,done);
}
function imageList(list,done){
  var urls=[],seen={},failures=0,errors=[],completed=false;
  (list||[]).forEach(function(raw){var url=normalize(raw);if(url&&!seen[url]){seen[url]=true;urls.push(url);}});
  urls=urls.slice(0,3);
  if(!urls.length){done(null,'没有真实图片');return;}
  urls.forEach(function(u,i){setTimeout(function(){
    if(completed)return;
    image(u,function(asset,error){
      if(completed)return;
      if(asset){completed=true;done(asset,'');}
      else {failures++;errors.push(error||'图片加载失败');if(failures===urls.length){completed=true;done(null,errors.join(' | '));}}
    });
  },i===0?0:i===1?1500:3500);});
}
function qrIdentity(kind,id,version){
  var scope=userScope();
  return scope ? 'qr|'+appID()+'|'+server()+'|'+version+'|'+scope+'|'+kind+'|'+id : '';
}
var qrPending={};
function qr(kind,id,version,done){
  kind=String(kind||'');id=Number(id)||0;version=version||env();
  if(['prize','trial','review'].indexOf(kind)<0||id<1){done(null,'内容不存在');return;}
  var identity=qrIdentity(kind,id,version);
  if(identity){
    var cached=getCached(identity,QR_TTL);
    if(cached){done(cached,'');return;}
  }
  var flight=identity||'qr-anonymous|'+(++serial);
  if(qrPending[flight]){qrPending[flight].push(done);return;}
  qrPending[flight]=[done];
  function finish(asset,error){
    var list=qrPending[flight]||[];delete qrPending[flight];
    list.forEach(function(cb){try{cb(asset,error);}catch(e){console.warn('[V10.5 二维码回调失败]',logError(e));}});
  }
  v10.api('v10qrcode',{kind:kind,id:id,env_version:version},function(res){
    if(!res||res.error||!res.url){finish(null,'真实小程序码暂不可用');return;}
    // 不缓存身份缺失、账号已经变更的二维码，避免不同邀请人复用。
    var stillSame=identity&&identity===qrIdentity(kind,id,version);
    var url=normalize(res.url);
    if(!url){finish(null,'二维码图片地址无效');return;}
    if(!stillSame){loadNetwork(url,function(a,e){finish(a,e);});return;}
    obtain(identity,url,QR_TTL,finish);
  },function(){finish(null,'二维码接口请求失败');});
}
function preloadPrize(id,images){
  id=Number(id)||0;if(id<1)return;
  var valid=(images||[]).filter(Boolean);
  if(valid.length)imageList(valid,function(){});
  // 仅在登录态已确定时提前获取，防止预热出错误用户二维码。
  if(userScope())qr('prize',id,env(),function(){});
}
module.exports={env:env,image:image,imageList:imageList,qr:qr,preloadPrize:preloadPrize,normalize:normalize};
