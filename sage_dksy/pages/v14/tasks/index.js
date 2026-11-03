var reader = require('../../../utils/v12read.js');
var app = getApp();
function number(value) { if (value === null || value === undefined || value === '') return null; var n = Number(value); return isFinite(n) && n >= 0 ? Math.floor(n) : null; }
function countdown(value) { value = Math.max(0, Math.ceil(value)); return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0'); }
function taskView(raw) {
  raw = raw || {};
  var coins = number(raw.coins), left = number(raw.remaining), now = Number(raw.now) || Math.floor(Date.now()/1000), next = Number(raw.next_at) || 0;
  var base = { coins: coins, remaining: left, status: '状态暂未同步', available: false, state: 'unavailable', button: '暂不可用', unit: '', hint: '请刷新后再参与', until: 0 };
  if ((raw.error !== undefined && Number(raw.error) !== 0) || Number(raw.logged_in) !== 1) return base;
  base.unit = typeof raw.ad_unit_id === 'string' ? raw.ad_unit_id : '';
  var mode = String(raw.mode || 'manual_verified');
  if (Number(raw.reward_enabled) !== 1 || mode === 'manual_verified') return Object.assign(base, {state:'disabled',status:'当前暂未开放',button:'暂未开放',hint:'不影响正常签到与免费阅读'});
  if (/^native_auto_\d{10}$/.test(mode) && (coins === null || coins < 1 || coins > 2 || Number(raw.daily_limit) > 10 || Number(raw.cooldown_sec || 600) < 600)) return Object.assign(base, {state:'disabled',status:'奖励暂不可用',hint:'可以继续免费阅读'});
  if (raw.pending_task) return Object.assign(base, {state:'pending',status:'上次奖励处理中',button:'处理中',hint:'请稍后刷新，到账以金币明细为准'});
  if (left === null) return base;
  if (left === 0) return Object.assign(base, {state:'limit',status:'今日次数已用完',button:'今日已完成',hint:'明天再来看看'});
  if (Number(raw.budget_blocked) === 1) return Object.assign(base, {state:'disabled',status:'今日金币预算已满',button:'预算已满',hint:'次数独立统计，当日金币预算可能共用'});
  if (next > now) return Object.assign(base, {state:'cool',status:'冷却中 · '+countdown(next-now),button:countdown(next-now),hint:'时间到后重新核对可参与状态',until:Date.now()+(next-now)*1000});
  if (!/^adunit-[A-Za-z0-9]{8,80}$/.test(base.unit)) return Object.assign(base,{status:'视频暂时不可用',hint:'请稍后刷新'});
  return Object.assign(base, {state:'ready',status:'可以参与',available:true,button:'自愿观看',hint:'完整观看后按当前规则领取，提前关闭不发放本次奖励'});
}
Page({
  data: { thisurl:'sage_dksy/pages/v14/tasks/index', loading:true, loaded:false, home:taskView({error:1}), read:taskView({error:1}), error:'', sessionReady:false, sessionLoading:false, balance:null, rewardViewMode:'tasks', rewardCoins:null, rewardTaskId:'', rewardMessage:'', watching:false, signLoading:true, signAvailable:false, signed:false, signReward:null, signStreak:0 },
  onLoad:function(query){var self=this;this.rewardControl={refresh:function(){return self.refreshTodayTask();}};this.connect().then(function(){if(!self._disposed&&query&&query.view==='offer')self.showOffer();});},
  onShow:function(){this._visible=true;if(this._shown){this.connect();}this._shown=true;this.startTimer();},
  onHide:function(){this._visible=false;this.stopTimer();if(this._yxRewardAd)this._yxRewardAd.leave();},
  onUnload:function(){this._disposed=true;this.stopTimer();if(this._yxRewardAd)this._yxRewardAd.destroy();},
  onPullDownRefresh:function(){this.retry().then(function(){wx.stopPullDownRefresh();});},
  startTimer:function(){var self=this;this.stopTimer();this._timer=setInterval(function(){
    if(!self._visible||self._disposed)return;
    var changes={},needsRefresh=false;
    ['home','read'].forEach(function(key){var task=self.data[key];if(task.state==='cool'&&task.until){var left=Math.ceil((task.until-Date.now())/1000);if(left<=0)needsRefresh=true;else{changes[key+'.button']=countdown(left);changes[key+'.status']='冷却中 · '+countdown(left);}}});
    changes.watching=!!(self._yxRewardAd&&self._yxRewardAd.phase!=='idle');self.setData(changes);
    if(needsRefresh&&!self._fetching)self.load(true);
  },1000);},
  stopTimer:function(){if(this._timer)clearInterval(this._timer);this._timer=null;},
  ensureSession:function(force){
    if(this._connecting)return this._connecting;
    var self=this,token='';try{token=wx.getStorageSync('sage_safe_token')||'';}catch(_){}
    if(token&&!force){this.setData({sessionReady:true});return Promise.resolve(true);}
    this.setData({sessionLoading:true,sessionReady:false});
    this._connecting=new Promise(function(resolve){wx.login({success:function(auth){
      if(!auth.code){resolve(false);return;}
      app.secureRequest({url:app.util.url('entry/wxapp/set')+'m=sage_dksy',method:'POST',data:{code:auth.code},timeout:15000,success:function(res){
        var r=res&&res.data;if(!res||res.statusCode&&!(res.statusCode>=200&&res.statusCode<300)||!r||typeof r!=='object'||Array.isArray(r)||Number(r.error)||!r.auth_token){resolve(false);return;}
        if(r.userinfo)self.setData({balance:number(r.userinfo.num)});
        if(r.openid)wx.setStorageSync('openid',r.openid);
        if(r.setinfo&&typeof r.setinfo==='object')wx.setStorageSync('dksy_v7_sign_settings',r.setinfo);
        resolve(true);
      },fail:function(){resolve(false);}});
    },fail:function(){resolve(false);}});}).then(function(ok){self._connecting=null;if(!self._disposed)self.setData({sessionLoading:false,sessionReady:ok});return ok;});return this._connecting;
  },
  connect:function(force){if(!force)this._reauthed=false;var self=this;return this.ensureSession(force).then(function(ok){if(self._disposed)return;if(ok){self.loadSign();self.refreshWallet();return self.load();}self.setData({loading:false,loaded:false,error:'账号暂时没有连接上，请检查网络后重试'});});},
  refreshWallet:function(){
    if(this._walletPromise)return this._walletPromise;var self=this;
    this._walletPromise=new Promise(function(resolve){wx.login({success:function(auth){if(!auth.code){resolve();return;}
      app.secureRequest({url:app.util.url('entry/wxapp/set')+'m=sage_dksy',method:'POST',data:{code:auth.code},timeout:15000,success:function(res){var r=res&&res.data;
        if(res&&(!res.statusCode||res.statusCode>=200&&res.statusCode<300)&&r&&typeof r==='object'&&!Array.isArray(r)&&!Number(r.error)&&r.userinfo&&!self._disposed)self.setData({balance:number(r.userinfo.num)});
        resolve();},fail:function(){resolve();}});
    },fail:function(){resolve();}});}).then(function(){self._walletPromise=null;});return this._walletPromise;
  },
  setRewardView:function(mode){this.setData({rewardViewMode:mode});var titles={tasks:'赚金币',offer:'广告奖励',paid:'奖励到账',unpaid:'观看未完成',cool:'广告奖励冷却中',pending:'奖励处理中',error:'广告暂不可用'};wx.setNavigationBarTitle({title:titles[mode]||'赚金币'});},
  showOffer:function(){this.setRewardView(this.data.home.state==='cool'?'cool':'offer');},
  closeRewardView:function(){this.setRewardView('tasks');this.load(true);},
  onRewardResult:function(result){
    if(this._disposed||!result||['paid','unpaid','pending','error'].indexOf(result.state)<0)return;
    var amount=number(result.coins),state=result.state;
    if(state==='paid'&&amount===null)state='pending';
    this.setData({rewardCoins:state==='paid'?amount:null,rewardTaskId:String(result.taskId||''),rewardMessage:String(result.message||''),watching:false});
    this.setRewardView(state);this.refreshWallet();
  },
  retryReward:function(){var self=this;return this.load(true).then(function(){self.showOffer();});},
  goGifts:function(){wx.redirectTo({url:'/sage_dksy/pages/prize/index'});},
  loadSign:function(){var self=this;this.setData({signLoading:true});app.secureRequest({url:app.util.url('entry/wxapp/qianinfo')+'m=sage_dksy',method:'POST',timeout:15000,success:function(res){
    var r=res&&res.data;if(!res||res.statusCode&&!(res.statusCode>=200&&res.statusCode<300)||!r||typeof r!=='object'||Array.isArray(r)||Number(r.error)||r.qd===undefined){self.setData({signLoading:false,signAvailable:false});return;}
    var streak=Math.max(0,Number(r.qd)||0),signed=Number(r.today_qian)===1,day=signed?((Math.max(1,streak)-1)%7)+1:(streak%7)+1,cfg={};try{cfg=wx.getStorageSync('dksy_v7_sign_settings')||{};}catch(_){}
    self.setData({signLoading:false,signAvailable:true,signed:signed,signStreak:streak,signReward:number(cfg['day'+day])});
  },fail:function(){self.setData({signLoading:false,signAvailable:false});}});},
  load:function(quiet){
    if(this._fetching)return this._fetching;var self=this;this.setData({loading:!quiet,error:''});
    function get(channel){return reader.call('v12status',{channel:channel}).then(function(r){return {ok:!!r&&!Number(r.error),raw:r};}).catch(function(error){return {ok:false,needsAuth:/登录|会话|身份|认证|401/.test(String(error||''))};});}
    this._fetching=Promise.all([get('home'),get('read')]).then(function(results){
      if(self._disposed)return;
      if(results.some(function(r){return r.needsAuth||r.raw&&Number(r.raw.logged_in)===0;})&&!self._reauthed){self._reauthed=true;self._fetching=null;return self.connect(true);}
      var errors=0,changes={loading:false,loaded:true};
      ['home','read'].forEach(function(key,i){if(results[i].ok)changes[key]=taskView(results[i].raw);else {errors++;changes[key]=taskView({error:1});}});
      changes.error=errors?'部分任务状态暂未同步，请检查网络后重试':'';self.setData(changes);
    }).then(function(){self._fetching=null;},function(){self._fetching=null;if(!self._disposed)self.setData({loading:false,error:'任务暂未加载出来，请重试'});});return this._fetching;
  },
  refreshTodayTask:function(){this.refreshWallet();return this.load(true);},
  retry:function(){this._reauthed=false;if(!this.data.sessionReady)return this.connect(true);this.loadSign();return this.load();},
  watchHome:function(){
    if(this.data.watching||!this.data.home.available)return;var self=this;this.setData({watching:true});
    return reader.call('v12status',{channel:'home'}).then(function(r){var task=taskView(r);self.setData({home:task});
      if(!task.available){self.setData({watching:false});wx.showToast({title:task.status,icon:'none'});return;}
      if(self._yxRewardAd&&self._yxRewardAd.unit&&self._yxRewardAd.unit!==task.unit){self._yxRewardAd.destroy();self._yxRewardAd=null;}
      if(!self._yxRewardAd)self._yxRewardAd=require('../../../utils/v12234_reward_inline.js').create(self,'home');
      return self._yxRewardAd.play(task.unit);
    }).catch(function(){wx.showToast({title:'视频状态暂未同步，请重试',icon:'none'});self.load(true);}).then(function(){if(!self._disposed)self.setData({watching:!!(self._yxRewardAd&&self._yxRewardAd.phase!=='idle')});});
  },
  goHome:function(){wx.redirectTo({url:'/sage_dksy/pages/index/index'});},
  goRead:function(){wx.navigateTo({url:'/sage_dksy/pages/v12/list'});},
  goSign:function(){wx.navigateTo({url:'/sage_dksy/pages/v14/sign/index'});},
  goInvite:function(){wx.navigateTo({url:'/sage_dksy/pages/v132grow/index'});},
  goLedger:function(){wx.navigateTo({url:'/sage_dksy/pages/user/integral'});}
});
