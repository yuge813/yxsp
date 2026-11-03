var app = getApp();
var yx16nav = require('../../utils/v1216nav.js');

/* YX_V12237_SUBSCRIBE_RESTORE */
const YX37_SIGN_TEMPLATE_FALLBACK = 'H2dPAqi_i_AXViVbUDIRBbUcgpIHzsZAOK8VRXEwg7g';
const YX37_ORDER_TEMPLATE_FALLBACK = 'iNu6GcO3P4q1UJzoL0g9KXbRTmhzecH8AHkOp1pWTFg';
function yx37PushUnique(list, value) {
  value = typeof value === 'string' ? value.trim() : '';
  if (!value || !/^[A-Za-z0-9_-]{12,}$/.test(value) || value.indexOf('adunit-') === 0) return;
  if (list.indexOf(value) === -1) list.push(value);
}
function yx37CollectFromAny(source, out) {
  if (!source) return;
  if (typeof source === 'string') {
    source.split(/[\s,;|]+/).forEach(function(part){ yx37PushUnique(out, part); });
    return;
  }
  if (Array.isArray(source)) {
    source.forEach(function(item){ yx37CollectFromAny(item, out); });
    return;
  }
  if (typeof source === 'object') {
    Object.keys(source).forEach(function(key){
      var val = source[key];
      var lower = String(key || '').toLowerCase();
      if (/(template|tmpl)/.test(lower) || /template|tmpl/.test(String(val))) yx37CollectFromAny(val, out);
      else if (typeof val === 'object') yx37CollectFromAny(val, out);
    });
  }
}
function yx37GetSignTemplateIds(ctx) {
  var out = [];
  yx37CollectFromAny(ctx && ctx.setinfo && (ctx.setinfo.sign_template_id || ctx.setinfo.qian_template_id || ctx.setinfo.sign_subscribe_template_id), out);
  yx37CollectFromAny(ctx && ctx.setinfo && ctx.setinfo.template_sign_id, out);
  if (!out.length) yx37PushUnique(out, YX37_SIGN_TEMPLATE_FALLBACK);
  return out.slice(0, 3);
}
function yx37GetOrderTemplateIds(ctx) {
  var out = [];
  yx37CollectFromAny(ctx && ctx.template_str, out);
  yx37CollectFromAny(ctx && ctx.setinfo && (ctx.setinfo.order_template_id || ctx.setinfo.delivery_template_id || ctx.setinfo.prize_template_id), out);
  if (!out.length) yx37PushUnique(out, YX37_ORDER_TEMPLATE_FALLBACK);
  return out.slice(0, 3);
}

// 测试站网络诊断：不输出微信登录 code、用户 OpenID、会话令牌或请求体。
function safeNetworkMessage(endpoint, err) {
  if (typeof console !== 'undefined' && console.warn) console.warn('[元享网络]', {api:endpoint,code:err&&(err.errno||err.errCode)||''});
  return /timeout|timed out/i.test(String(err&&err.errMsg||'')) ? '连接有些慢，请稍后重试' : '暂时连接不上，请检查网络后重试';
}
function safeUserMessage(value,fallback){
 var text=String(value||'');
 return !text||/PHP|JSON|SQL|微擎|补丁|auth_token|https?:|certificate|request:fail/i.test(text)?(fallback||'服务暂时不可用，请稍后重试'):text.slice(0,64);
}
function nonnegative(value){if(value===null||value===undefined||value==='')return null;var n=Number(value);return isFinite(n)&&n>=0?Math.floor(n):null;}

