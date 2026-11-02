// 元享 V10.4 图片稳定性热修复（仅小程序前端）。
// 图片必须来自原商品/晒单数据，不能用虚构图片或空白图片代替。
var v = require('../../utils/v10.js');
var IMAGE_DEADLINE = 28000;
var POSTER_DEADLINE = 55000;
var fileSerial = 0;

function version() {
  try {
    var a = wx.getAccountInfoSync(), x = a && a.miniProgram && a.miniProgram.envVersion;
    return x === 'develop' || x === 'trial' || x === 'release' ? x : 'release';
  } catch (e) { return 'release'; }
}
function origin() {
  try {
    var x = getApp().siteInfo.siteroot || '';
    var m = String(x).match(/^https:\/\/[^/]+/i);
    return m ? m[0] : '';
  } catch (e) { return ''; }
}
function norm(raw) {
  if (raw && typeof raw === 'object') raw = raw.url || raw.src || raw.image || raw.picurl || raw.path || '';
  var s = String(raw || '').trim().replace(/&amp;/g, '&');
  if (!s) return '';
  if (/^(wxfile:|file:|http:\/\/tmp\/)/i.test(s) || /^\/sage_dksy\//.test(s)) return s;
  if (/^\/\//.test(s)) return 'https:' + s;
  if (/^https?:\/\//i.test(s)) return /^http:\/\//i.test(s) ? 'https://' + s.slice(7) : s;
  var base = origin();
  if (!base) return '';
  s = s.replace(/^\/+/, '');
  if (/^images\//i.test(s)) s = 'attachment/' + s;
  if (/^attachment\//i.test(s)) return base + '/' + s;
  return '';
}
function sameOriginCandidate(src) {
  var base = origin();
  if (!base) return '';
  var match = String(src).match(/^https:\/\/[^/]+(\/.*)$/i);
  if (!match) return '';
  if (String(src).indexOf(base + '/') === 0) return src;
  // 只允许已知附件路径回源；不把任意外链转成本站请求。
  if (/^\/attachment\/images\//i.test(match[1])) return base + match[1];
  return '';
}
function signature(buf) {
  if (!buf || typeof buf.byteLength !== 'number' || buf.byteLength < 24 || buf.byteLength > 6 * 1024 * 1024) return '';
  var u = new Uint8Array(buf);
  if (u[0] === 255 && u[1] === 216 && u[2] === 255) return '.jpg';
  if (u[0] === 137 && u[1] === 80 && u[2] === 78 && u[3] === 71 && u[4] === 13 && u[5] === 10 && u[6] === 26 && u[7] === 10) return '.png';
  if (u[0] === 82 && u[1] === 73 && u[2] === 70 && u[3] === 70 && u[8] === 87 && u[9] === 69 && u[10] === 66 && u[11] === 80) return '.webp';
  return '';
}
function hash(s) {
  var n = 2166136261;
  for (var i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = Math.imul(n, 16777619) >>> 0; }
  return String(n >>> 0);
}
function cleanupImage(asset) {
  var p = asset && asset.path || '', prefix = wx.env && wx.env.USER_DATA_PATH || '';
  if (!prefix || p.indexOf(prefix + '/v10_real_') !== 0) return;
  try { wx.getFileSystemManager().unlink({filePath:p, fail:function(){}}); } catch (e) {}
}
function shortError(err) { return String(err && (err.errMsg || err.message) || '失败').slice(0, 100); }

// 优先 getImageInfo。弱网 7 秒后再试 downloadFile，12 秒后试合法域名 request 二进制。
// 任何成功均立即返回；28 秒总上限，避免原 9 秒过早判失败。
function imageAsset(raw, done) {
  var src = norm(raw), remote = /^https:\/\//i.test(src);
  if (!src) { done(null, '图片地址为空或无效'); return; }
  var finished = false, errors = [], owned = [];
  var infoState = 'pending', dlState = remote ? 'waiting' : 'fail';
  var url = remote ? sameOriginCandidate(src) : '';
  var requestEnabled = !!(url && wx.request && wx.getFileSystemManager && wx.env && wx.env.USER_DATA_PATH);
  var reqState = requestEnabled ? 'waiting' : 'fail';
  var dlTimer = null, reqTimer = null, guard = null;

  function finish(img, reason) {
    if (finished) { if (img) cleanupImage(img); return; }
    finished = true;
    clearTimeout(dlTimer); clearTimeout(reqTimer); clearTimeout(guard);
    owned.forEach(function(p) { if (!img || p !== img.path) cleanupImage({path:p}); });
    if (!img) {
      // 控制台仅记录脱敏地址和技术原因，界面不暴露日志。
      console.warn('[V10 海报图片加载失败]', String(src).replace(/\?.*$/, '').replace(/\/[^/]*$/, '/[file]'), reason || errors.join('；') || '未知错误');
    }
    done(img || null, reason || errors.join('；'));
  }
  function maybeFail() {
    if (infoState === 'fail' && dlState === 'fail' && reqState === 'fail') finish(null, errors.join('；'));
  }
  function inspect(path, source, onFail) {
    if (finished) return;
    try {
      wx.getImageInfo({src:path, success:function(r) {
        if (finished) return;
        if (r && r.path && Number(r.width) > 0 && Number(r.height) > 0) {
          finish({path:r.path, width:r.width, height:r.height}, '');
        } else { errors.push(source + ':未获取到有效图片'); onFail(); }
      }, fail:function(e) {
        if (finished) return;
        errors.push(source + ':' + shortError(e)); onFail();
      }});
    } catch (e) { errors.push(source + ':' + shortError(e)); onFail(); }
  }
  function startDownload() {
    if (finished || dlState !== 'waiting') return;
    dlState = 'pending';
    if (typeof wx.downloadFile !== 'function') { dlState = 'fail'; if(infoState === 'fail') startRequest(); maybeFail(); return; }
    try {
      wx.downloadFile({url:src, timeout:18500, success:function(r) {
        if (finished) return;
        if (r && r.statusCode === 200 && r.tempFilePath) {
          inspect(r.tempFilePath, 'downloadFile', function(){ dlState = 'fail'; if(infoState === 'fail') startRequest(); maybeFail(); });
        } else { errors.push('downloadFile HTTP ' + (r && r.statusCode || '未知')); dlState = 'fail'; if(infoState === 'fail') startRequest(); maybeFail(); }
      }, fail:function(e) {
        if (finished) return;
        errors.push('downloadFile:' + shortError(e)); dlState = 'fail'; if(infoState === 'fail') startRequest(); maybeFail();
      }});
    } catch (e) { errors.push('downloadFile:' + shortError(e)); dlState = 'fail'; if(infoState === 'fail') startRequest(); maybeFail(); }
  }
  function startRequest() {
    if (finished || reqState !== 'waiting') return;
    reqState = 'pending';
    try {
      wx.request({url:url, method:'GET', responseType:'arraybuffer', timeout:14000, success:function(r) {
        if (finished) return;
        if (!r || r.statusCode !== 200) { errors.push('request HTTP ' + (r && r.statusCode || '未知')); reqState = 'fail'; maybeFail(); return; }
        var ext = signature(r.data);
        if (!ext) { errors.push('request非有效图片或超过6MB'); reqState = 'fail'; maybeFail(); return; }
        var path = wx.env.USER_DATA_PATH + '/v10_real_' + hash(url) + '_' + (++fileSerial) + ext;
        owned.push(path);
        wx.getFileSystemManager().writeFile({filePath:path, data:r.data, success:function(){
          if (finished) { cleanupImage({path:path}); return; }
          inspect(path, 'request本地图片', function(){reqState = 'fail'; maybeFail();});
        }, fail:function(e) {
          if (finished) return;
          errors.push('本地图片保存失败:' + shortError(e)); reqState = 'fail'; maybeFail();
        }});
      }, fail:function(e) {
        if (finished) return;
        errors.push('request:' + shortError(e)); reqState = 'fail'; maybeFail();
      }});
    } catch (e) { errors.push('request:' + shortError(e)); reqState = 'fail'; maybeFail(); }
  }
  guard = setTimeout(function() {finish(null, '图片加载超时（28秒）');}, IMAGE_DEADLINE);
  dlTimer = remote ? setTimeout(startDownload, 7000) : null;
  reqTimer = requestEnabled ? setTimeout(startRequest, 12000) : null;
  inspect(src, 'getImageInfo', function(){infoState = 'fail'; startDownload(); if (dlState === 'fail') startRequest(); maybeFail();});
}

// 备用商品图错峰启动，避免弱网瞬间发送 3 张图各 3 个请求。
function pickImages(arr, done) {
  var urls = [], seen = {}, found = false, failed = 0, errors = [];
  (arr || []).forEach(function(raw) { var u = norm(raw); if (u && !seen[u]) { seen[u] = true; urls.push(u); } });
  urls = urls.slice(0, 3);
  if (!urls.length) { done(null, '没有真实商品图片地址'); return; }
  urls.forEach(function(url, i) {
    var launch = function(){
      if (found) return;
      imageAsset(url, function(img, err) {
        if (found) { if (img) cleanupImage(img); return; }
        if (img) { found = true; done(img, ''); return; }
        errors.push(err || '图片不可用');
        failed++;
        if (failed === urls.length) {found = true; done(null, errors.join(' | '));}
      });
    };
    if (i === 0) launch();
    else setTimeout(launch, i === 1 ? 1800 : 4000);
  });
}
function wrapLines(text, len, max) {
  text = String(text || '').replace(/\s+/g, ' ').trim();
  var a = [];
  for (var i = 0; i < text.length; i += len) { a.push(text.slice(i, i + len)); if (a.length >= max) break; }
  if (a.length === max && text.length > len * max) a[max - 1] = a[max - 1].slice(0, -1) + '…';
  return a;
}
Page({
  data:{kind:'', id:0, busy:true, ready:false, posterPath:'', error:'', versionLabel:'', canSave:false},
  onLoad:function(o) {
    var k = o && o.kind || '', id = Number(o && o.id) || 0;
    if (['prize','trial','review'].indexOf(k) < 0 || id < 1) {this.setData({busy:false,error:'内容不存在'});return;}
    this._gone = false; this._run = 0; this._env = version();
    this.setData({kind:k,id:id,versionLabel:this._env==='develop'?'开发版':this._env==='trial'?'体验版':''});
    this.start();
  },
  onUnload:function() {this._gone=true;this._run++;clearTimeout(this._timer);cleanupImage(this._photo);cleanupImage(this._qrImage);},
  isCurrent:function(run) {return !this._gone && this._run === run && !this._ended;},
  start:function() {
    if (this._timer) clearTimeout(this._timer);
    cleanupImage(this._photo);cleanupImage(this._qrImage);
    var run = ++this._run, self = this, k = this.data.kind, id = this.data.id;
    this._ended = false;this._drawing=false;this._photoReady=false;this._qrReady=false;
    this._photo=null;this._qrImage=null;this._content=null;this._theme='red_gold';
    this.setData({busy:true,ready:false,canSave:false,posterPath:'',error:''});
    this._timer=setTimeout(function(){if(self.isCurrent(run))self.stop('生成超时，请重试',run);},POSTER_DEADLINE);
    v.api('v10config',{},function(c){if(self.isCurrent(run))self._theme=c&&c.poster_theme||'red_gold';});
    if (k === 'review') {
      v.api('v10public',{id:id},function(r){
        if(!self.isCurrent(run))return;
        if(!r||r.error){self.stop(r&&r.msg||'晒单尚未公开',run);return;}
        var a=r.review||{};
        self._content={name:a.title||'',imgs:(a.photos||[]).concat([a.image||'']),meta:[a.exchange_date?'兑换于 '+a.exchange_date:'',a.rating?'评价 '+a.rating+'星':'',a.body||''].filter(Boolean)};
        self.loadProductImage(run);
      },function(){self.stop('晒单读取失败',run);});
    } else {
      v.api('v10featured',{},function(r){
        if(!self.isCurrent(run))return;
        if(!r||r.error){self.stop(r&&r.msg||'商品读取失败',run);return;}
        var a=(r.items||[]).filter(function(x){return x.kind===k&&Number(x.id)===id;})[0];
        if(!a){self.stop('这件好礼暂未参加本周精选',run);return;}
        var meta=[];
        if(k==='prize')meta.push('库存 '+Number(a.quantity||0)+' 件'+(a.state?' · '+a.state:''));
        else {meta.push('名额 '+Number(a.quantity||0)+' 份'+(a.state?' · '+a.state:''));if(a.deadline)meta.push('截止 '+a.deadline);}
        if(a.terms)meta.push('参与条件：'+a.terms);
        if(a.freight)meta.push('邮费：'+a.freight);
        self._content={name:a.title||'',imgs:[a.image||'',a.share_cover||''],meta:meta};
        self.loadProductImage(run);
      },function(){self.stop('商品读取失败',run);});
    }
    // 商品图片与小程序码独立并行获取，不再串行等待。
    v.api('v10qrcode',{kind:k,id:id,env_version:this._env},function(r){
      if(!self.isCurrent(run))return;
      if(!r||r.error||!r.url){self.stop('小程序码暂不可用，请重试',run);return;}
      imageAsset(r.url,function(qr,reason){
        if(!self.isCurrent(run)){cleanupImage(qr);return;}
        if(!qr){console.warn('[V10 海报小程序码诊断]',reason);self.stop('小程序码加载失败，请重试',run);return;}
        self._qrImage=qr;self._qrReady=true;self.maybeDraw(run);
      });
    },function(){self.stop('小程序码读取失败',run);});
  },
  loadProductImage:function(run) {
    if(!this.isCurrent(run))return;
    var self=this, imgs=(this._content&&this._content.imgs)||[];
    try {
      var cached=wx.getStorageSync('v10_poster_source_'+this.data.kind+'_'+this.data.id);
      if(cached&&cached.at&&Date.now()-cached.at<15*60*1000) imgs=(cached.images||[]).concat(cached.image||[],imgs);
    } catch(e){}
    pickImages(imgs,function(photo,reason){
      if(!self.isCurrent(run)){cleanupImage(photo);return;}
      if(!photo){console.warn('[V10 海报商品图诊断]',reason);self.stop('商品图片加载失败，请重试',run);return;}
      self._photo=photo;self._photoReady=true;self.maybeDraw(run);
    });
  },
  retry:function(){this.start();},
  stop:function(message,run){
    if(run!==undefined && !this.isCurrent(run))return;
    if(this._gone||this._ended)return;
    this._ended=true;clearTimeout(this._timer);
    cleanupImage(this._photo);cleanupImage(this._qrImage);
    this._photo=null;this._qrImage=null;
    this.setData({busy:false,ready:false,canSave:false,error:message||'生成失败'});
  },
  maybeDraw:function(run){
    if(!this.isCurrent(run)||this._drawing||!this._photoReady||!this._qrReady)return;
    this._drawing=true;
    this.render(this._photo,this._qrImage,run);
  },
  render:function(photo,qr,run){
    if(!this.isCurrent(run))return;
    var self=this,d=this._content||{},ctx;
    try{
      ctx=wx.createCanvasContext('v10Canvas',this);
      var dark=this._theme==='red_minimal'?'#76233c':'#8e2940';
      ctx.setFillStyle('#fffbf6');ctx.fillRect(0,0,660,880);
      ctx.setFillStyle(dark);ctx.fillRect(0,0,660,120);
      ctx.setFillStyle('#fbe9cf');ctx.setFontSize(23);ctx.fillText('元享好礼',28,44);
      ctx.setFontSize(35);ctx.fillText(this.data.kind==='review'?'真实晒单':'本周精选',28,94);
      var iw=photo.width||612,ih=photo.height||340,ratio=Math.max(612/iw,340/ih);
      var sw=612/ratio,sh=340/ratio,sx=Math.max(0,(iw-sw)/2),sy=Math.max(0,(ih-sh)/2);
      ctx.drawImage(photo.path,sx,sy,sw,sh,24,142,612,340);
      ctx.setFillStyle('#37231f');ctx.setFontSize(31);
      wrapLines(d.name||'',17,2).forEach(function(t,i){ctx.fillText(t,28,525+i*40);});
      ctx.setFontSize(21);ctx.setFillStyle('#806d63');
      var l=[];(d.meta||[]).forEach(function(item){wrapLines(item,28,2).forEach(function(t){l.push(t);});});
      l.slice(0,3).forEach(function(t,i){ctx.fillText(t,28,610+i*30);});
      ctx.setFillStyle('#e8d8cb');ctx.fillRect(28,711,604,1);
      ctx.drawImage(qr.path,465,728,122,122);
      ctx.setFillStyle(dark);ctx.setFontSize(23);ctx.fillText('扫码查看详情',30,789);
      if(this._env!=='release'){ctx.setFontSize(18);ctx.setFillStyle('#9b8b80');ctx.fillText(this.data.versionLabel+'测试',30,831);}
      ctx.draw(false,function(){
        if(!self.isCurrent(run))return;
        try{
          wx.canvasToTempFilePath({canvasId:'v10Canvas',destWidth:660,destHeight:880,
            success:function(r){
              if(!self.isCurrent(run))return;
              if(!r||!r.tempFilePath){self.stop('海报导出失败，请重试',run);return;}
              self._ended=true;clearTimeout(self._timer);
              cleanupImage(self._photo);cleanupImage(self._qrImage);
              self._photo=null;self._qrImage=null;
              self.setData({busy:false,ready:true,canSave:true,posterPath:r.tempFilePath,error:''});
              v.track('poster_generated',self.data.kind,self.data.id,'poster');
            },fail:function(){self.stop('海报导出失败，请重试',run);}},self);
        }catch(e){self.stop('海报导出失败，请重试',run);}
      });
    }catch(e){console.warn('[V10 海报绘制失败]',shortError(e));self.stop('海报绘制失败，请重试',run);}
  },
  save:function(){
    var self=this;if(!this.data.canSave||!this.data.posterPath)return;
    wx.saveImageToPhotosAlbum({filePath:this.data.posterPath,success:function(){wx.showToast({title:'已保存'});v.track('poster_saved',self.data.kind,self.data.id,'poster');},
      fail:function(){wx.showToast({title:'无法保存，请检查相册权限',icon:'none'});}});
  }
});
