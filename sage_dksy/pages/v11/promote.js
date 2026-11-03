var v = require('../../utils/v11.js');
var invitePoster = require('./red-poster.js');
var referral = require('../v132grow/referral.js');
// 微信开发者工具会将真正的本地临时文件表示为 http://tmp/... 。
// 只信任微信本地路径和 http(s)://tmp/，绝不放行普通远端 HTTPS 图片。
// V13.1.5：本地文件前缀取自微信运行环境，避免把开发者工具的 http://usr/ 当成网络图片。
function isWeChatLocalImage(path) {
  if (typeof path !== 'string' || !path) return false;
  var userDir = '';
  try { userDir = wx && wx.env && typeof wx.env.USER_DATA_PATH === 'string'
    ? wx.env.USER_DATA_PATH.replace(/\/+$/, '') : ''; } catch (e) {}
  // 微信官方提供的用户沙盒目录：开发者工具通常是 http://usr，真机通常是 wxfile://usr。
  if (userDir && path.indexOf(userDir + '/') === 0) return true;
  // 微信临时文件可由 downloadFile / getImageInfo 返回；不允许任意远端 http(s) 图片。
  return /^(?:wxfile:\/\/|file:\/\/|ttfile:\/\/|https?:\/\/tmp(?:\/|$)|\/(?!\/))/i.test(path)
    || /^[a-zA-Z]:[\\/]/.test(path);
}
Page({
  data: {
    total: null, today: null, rewardInfo:{approved:false,stages:[],cap:null}, campaignReady:false, metricsReady:false, walletReady:false, profileError:'', connecting:false, items: [], page: 1, hasMore: true, loading: false,
    code: '', inviter: '待同步', showBalance: false, fontScale: 1, voiceOn: false,
    qr: '', qrLocalPath:'', qrReady:false, posterPath: '', drawing: false, qrStage: '', notice: '',
    themes:invitePoster.THEMES, selectedTheme:0, selectedName:invitePoster.THEMES[0].name, selectedTag:invitePoster.THEMES[0].tag||'', generatedTheme:-1,
    currentBalance: 0, ledgerReceived: 0, ledgerComplete: false,
    view:'hub',guideOpen:false,saveBusy:false,nickname:'',avatar:'',posterExpanded:false, walletExpanded:false, settingsExpanded:false
  },
  onLoad: function (o) {
    this._alive=true;this._listSeq=0;var mode=o&&o.mode;this.setData({view:mode==='poster'||mode==='guide'?'poster':'hub',guideOpen:mode==='guide'});this.updateTitle();try{wx.showShareMenu({menus:['shareAppMessage','shareTimeline']});}catch(_){}
    var self = this;
    if (o && o.from) {
      v.registerVisit(o.from, 'home', 0, 'timeline', function (ok) {
        if (ok) wx.reLaunch({url:'/sage_dksy/pages/index/index'});
        else self.init();
      });
    } else this.init();
  },
  init: function () {
    if(this._connecting||!this._alive)return;
    var self=this;this._connecting=true;this._listSeq++;this._qrRequestId=(this._qrRequestId||0)+1;
    this._identityKey='';this._qrState='';this._qrLocal='';this._qrReadyOwner='';this._qrSource='';this._qrSourceOwner='';this._qrCallbacks=[];
    this.setData({connecting:true,profileError:'',code:'',qr:'',qrReady:false,qrLocalPath:'',posterPath:'',generatedTheme:-1,items:[],page:1,hasMore:true,loading:false,metricsReady:false,campaignReady:false,rewardInfo:{approved:false,stages:[],cap:null},walletReady:false});
    function fail(){self._connecting=false;if(self._alive)self.setData({connecting:false,profileError:'账户暂时没有连接成功，请重试'});}
    wx.login({success:function(auth){if(!self._alive)return;if(!auth||!auth.code)return fail();
      v.api('set',{code:auth.code},function(result){if(!self._alive)return;if(!result||!result.auth_token)return fail();self._connecting=false;var profile=result.userinfo&&typeof result.userinfo==='object'?result.userinfo:{};self.setData({connecting:false,nickname:String(profile.nickname||''),avatar:String(profile.headimg||'')});self.fetchIdentity();},fail);
    },fail:fail});
  },
  fetchIdentity: function () {
    var self = this;
    v.api('v11whoami', {}, function (r) {
      // 更换登录账号时必须丢弃上一个账号生成的推广图。
      if(!self._alive)return;var newCode=String(r.code||'');if(!/^[a-f0-9]{12}$/.test(newCode)){self.setData({profileError:'邀请编号暂时没有读取成功'});return;}var key=(r.member_no||'')+'|'+newCode+'|'+v.env();
      if (self._identityKey && self._identityKey !== key) {
        self._qrRequestId=(self._qrRequestId||0)+1;
        self._qrState='';self._qrReadyOwner='';self._qrLocal='';self._qrSource='';self._qrSourceOwner='';self._qrCallbacks=[];
        self._saveAfterRender=false;
        self.setData({qr:'',qrLocalPath:'',qrReady:false,posterPath:'',generatedTheme:-1,drawing:false,qrStage:''});
      }
      self._identityKey=key;
      self.setData({
        profileError:'', code: newCode, inviter: typeof r.inviter_label==='string'?(r.inviter_label||'暂无邀请人'):'待同步',
        showBalance: !!r.show_balance, fontScale: r.font_scale || 1, voiceOn: !!r.voice_on
      });
      if(newCode)self.ensureQr(function(){},true);
    }, function(){if(self._alive)self.setData({profileError:'账户暂时没有连接成功'});});
    this.load();
    v.api('v11wallet', {}, function (r) {
      if(!self._alive)return;var current=r.current_balance,received=r.ledger_received;if(current===null||current===undefined||received===null||received===undefined||!Number.isFinite(Number(current))||!Number.isFinite(Number(received)))return;self.setData({walletReady:true,currentBalance:current,ledgerReceived:received,ledgerComplete:!!r.ledger_reconciled});
    }, function () {});
  },
  load: function () {
    if (this.data.loading || !this.data.hasMore) return;
    var self = this,seq=++this._listSeq;
    this.setData({loading:true,notice:''});
    v.api('v11promote', {page:this.data.page}, function (r) {
      if(!self._alive||seq!==self._listSeq)return;
      if(!r||!Array.isArray(r.items)){self.setData({loading:false,notice:'邀请记录暂时没有加载出来，请重试'});return;}
      var x = r.items;
      x=x.filter(function(item){return item&&typeof item==='object';}).map(function(item){var copy=Object.assign({},item);try{copy.registerText=v.clock(item.registered_at);copy.bindText=v.clock(item.bound_at);}catch(_){copy.registerText='时间待同步';copy.bindText='时间待同步';}return copy;});
      var total=referral.count(r.total),today=referral.count(r.today);
      self.setData({metricsReady:total!==null&&today!==null,total:total,today:today,rewardInfo:referral.campaign(r),campaignReady:true,items:self.data.items.concat(x),page:self.data.page+1,hasMore:r.items.length===15,loading:false});
    }, function () { if(self._alive&&seq===self._listSeq)self.setData({loading:false,notice:'邀请记录暂时没有加载出来，请重试'}); });
  },
  refreshMetrics:function(){
    if(this._metricsRefreshing||!this._identityKey)return;
    var self=this,owner=this._identityKey;this._metricsRefreshing=true;
    v.api('v11promote',{page:1},function(r){self._metricsRefreshing=false;if(!self._alive||self._identityKey!==owner)return;if(r&&Array.isArray(r.items)){var total=referral.count(r.total),today=referral.count(r.today);self.setData({metricsReady:total!==null&&today!==null,total:total,today:today,rewardInfo:referral.campaign(r),campaignReady:true});}},function(){self._metricsRefreshing=false;});
  },
  retryRecords:function(){this.init();},
  onReachBottom: function () { this.load(); },
  onShow: function(){
    var self=this;
    // 小程序内切换身份后，绝不能继续展示上一个账户的海报及邀请短码。
    if(!this._identityKey)return;
    v.api('v11whoami',{},function(r){
      var fresh=(r.member_no||'')+'|'+(r.code||'')+'|'+v.env();
      if(fresh!==self._identityKey){
        self.setData({items:[],page:1,hasMore:true,loading:false,posterPath:'',generatedTheme:-1});
        self.init();
      }else self.refreshMetrics();
    },function(){
      self._qrRequestId=(self._qrRequestId||0)+1;
      self._identityKey='';self._qrState='';self._qrReadyOwner='';self._qrLocal='';self._qrSource='';self._qrSourceOwner='';self._qrCallbacks=[];
      self._saveAfterRender=false;
      self.setData({profileError:'账户连接需要更新，请点击重试',code:'',qr:'',qrLocalPath:'',qrReady:false,posterPath:'',generatedTheme:-1});
    });
  },
  onUnload: function(){this._alive=false;this._listSeq++;this._qrRequestId=(this._qrRequestId||0)+1;this._qrCallbacks=[];this._qrLocal='';this._qrReadyOwner='';this._qrSource='';this._qrSourceOwner='';this._saveAfterRender=false;},
  // 一人一身份与运行环境：真实二维码由服务端按登录用户生成。
  // V11.7.3：允许微信开发者工具 http://tmp/ 临时文件；继续拒绝普通网络图片路径。
  ensureQr: function(done,quiet){
    var self=this, code=this.data.code, key=this._identityKey;
    done=typeof done==='function'?done:function(){};
    if (!code || !key) {done(false,'');return;}
    var cached=this.data.qrLocalPath || this._qrLocal;
    if(this._qrState==='ready' && this._qrReadyOwner===key && isWeChatLocalImage(cached)){
      this._qrLocal=cached;done(true,cached);return;
    }
    if (this._qrState==='loading') {
      this._qrCallbacks=this._qrCallbacks||[];
      this._qrCallbacks.push(done);return;
    }
    this._qrState='loading';this._qrCallbacks=[done];
    var requestId=this._qrRequestId=(this._qrRequestId||0)+1,started=Date.now(),completed=false;
    var qrWatchdog=setTimeout(function(){finish(false,'','二维码准备超时，请重试');},15000);
    if(!quiet)this.setData({qrStage:'正在准备真实专属小程序码…'});
    function active(){return self._identityKey===key && self._qrRequestId===requestId && self.data.code===code;}
    function validPath(path){return isWeChatLocalImage(path);}
    function finish(ok,path,reason){
      if(completed)return;
      if(!active()){completed=true;clearTimeout(qrWatchdog);return;}
      completed=true;clearTimeout(qrWatchdog);
      ok=!!ok && validPath(path);
      self._qrState=ok?'ready':'error';self._qrReadyOwner=ok?key:'';self._qrLocal=ok?path:'';
      self.setData({qrReady:ok,qrLocalPath:ok?path:'',qrStage:ok?'':(reason||'真实小程序码加载失败，请重试')});
      console.info('[元享 V11.7.3 专属码就绪]',JSON.stringify({ms:Date.now()-started,ok:ok,env:v.env(),local:ok,reason:ok?'':(reason||'未知')}));
      var listeners=self._qrCallbacks||[];self._qrCallbacks=[];
      listeners.forEach(function(f){try{if(typeof f==='function')f(ok,ok?path:'');}catch(e){console.error('[元享专属码回调]',e);}});
    }
    // 先尝试原生图片读取，再尝试 downloadFile。两条链路失败时，
    // 使用 request(arraybuffer) 获取同一真实二维码图片，不合成、不伪造二维码。
    function inspectLocal(src,fromDownload,originalUrl){
      if(!active() || completed)return;
      try{
        wx.getImageInfo({src:src,success:function(info){
          if(!active()||completed)return;
          var path=info&&(info.path||info.tempFilePath);
          // 某些基础库只返回宽高，保留已通过 getImageInfo 解码的原本地临时路径。
          if(!validPath(path) && validPath(src)) path=src;
          if(!info||!(info.width>=100)||!(info.height>=100)){
            if(fromDownload && /^https:\/\//i.test(originalUrl||''))return requestBinary(originalUrl,'图片解码失败');
            return finish(false,'','二维码图片尺寸无效');
          }
          if(validPath(path))return finish(true,path,'');
          if(!fromDownload)return downloadLocal(src);
          if(/^https:\/\//i.test(originalUrl||''))return requestBinary(originalUrl,'图片路径无效');
          finish(false,'','二维码没有有效的本地文件路径');
        },fail:function(e){
          if(!active()||completed)return;
          console.warn('[元享 V11.7.3 二维码图片读取]',String(e&&e.errMsg||'失败').slice(0,150));
          if(!fromDownload && /^https:\/\//i.test(src))return downloadLocal(src);
          if(fromDownload && /^https:\/\//i.test(originalUrl||''))return requestBinary(originalUrl,'图片读取失败');
          finish(false,'','二维码本地图片读取失败');
        }});
      }catch(e){
        if(fromDownload && /^https:\/\//i.test(originalUrl||''))return requestBinary(originalUrl,'图片读取异常');
        finish(false,'','二维码本地读取异常');
      }
    }
    function requestBinary(url, previous){
      if(!active()||completed)return;
      if(self._qrBinaryRequestId===requestId)return;
      self._qrBinaryRequestId=requestId;
      if(typeof wx.request!=='function'||typeof wx.getFileSystemManager!=='function'||!wx.env||!wx.env.USER_DATA_PATH){
        return finish(false,'','当前微信环境没有备用图片读取能力');
      }
      self.setData({qrStage:'正在校验真实小程序码图片…'});
      try{
        wx.request({url:url,method:'GET',responseType:'arraybuffer',timeout:8000,
          success:function(r){
            if(!active()||completed)return;
            var status=Number(r&&r.statusCode)||0;
            var data=r&&r.data;
            var len=data&&typeof data.byteLength==='number'?data.byteLength:0;
            console.info('[元享 V11.7.3 二进制二维码]',JSON.stringify({status:status,bytes:len,previous:previous}));
            if(status!==200)return finish(false,'','二维码图片 HTTP '+status+'，请检查附件访问权限');
            if(!len||len<200||len>2*1024*1024)return finish(false,'','二维码接口返回的不是有效图片');
            var b=new Uint8Array(data);
            var png=b.length>=8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
            var jpg=b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
            if(!png&&!jpg)return finish(false,'','二维码图片格式不正确（不是 PNG/JPG）');
            var suffix=png?'.png':'.jpg';
            // 当前用户的邀请码 + 运行环境分开保存，拒绝其他账号复用。
            var cleanCode=String(code).replace(/[^a-f0-9]/gi,'').slice(0,32);
            var filePath=wx.env.USER_DATA_PATH+'/yx_v11_qr_'+cleanCode+'_'+v.env()+suffix;
            try{
              wx.getFileSystemManager().writeFile({filePath:filePath,data:data,
                success:function(){if(active()&&!completed)inspectLocal(filePath,true,'');},
                fail:function(e){if(!completed)finish(false,'','真实二维码写入本地失败');}
              });
            }catch(e){finish(false,'','真实二维码写入本地异常');}
          },fail:function(e){
            if(!active()||completed)return;
            console.warn('[元享 V11.7.3 二进制请求失败]',String(e&&e.errMsg||'失败').slice(0,160));
            finish(false,'','二维码图片请求失败，请检查 request 合法域名');
          }});
      }catch(e){finish(false,'','备用图片请求不可用');}
    }
    function downloadLocal(src){
      if(!active()||completed)return;
      if(typeof wx.downloadFile!=='function')return requestBinary(src,'downloadFile 不可用');
      self.setData({qrStage:'正在准备二维码本地文件…'});
      try{
        wx.downloadFile({url:src,success:function(r){
          if(!active()||completed)return;
          var status=Number(r&&r.statusCode)||0;
          console.info('[元享 V11.7.3 二维码下载]',JSON.stringify({status:status,hasPath:!!(r&&r.tempFilePath),local:!!(r&&validPath(r.tempFilePath))}));
          if(status!==200||!validPath(r.tempFilePath))return requestBinary(src,'downloadFile HTTP '+status);
          inspectLocal(r.tempFilePath,true,src);
        },fail:function(e){
          if(!active()||completed)return;
          console.warn('[元享 V11.7.3 二维码下载失败]',String(e&&e.errMsg||'失败').slice(0,160));
          requestBinary(src,'downloadFile 网络失败');
        }});
      }catch(e){requestBinary(src,'downloadFile 异常');}
    }
    function useUrl(url){
      if(!active())return;
      if(typeof url!=='string'||!/^https:\/\//i.test(url))return finish(false,'','未取得合法的小程序码地址');
      self._qrSource=url;self._qrSourceOwner=key;
      self.setData({qr:url,qrStage:'正在验证专属小程序码…'});
      inspectLocal(url,false);
    }
    // V13.1.4: 微信返回的真实二维码由后端直接安全传输；小程序仅存自己的私有临时目录。
    // 这条通道完全不依赖服务器 attachment 目录写入、附件域名或下载授权。
    function useInlineQr(base64, mime){
      if(!active()||completed)return;
      if(typeof base64!=='string'||base64.length<250||base64.length>600000||!/^[A-Za-z0-9+/=]+$/.test(base64))
        return finish(false,'','微信真实小程序码数据无效');
      if(typeof wx.getFileSystemManager!=='function'||!wx.env||!wx.env.USER_DATA_PATH)
        return finish(false,'','当前微信环境不支持保存专属小程序码');
      var data;
      try{data=wx.base64ToArrayBuffer(base64);}catch(err){return finish(false,'','专属二维码解码失败');}
      if(!data||data.byteLength<200||data.byteLength>400000)return finish(false,'','二维码图片大小异常');
      var b=new Uint8Array(data),png=b.length>=8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
      var jpg=b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
      if((mime==='image/png'&&!png)||(mime==='image/jpeg'&&!jpg)||(!png&&!jpg))return finish(false,'','收到的二维码不是有效图片');
      var safe=String(code).replace(/[^A-Za-z0-9_-]/g,'').slice(0,32),suffix=png?'.png':'.jpg';
      var path=wx.env.USER_DATA_PATH+'/yx_v1314_qr_'+safe+'_'+v.env()+suffix;
      self.setData({qrStage:'正在保存微信真实小程序码…'});
      try{wx.getFileSystemManager().writeFile({filePath:path,data:data,
        success:function(){if(active()&&!completed)inspectLocal(path,true,'');},
        fail:function(e){if(active()&&!completed)finish(false,'','本地二维码保存失败，请检查小程序缓存空间');}
      });}catch(e){finish(false,'','当前微信运行环境无法保存二维码');}
    }
    // 仅重试同一账号、同一环境下已取回的真实二维码地址。
    if(self._qrSource && self._qrSourceOwner===key){useUrl(self._qrSource);return;}
    v.api('v11qrcode',{kind:'home',env_version:v.env()},function(r){
      if(!active())return;
      if(r&&r.qr_base64)return useInlineQr(r.qr_base64,r.mime);
      return useUrl(r&&r.url); // 兼容仍在使用旧版后端的用户。
    },function(message){finish(false,'',message||'真实小程序码接口失败');});
  },
  // V11.5 只控制展示状态，不改变服务端邀请归属和二维码身份校验。
  noop:function(){},
  updateTitle:function(){wx.setNavigationBarTitle({title:this.data.view==='poster'?'专属邀请海报':'一级推广'});},
  togglePoster:function(){this.openPoster();},
  openPoster:function(){wx.navigateTo({url:'/sage_dksy/pages/v11/promote?mode=poster'});},
  goReferralRules:function(){wx.navigateTo({url:'/sage_dksy/pages/v14/rewards/index?category=invite'});},
  goReferralLedger:function(){wx.navigateTo({url:'/sage_dksy/pages/user/integral'});},
  goFriends:function(){wx.navigateTo({url:'/sage_dksy/pages/v132grow/index'});},
  openGuide:function(){this.setData({guideOpen:true});},
  closeGuide:function(){this.setData({guideOpen:false});},
  avatarError:function(){this.setData({avatar:''});},
  qrError:function(){this._qrState='';this._qrReadyOwner='';this._qrLocal='';this.setData({qrReady:false,qrLocalPath:'',qrStage:'专属小程序码暂时无法显示，请重试'});},
  toggleWallet:function(){this.setData({walletExpanded:!this.data.walletExpanded});},
  toggleSettings:function(){this.setData({settingsExpanded:!this.data.settingsExpanded});},
  copyCode:function(){if(!this.data.code)return v.toast('请先登录');wx.setClipboardData({data:String(this.data.code),success:function(){wx.showToast({title:'推广编号已复制',icon:'none'});},fail:function(){v.toast('复制失败，请重试');}});},
  previewPoster:function(){if(this.data.posterPath && this.data.generatedTheme===this.data.selectedTheme)wx.previewImage({current:this.data.posterPath,urls:[this.data.posterPath]});},
  retryQr:function(){var self=this;if(this.data.drawing)return;this._qrState='';this._qrReadyOwner='';this._qrLocal='';this._qrReadyOwner='';this._qrSource='';this._qrSourceOwner='';this._qrBinaryRequestId=0;this.setData({qrReady:false,qrLocalPath:'',qrStage:'正在重新获取小程序码…'});this.ensureQr(function(ok){if(!ok && !self.data.qrStage)self.setData({qrStage:'小程序码获取失败，请重试'});},false);},
  onPosterSwipe: function(e){this.selectPosterIndex(Number(e.detail.current));},
  onPosterTap: function(e){this.selectPosterIndex(Number(e.currentTarget.dataset.index));},
  selectPosterIndex: function(idx){
    if(!Number.isFinite(idx)||idx<0||idx>=invitePoster.THEMES.length)return;
    if(idx===this.data.selectedTheme)return;
    this._saveAfterRender=false;
    this.setData({selectedTheme:idx,selectedName:invitePoster.THEMES[idx].name,selectedTag:invitePoster.THEMES[idx].tag||'',posterPath:'',generatedTheme:-1});
    // 切换海报后预读包内素材，及早报告缺失文件，不阻塞二维码请求。
    // All approved red styles are drawn locally; the QR remains the verified server image.
  },
  makeQr: function () {
    var self=this;
    if(this.data.drawing)return;
    if(!this.data.code)return v.toast('请先登录，再制作专属海报');
    var selected=this.data.selectedTheme, code=this.data.code, owner=this._identityKey;
    this.setData({drawing:true,qrStage:'正在准备海报…',posterPath:'',generatedTheme:-1});
    this.ensureQr(function(ready, verifiedQrPath){
      if(!ready || !verifiedQrPath){self._saveAfterRender=false;self.setData({drawing:false});return;}
      if(self._identityKey!==owner||self.data.code!==code||self.data.selectedTheme!==selected){
        self._saveAfterRender=false;self.setData({drawing:false});return v.toast('海报已切换，请重新生成');
      }
      // 使用 ensureQr 成功时返回的路径快照，绝不读可能被异步重置的 _qrLocal。
      console.info('[元享 V11.7.3 海报路径校验]',JSON.stringify({qrReady:ready,local:!!verifiedQrPath,theme:selected+1}));
      self.setData({qrStage:'正在生成高清专属海报…'});
      invitePoster.render(self,verifiedQrPath,invitePoster.THEMES[selected].id,{nickname:self.data.nickname},function(path){
        if(self._identityKey!==owner||self.data.code!==code||self.data.selectedTheme!==selected){
          self._saveAfterRender=false;self.setData({drawing:false,qrStage:''});return;
        }
        self.setData({posterPath:path,generatedTheme:selected,drawing:false,qrStage:''});
        if(self._saveAfterRender){self._saveAfterRender=false;self.saveQrPoster();}
      },function(m){if(!self._alive)return;self._saveAfterRender=false;self.setData({drawing:false,qrStage:m});v.toast(m);},function(stage){
        if(self._identityKey===owner && self.data.selectedTheme===selected)self.setData({qrStage:stage});
      });
    },false);
  },
  saveQrPoster: function () {
    if(this.data.drawing||this.data.saveBusy)return;
    if (!this.data.posterPath || this.data.generatedTheme !== this.data.selectedTheme){this._saveAfterRender=true;return this.makeQr();}
    var self=this;this.setData({saveBusy:true});
    wx.saveImageToPhotosAlbum({filePath:this.data.posterPath,success:function(){
      v.api('v11metric',{type:'image_saved',kind:'home',id:0},function(){},function(){});
      wx.showToast({title:'分享图已保存到相册',icon:'none'});
    },fail:function(err){
      var msg=String(err && err.errMsg || '');
      if (/auth|deny|permission/i.test(msg)) {
        wx.showModal({title:'保存需要相册权限',content:'请在微信设置中允许保存图片后再试。',confirmText:'去设置',success:function(r){if(r.confirm)wx.openSetting({});}});
      } else v.toast('保存失败，请重试');
    },complete:function(){if(self._alive)self.setData({saveBusy:false});}});
  },
  onShareAppMessage: function () {
    v.api('v11metric',{type:'share_trigger',kind:'home',id:0},function(){},function(){});
    if(!this.data.code)return {title:'元享每日好礼｜每日签到·金币·兑换好礼',path:'/sage_dksy/pages/index/index'};
    return {title:'元享每日好礼｜签到积金币，兑换心仪好礼',path:'/sage_dksy/pages/v11/entry?from='+encodeURIComponent(this.data.code)};
  },
  onShareTimeline: function () {
    v.api('v11metric',{type:'share_trigger',kind:'home',id:0},function(){},function(){});
    if(!this.data.code)return {title:'元享每日好礼｜签到·金币·兑换好礼',query:''};
    return {title:'元享每日好礼｜每日签到·金币·好礼兑换',query:'from='+encodeURIComponent(this.data.code)+'&source=timeline'};
  },
  privacy: function (e) {
    var self=this,next=!!e.detail.value;
    v.api('v11profile',{show_balance:next?1:0,font_scale:this.data.fontScale,voice_on:this.data.voiceOn?1:0},function(){self.setData({showBalance:next});},function(m){self.setData({showBalance:!next});v.toast(m);});
  },
  voice: function (e) {
    var self=this,voice=!!e.detail.value;
    v.api('v11profile',{show_balance:this.data.showBalance?1:0,font_scale:this.data.fontScale,voice_on:voice?1:0},function(){self.setData({voiceOn:voice});},function(m){self.setData({voiceOn:!voice});v.toast(m);});
  },
  font: function (e) {
    var self=this,scale=Number(e.detail.value)||1;
    v.api('v11profile',{show_balance:this.data.showBalance?1:0,font_scale:scale,voice_on:this.data.voiceOn?1:0},function(){self.setData({fontScale:scale});},v.toast);
  }
});