/* YX_V12201_TASK_HELPER */
// 今日任务只读 V12 后端状态；广告使用 V12.15 原生播放页，不创建第二套结算。
function makeTodayTask(raw) {
  const r = raw || {}, reward = nonnegative(r.coins), remaining = nonnegative(r.remaining);
  const now = Number(r.now) || Math.floor(Date.now() / 1000);
  const next = Number(r.next_at) || 0;
  const base = { loaded:true, enabled:false, remaining:null, coins:null,
    state:'unavailable', label:'任务暂不可用', hint:'可以继续正常阅读', button:'稍后再试', unit:'' };
  if ((r.error !== undefined && Number(r.error) !== 0) || Number(r.logged_in) !== 1) return base;
  base.coins = reward !== null && reward > 0 ? reward : null;
  base.remaining = remaining !== null ? remaining : null;
  base.unit = typeof r.ad_unit_id === 'string' ? r.ad_unit_id : '';
  if (Number(r.reward_enabled) !== 1 || String(r.mode || 'manual_verified') === 'manual_verified') {
    return Object.assign(base,{state:'disabled',label:'当前暂未开放',hint:'可继续免费阅读',button:'暂未开放'});
  }
  if (/^native_auto_\d{10}$/.test(String(r.mode||'')) && (reward===null||reward<1||reward>2||Number(r.daily_limit)>10||Number(r.cooldown_sec||600)<600)) return Object.assign(base,{state:'disabled',label:'奖励暂不可用',hint:'可以继续免费阅读',button:'暂不可用'});
  if (r.pending_task) return Object.assign(base,{state:'pending',label:'上次奖励状态待同步',hint:'请稍后刷新',button:'稍后查看'});
  if (remaining===null) return Object.assign(base,{state:'unavailable',label:'次数待同步',hint:'请刷新后再参与',button:'待同步'});
  if (base.remaining !== null && base.remaining <= 0) return Object.assign(base,{state:'limit',label:'今日任务已完成',hint:'明天再来看看',button:'今日已领完'});
  if (Number(r.budget_blocked)===1) return Object.assign(base,{state:'disabled',label:'今日金币预算已满',hint:'次数分别统计，金币预算共用',button:'预算已满'});
  if (next > now) return Object.assign(base,{state:'cool',label:'稍后可以继续观看',hint:'冷却中 · '+Math.ceil((next-now)/60)+' 分钟',button:'冷却中'});
  if (!/^adunit-[A-Za-z0-9]{8,80}$/.test(base.unit)) return Object.assign(base,{state:'unavailable',label:'视频暂时不可用',hint:'请稍后重试',button:'稍后再试'});
  return Object.assign(base,{state:'ready',enabled:true,label:'自愿观看激励视频',
    hint:base.coins === null ? '完整观看后按平台规则领取金币' : '完整观看本次可领取 '+base.coins+' 金币',
    button:'看视频领金币'});
}

function buildSignCards(settings, streak, signed) {
  var level = Math.max(0, Number(streak) || 0);
  var todaySigned = Number(signed) === 1;
  var dayIndex = todaySigned ? ((Math.max(level, 1) - 1) % 7) + 1 : (level % 7) + 1;
  var doneUntil = todaySigned ? dayIndex : dayIndex - 1;
  return Array.from({ length: 7 }, function (_, i) {
    var day = i + 1, raw = settings && settings['day' + day];
    var number = (raw === undefined || raw === null || raw === '') ? NaN : Number(raw);
    return { day: day, amount: Number.isFinite(number) && number >= 0 ? Math.floor(number) : null,
      done: day <= doneUntil && level > 0, active: !todaySigned && day === dayIndex };
  });
}

Page({
  data: {
    /* YX_V12201_TASK_DATA */
    todayTask: {loaded:false,enabled:false,remaining:null,coins:null,state:'loading',label:'正在读取今日任务',hint:'',button:'加载中',unit:''}, readingTask: {loaded:false,remaining:null,coins:null,state:'loading'}, todayTaskBusy:false,
    loaded: false, signReady:false, signError:'', contentLoading:true, goodsError:'', articleLoading:true, articleError:'', signing: false, bonusBusy: false, subscribeBusy:false, subscribeSignTemplate:"", subscribeConfigReady:false,
    thisurl: 'sage_dksy/pages/index/index',
    apptitle: '元享APP', setinfo: { integral_title: '金币' },
    userinfo: {}, num: null, signReceipt:null, homeTrial:{}, trialImageFailed:false, signNum: 0, today_qian: 0,
    week: [1, 2, 3, 4, 5, 6, 7], signCards: buildSignCards({}, 0, 0), nextSignReward: null,
    prize: [], adset: { reward_on: 0 }, homeBannerLoaded: false,
    bonus: { enabled: 0, count: 0, limit: 0, points: 0 },
    tabBar: [], share: {}, pageError: '',
    commonFeatures: yx16nav.common(), homeGoods: [], recommendArticle: {},
    loadingPrize: false, growth: {joined:0,done_count:0,days:[]}
  },
  onLoad: function () {
    // 邀请来源仅在服务端认证后自动归属，不在前端展示二次确认。
    var v11self=this;require('../../utils/v11.js').api('v11config',{},function(r){v11self.setData({v11EntryOn:!!r.home_on});},function(){});
    var self=this;this.rewardControl={refresh:function(){return Promise.all([self.refreshWallet(),self.refreshTodayTask()]);}};
    this.init();
  },
  yx16Refresh: function(){ this.setData({commonFeatures:yx16nav.common()}); },
  yx16Open: function(e){yx16nav.go(e.currentTarget.dataset.id);},
  /* YX_V12201_TASK_METHODS */
  refreshTodayTask: function () {
    const self=this;
    const seq=(this._todayTaskSeq||0)+1;this._todayTaskSeq=seq;
    const v12=require('../../utils/v12read.js');
    return v12.call('v12status',{channel:'home'}).then(function(r){
      if (self._todayTaskSeq!==seq) return;
      self.setData({todayTask:makeTodayTask(r),todayTaskBusy:false});
      v12.call('v12status',{channel:'read'}).then(function(rr){
        if (self._todayTaskSeq!==seq) return;
        self.setData({readingTask:makeTodayTask(rr)});
      }).catch(function(){if(self._todayTaskSeq===seq) self.setData({readingTask:{loaded:false,remaining:null,coins:null,state:'unavailable'}});});
    }).catch(function(){
      if (self._todayTaskSeq!==seq) return;
      self.setData({todayTask:makeTodayTask({error:1}),todayTaskBusy:false});
    });
  },
  openTodayTask: function () {
    if (this.data.todayTaskBusy || !this.data.loaded) return;
    const task=this.data.todayTask||{};
    if (task.state!=='ready' || !task.enabled) {
      if (task.state==='unavailable') this.refreshTodayTask();
      else wx.showToast({title:task.label||'暂不能观看',icon:'none'});
      return;
    }
    this.setData({todayTaskBusy:true});
    const self=this;
    // 点击前再核对额度、冷却和广告位；不凭缓存创建奖励任务。
    require('../../utils/v12read.js').call('v12status',{channel:'home'}).then(function(r){
      const fresh=makeTodayTask(r);
      self.setData({todayTask:fresh,todayTaskBusy:false});
      if (!fresh.enabled || fresh.state!=='ready') {
        wx.showToast({title:fresh.label,icon:'none'});return;
      }
      // V12.23.4: show on this home page; no cross-page native ad instance.
      if (!self._yxRewardAd) self._yxRewardAd=require('../../utils/v12234_reward_inline.js').create(self,'home');
      self._yxRewardAd.play(fresh.unit);
    }).catch(function(){self.setData({todayTaskBusy:false});wx.showToast({title:'任务状态获取失败，请重试',icon:'none'});});
  },


  loadSubscribeConfig: function () {
    var self=this;
    this.api('subscribeconfig', {}, function(res){
      if(Number(res.error)!==0)return;
      var sign=Array.isArray(res.sign)?res.sign.filter(function(v){return typeof v==='string' && v.length>=16;}):[];
      self.setData({subscribeSignTemplate:sign.length?sign[0]:'',subscribeConfigReady:true});
    },function(){self.setData({subscribeSignTemplate:'',subscribeConfigReady:false});});
  },
  subscribeSignNotice: function () {
    if (this.data.subscribeBusy || !this.data.loaded) return;
    var id=this.data.subscribeSignTemplate;
    if (!id) { wx.showToast({title:'签到提醒模板未加载，请稍后重试',icon:'none'});this.loadSubscribeConfig();return; }
    if (typeof wx.requestSubscribeMessage!=='function') { wx.showToast({title:'当前微信不支持订阅消息',icon:'none'});return; }
    var self=this;
    this.setData({subscribeBusy:true});
    // 必须同步由点击事件发起；登录及模板预载均在此前完成。
    wx.requestSubscribeMessage({
      tmplIds:[id],
      success:function(res){
        if (res && res[id]==='accept') {
          self.api('adddy',{priTmplId:id},function(r){
            if(Number(r.error)===0) wx.showToast({title:'已订阅下次签到提醒',icon:'none'});
            else wx.showToast({title:r.msg||'订阅登记未成功',icon:'none'});
          },function(){wx.showToast({title:'登记失败，请重试',icon:'none'});});
        } else {
          wx.showToast({title:'未开启提醒，不影响签到',icon:'none'});
        }
      },
      fail:function(){wx.showToast({title:'订阅暂不可用，请在微信真机重试',icon:'none'});},
      complete:function(){self.setData({subscribeBusy:false});}
    });
  },
  v11Accept: function(){require('../../utils/v11.js').autoBindReferral(function(){});},
  onShow: function () {
    this.yx16Refresh();
    if (this.data.loaded) this.reload();
  },
  onHide: function () {if(this._yxRewardAd) this._yxRewardAd.leave();},
  onUnload: function () {this._disposed=true;if(this._yxRewardAd){this._yxRewardAd.destroy();this._yxRewardAd=null;}},
  api: function (endpoint, data, success, failure) {
    var self = this;
    return app.secureRequest({
      url: app.util.url('entry/wxapp/' + endpoint) + 'm=sage_dksy',
      method: 'POST', data: data || {},
      timeout: 15000,
      success: function (res) {
        var status = Number(res && res.statusCode) || 0;
        if (status < 200 || status >= 300) {
          if (typeof console !== 'undefined' && console.error) {
            console.error('[DKSY API HTTP 异常]', { api: endpoint, status: status });
          }
          if (failure) failure('服务暂时不可用，请稍后重试');
          return;
        }
        var body = res.data || {};
        if (typeof body === 'string') {
          try { body = JSON.parse(body); }
          catch (_) {
            if (typeof console !== 'undefined' && console.error) console.error('[DKSY API 响应格式异常]', { api: endpoint });
            if (failure) failure('数据暂未同步，请稍后重试');
            return;
          }
        }
        if (!body || typeof body !== 'object') {
          if (failure) failure('数据暂未同步，请稍后重试');
          return;
        }
        if (body.error === 401 || body.error === '401') {
          self.setData({ loaded: false, pageError: '登录连接已失效，请重新连接' });
          if (typeof console !== 'undefined' && console.warn) console.warn('[DKSY AUTH] 接口返回401；请确认服务器已部署登录修复版 PHP，未输出会话令牌', { api: endpoint });
          app.clearAuth();
          if (failure) failure('登录连接已失效，请重新连接'); return;
        }
        if (Number(body.error) && endpoint === 'set') {
          if (failure) failure(safeUserMessage(body.msg,'账号暂时无法连接，请重试'));
          return;
        }
        if (success) success(body);
      },
      fail: function (err) { if (failure) failure(safeNetworkMessage(endpoint, err)); }
    });
  },
  init: function () {
    var self = this;
    // 重试使用新的微信 code 换取新会话，不能复用过期测试站令牌。
    app.clearAuth();
    if(this._initializing)return;this._initializing=true;
    this.setData({ loaded: false, signReady:false, pageError: '' });
    wx.login({
      success: function (res) {
        if (!res.code) { self._initializing=false;self.setData({ pageError: '微信登录暂不可用，请下拉刷新' }); return; }
        self.api('set', { code: res.code }, function (data) {
          self._initializing=false;
          if (!data.openid) { self.setData({ loaded: false, pageError: '账号初始化失败，请稍后重试' }); return; }
          if (!data.auth_token) {
            self.setData({ loaded: false, pageError: '账号连接暂未完成，请重新连接' });
            if (typeof console !== 'undefined' && console.warn) console.warn('[DKSY AUTH] set 接口未提供 auth_token，请检查旧微擎数据库配置读取');
            return;
          }
          wx.setStorageSync('openid', data.openid);
          try { wx.setStorageSync('dksy_v7_sign_settings', data.setinfo || {}); } catch (_) {}
          self.setData({
            loaded: true, pageError: '', apptitle: data.apptitle || '元享APP',
            setinfo: data.setinfo || { integral_title: '金币' },
            tabBar: data.tabBar || [], userinfo: data.userinfo || {},
            num: nonnegative((data.userinfo || {}).num), signCards: buildSignCards(data.setinfo || {}, 0, 0)
          });
          wx.setNavigationBarTitle({ title: '元享' });
          self.reload(true);
          self.loadSubscribeConfig();
          // 登录身份已由 doPageSet 建立后，自动绑定首次访问的有效邀请来源。
          require('../../utils/v11.js').autoBindReferral(function(result){
            if(result && result.bound) console.info('[元享同行邀请] 一级关系建立成功');
          });
        }, function (message) { self._initializing=false;self.setData({ pageError: safeUserMessage(message,'账号连接失败，请重试') }); });
      },
      fail: function () { self._initializing=false;self.setData({ pageError: '暂时连接不上，请检查网络后重试' }); }
    });
  },
  refreshWallet: function () {
    var self=this;
    if(this._walletPromise)return this._walletPromise;
    this._walletPromise=new Promise(function(resolve){
      wx.login({success:function(auth){
        if(!auth.code){resolve();return;}
        self.api('set',{code:auth.code},function(r){
          if(r.userinfo && typeof r.userinfo==='object' && !self._disposed){
            var changes={userinfo:r.userinfo,num:nonnegative(r.userinfo.num)};
            if(changes.num===null)delete changes.num;
            if(r.setinfo&&typeof r.setinfo==='object'){changes.setinfo=r.setinfo;if(self.data.signReady){var cards=buildSignCards(r.setinfo,self.data.signNum,self.data.today_qian),current=cards.filter(function(c){return c.active;})[0];changes.signCards=cards;changes.nextSignReward=current?current.amount:null;}}
            self.setData(changes);
          }
          resolve();
        },function(){resolve();});
      },fail:function(){resolve();}});
    }).then(function(){self._walletPromise=null;});
    return this._walletPromise;
  },
  reload: function (skipWallet) {
    this.refreshTodayTask();
    if(!skipWallet)this.refreshWallet();
    var self=this;
    this.setData({signError:'',contentLoading:true,goodsError:'',articleLoading:true,articleError:''});
    this.api('qianinfo', {}, function (info) {
      if(Number(info.error)||info.qd===undefined){self.setData({signReady:false,signError:'签到状态暂未同步，请重试'});return;}
      var streak=Math.max(0,Number(info.qd)||0),signed=Number(info.today_qian)===1?1:0;
      var cards=buildSignCards(self.data.setinfo,streak,signed),current=cards.filter(function(x){return x.active;})[0];
      self.setData({signReady:true,signError:'',signNum:streak,today_qian:signed,signCards:cards,nextSignReward:current?current.amount:null});
    },function(){self.setData({signReady:false,signError:'签到状态暂未同步，请重试'});});
    this.api('trial',{openid:self.data.openid||'',pages:1},function(info){var rows=Array.isArray(info.trial)?info.trial:[];var current=rows.filter(function(row){return row&&typeof row==='object'&&String(row.isyes)==='1';})[0]||{};self.setData({homeTrial:current,trialImageFailed:false});});
    this.api('indexprize',{pages:1},function(info){
      if(Number(info.error)){self.setData({contentLoading:false,goodsError:'好礼暂未加载出来'});return;}
      var list=Array.isArray(info.prize)?info.prize.filter(function(row){return row&&typeof row==='object'&&Number(row.prize_id)>0;}):[];self.setData({prize:list,homeGoods:list.slice(0,4),contentLoading:false});
    },function(){self.setData({contentLoading:false,goodsError:'好礼暂未加载出来'});});
    this.api('adset',{},function(info){self.setData({adset:info.adset||{reward_on:0},homeBannerLoaded:false});});
    this.api('growthstatus',{},function(info){if(Number(info.error)===0)self.setData({growth:info.challenge||{joined:0,done_count:0}});});
    this.api('bonusstatus',{},function(info){if(!info.error)self.setData({bonus:info});});
  },
  retrySections:function(){if(this.data.loaded)this.reload();else this.init();},
  closeSignReceipt:function(){this.setData({signReceipt:null});wx.setNavigationBarTitle({title:'元享'});},
  onTrialImageError:function(){this.setData({trialImageFailed:true});},
  onArticleImageError:function(){this.setData({'recommendArticle.cover_url':''});},
  onPullDownRefresh: function () {
    this.init();
    wx.stopPullDownRefresh();
  },
  bindSignIn: function () {
    if (this.data.signing || this.data.today_qian === 1 || !this.data.loaded || !this.data.signReady) return;
    var self = this;
    this.setData({ signing: true });
    // 基础签到不依赖任何广告，也不请求头像、昵称、手机号和订阅消息。
    this.api('qian', {}, function (res) {
      self.setData({ signing: false, signReady:false });
      if (Number(res.error) === 0) {
        var amount=nonnegative(res.num);
        wx.showToast({ title: amount===null?'签到已提交，正在同步':'签到成功 +'+amount+' 金币',icon:'none' });
        if(amount!==null){self.setData({today_qian:1,num:self.data.num===null?null:Number(self.data.num)+amount,signReceipt:{amount:amount}});wx.setNavigationBarTitle({title:'签到成功'});}
        self.reload();
      } else {
        wx.showToast({ title: safeUserMessage(res.msg,'签到未成功，请重试'), icon: 'none' });
        self.reload();
      }
    }, function (message) { self.setData({ signing: false }); wx.showToast({ title: message, icon: 'none' }); });
  },
  watchBonus: function () {
    var self = this, setting = this.data.bonus;
    if (this.data.bonusBusy || Number(setting.enabled) !== 1 || Number(setting.count) >= Number(setting.limit) || !this.data.loaded) return;
    var id = String(this.data.adset.jvideo_id || '');
    if (!wx.createRewardedVideoAd || !/^adunit-[a-zA-Z0-9]{8,64}$/.test(id)) {
      wx.showToast({ title: '激励视频暂不可用，不影响普通签到', icon: 'none' });
      return;
    }
    this.setData({ bonusBusy: true });
    this.api('bonusstart', {}, function (start) {
      if (Number(start.error) !== 0 || !start.ticket) {
        self.setData({ bonusBusy: false });
        wx.showToast({ title: start.msg || '暂时无法观看', icon: 'none' });
        return;
      }
      var ad;
      var done = false;
      var serverTicket = String(start.ticket);
      function finish () {
        if (ad && ad.offClose) ad.offClose(onClose);
        if (ad && ad.offError) ad.offError(onError);
        self.setData({ bonusBusy: false });
        self.api('bonusstatus', {}, function (status) {
          if (Number(status.error) === 0) self.setData({ bonus: status });
        });
      }
      function cancel (message) {
        if (done) return; done = true;
        self.api('bonuscancel', { ticket: serverTicket }, function () { finish(); }, function () { finish(); });
        wx.showToast({ title: message || '本次未完成观看', icon: 'none', duration: 2200 });
      }
      function onError (err) {
        if (typeof console !== 'undefined') console.warn('[激励视频加载失败]', (err || {}).errCode);
        cancel('当前没有可播放广告，普通签到不受影响');
      }
      function onClose (result) {
        if (done) return;
        if (!result || result.isEnded !== true) { cancel('提前关闭，本次不计奖励'); return; }
        done = true;
        self.api('bonusfinish', { ticket: serverTicket, isEnded: '1' }, function (res) {
          finish();
          if (Number(res.error) === 0) {
            if (Number(res.credited) === 1) {
              wx.showToast({ title: '额外领取 ' + (Number(res.integral) || 0) + ' 金币', duration: 2200 });
              self.setData({ num: self.data.num + (Number(res.integral) || 0) });
            } else {
              wx.showModal({ title: '播放测试完成', content: '激励视频播放成功，后台暂未开放金币发放，本次不会增加余额。', showCancel: false });
            }
            self.reload();
          } else wx.showToast({ title: res.msg || '观看记录未确认', icon: 'none' });
        }, function (msg) { finish(); wx.showToast({ title: msg || '网络异常，请稍后再试', icon: 'none' }); });
      }
      try {
        ad = wx.createRewardedVideoAd({ adUnitId: id });
        ad.onClose(onClose);
        ad.onError(onError);
        ad.show().catch(function () { ad.load().then(function () { return ad.show(); }).catch(onError); });
      } catch (error) { onError(error); }
    }, function (msg) { self.setData({ bonusBusy: false }); wx.showToast({ title: msg, icon: 'none' }); });
  },
  onPrizeImageError: function (event) {
    var id = String((event && event.currentTarget && event.currentTarget.dataset || {}).id || '');
    if (!id) return;
    var items = (this.data.prize || []).map(function (item) {
      if (String(item.prize_id) === id) return Object.assign({}, item, { _imageFailed: true });
      return item;
    });
    this.setData({ prize: items, homeGoods:items.slice(0,4) });
  },
  onHomeBannerLoad: function () { this.setData({ homeBannerLoaded: true }); },
  onHomeBannerError: function (event) {
    this.setData({ homeBannerLoaded: false });
    // 不弹窗、不重试请求广告，避免干扰基础业务。开发者工具可查看错误码。
    if (typeof console !== 'undefined') console.warn('[Banner 首页] 广告暂不可用', (event.detail || {}).errCode);
  },
  onHomeBannerClose: function () { this.setData({ homeBannerLoaded: false }); },
  goGrowth: function () { wx.navigateTo({ url: '/sage_dksy/pages/growth/index' }); },
  goPrize: function () { wx.navigateTo({ url: '/sage_dksy/pages/prize/index' }); },
  goTrial: function () { wx.navigateTo({ url: '/sage_dksy/pages/trial/trial' }); },
  goPoints: function () { wx.navigateTo({ url: '/sage_dksy/pages/user/integral' }); },
  goUser: function () { wx.redirectTo({ url: '/sage_dksy/pages/user/index' }); },
  prize_show: function (ev) { wx.navigateTo({ url: '/sage_dksy/pages/prize/prize_show?id=' + Number(ev.currentTarget.dataset.id) }); },
  navtiaozhuan: function () { wx.showToast({ title: '请使用小程序内的功能', icon: 'none' }); },
  onShareAppMessage: function () { return { title: '每日签到，好礼慢慢攒', path: '/sage_dksy/pages/index/index' }; },
  onShareTimeline: function () { return { title: '每日签到 · 兑换好礼' }; }
});
