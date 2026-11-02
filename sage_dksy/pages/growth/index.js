var app = getApp();
Page({
  data: {
    thisurl: 'sage_dksy/pages/growth/index', loading: true, loaded:false, busy: false, message: '', joined: false, balance: null,
    challenge: { joined: 0, days: [], done_count: 0 },
    friend: { paired: 0, peer_days: 0 },
    wish: null, prizes: [], activities: [], inviteCode: '', incomingInvite: '',
    wishPercent: 0, wishRemaining: 0, missingWishImage: false,
    signRewards: Array.from({length:7},function(_,i){return {day:i+1,amount:null};})
  },
  onLoad: function (options) {
    this._alive=true;wx.showShareMenu({menus:['shareAppMessage','shareTimeline']});
    this.setData({ incomingInvite: (options && options.invite) || '' });
    this.ensureLogin();
  },
  onShow: function () { if (!this.data.loading) this.load(); },
  onUnload:function(){this._alive=false;this._loadSeq=(this._loadSeq||0)+1;},
  onPullDownRefresh:function(){this.load();},
  ensureLogin: function () {
    var self = this;
    if (wx.getStorageSync('sage_safe_token')) { this.load(); return; }
    wx.login({ success: function (res) {
      if (!res.code) { self.setData({ loading: false, message: '微信登录暂不可用' }); return; }
      app.secureRequest({ url: app.util.url('entry/wxapp/set')+'m=sage_dksy', method: 'POST',
        data: { code: res.code },
        success: function (resp) {
          if (!resp.data || !resp.data.auth_token) { self.setData({loading:false,message:'登录失败，请返回首页后重试'}); return; }
          self.load();
        }, fail: function () { self.setData({loading:false,message:'暂时连接不上，请稍后重试'}); }
      });
    }, fail: function () { self.setData({loading:false,message:'微信登录暂不可用'}); } });
  },
  api: function (name, data, callback) {
    var self=this;app.secureRequest({
      url: app.util.url('entry/wxapp/'+name)+'m=sage_dksy',
      method: 'POST', data: data || {}, timeout: 15000,
      success: function (res) {
        if(!self._alive)return;var body = res && res.data;
        if (!res || res.statusCode < 200 || res.statusCode >= 300 || !body || typeof body !== 'object') {
          callback({error:1,msg:'服务暂不可用，请稍后重试'}); return;
        }
        if (Number(body.error) === 401) app.clearAuth();
        callback(body);
      }, fail: function () { if(self._alive)callback({error:1,msg:'网络暂不可用，请稍后再试'}); }
    });
  },
  load: function () {
    var self = this;
    var seq=this._loadSeq=(this._loadSeq||0)+1;this.setData({ loading: true, message: '' });
    this.api('growthstatus', {}, function (res) {
      if(!self._alive||self._loadSeq!==seq)return;
      wx.stopPullDownRefresh();
      if (Number(res.error) !== 0) {
        self.setData({ loading:false, message:'成长信息暂时没有加载出来，请重试' }); return;
      }
      var rewardValues = Array.isArray(res.sign_rewards) && res.sign_rewards.length === 7 ? res.sign_rewards : [];
      if (!rewardValues.length) {
        try { var cache = wx.getStorageSync('dksy_v7_sign_settings') || {};
          rewardValues = [cache.day1,cache.day2,cache.day3,cache.day4,cache.day5,cache.day6,cache.day7]; }
        catch (_) { rewardValues = []; }
      }
      var rewards = Array.from({length:7}, function(_,i) {
        var v=rewardValues[i], n=(v===null||v===undefined||v==='')?NaN:Number(v);
        return {day:i+1,amount:Number.isFinite(n) && n>=0?Math.floor(n):null};
      });
      var wish=res.wish || null, bal=(res.balance!==null&&res.balance!==undefined&&res.balance!==''&&Number.isFinite(Number(res.balance))&&Number(res.balance)>=0)?Number(res.balance):null, need=wish?Math.max(0,Number(wish.prize_integral)||0):0;
      var remaining=bal===null?null:Math.max(0,need-bal);
      var percent=bal!==null&&need>0?Math.min(100,Math.floor(bal/need*100)):0;
      self.setData({ loading:false, loaded:true, challenge:res.challenge||{joined:0,days:[]},
        friend:res.friend||{paired:0},wish:wish,prizes:res.prizes||[],activities:res.activities||[],
        balance:bal, signRewards:rewards, wishRemaining:remaining,wishPercent:percent, missingWishImage: false });
    });
  },
  join: function () {
    if (this.data.busy) return;
    var self=this;this.setData({busy:true});
    this.api('growthjoin',{},function(res){self.setData({busy:false});
      if (Number(res.error)===0){wx.showToast({title:'7天计划已开启'});self.load();}
      else wx.showToast({title:res.msg||'稍后重试',icon:'none'});
    });
  },
  claim: function (ev) {
    if (this.data.busy) return;
    var milestone=Number(ev.currentTarget.dataset.milestone),self=this;
    if (milestone!==3 && milestone!==7)return;
    this.setData({busy:true});
    this.api('growthclaim',{milestone:milestone},function(res){self.setData({busy:false});
      if(Number(res.error)===0){wx.showToast({title:'领取成功 +'+res.points});self.load();}
      else wx.showToast({title:res.msg||'暂不可领取',icon:'none',duration:2200});
    });
  },
  onWishImageError: function(){this.setData({missingWishImage:true});},
  onChoiceImageError: function(e){
    var id=Number(e.currentTarget.dataset.id);if(!id)return;
    var arr=(this.data.prizes||[]).map(function(p){return Number(p.prize_id)===id?Object.assign({},p,{_missingImage:true}):p;});
    this.setData({prizes:arr});
  },
  chooseWish: function(ev){
    var self=this,id=Number(ev.currentTarget.dataset.id);
    if(!id||this.data.busy)return;
    this.setData({busy:true});
    this.api('growthwish',{prize_id:id},function(res){self.setData({busy:false});
      if(Number(res.error)===0){wx.showToast({title:'心愿已保存'});self.load();}
      else wx.showToast({title:res.msg||'保存失败',icon:'none'});
    });
  },
  makeInvite: function(){
    var self=this;if(this.data.busy)return;this.setData({busy:true});
    this.api('growthinvite',{},function(res){self.setData({busy:false});
      if(Number(res.error)===0)self.setData({inviteCode:res.code});
      else wx.showToast({title:res.msg||'生成失败',icon:'none'});
    });
  },
  acceptInvite: function(){
    if(this.data.busy||!this.data.incomingInvite)return;
    var self=this;this.setData({busy:true});
    this.api('growthpair',{action:'accept',invite:this.data.incomingInvite},function(res){self.setData({busy:false});
      if(Number(res.error)===0){self.setData({incomingInvite:''});wx.showToast({title:'同行已建立'});self.load();}
      else wx.showToast({title:res.msg||'加入失败',icon:'none',duration:2500});
    });
  },
  dismissInvite: function(){this.setData({incomingInvite:''});},
  leavePair: function(){
    var self=this;
    wx.showModal({title:'退出好友同行',content:'退出后双方将不再看到对方的签到进度，个人签到与奖励不受影响。',
      success:function(x){if(!x.confirm)return;self.api('growthpair',{action:'leave'},function(res){
        wx.showToast({title:res.msg||'已退出',icon:Number(res.error)===0?'success':'none'});self.load();
      });}
    });
  },
  onShareAppMessage: function(){
    return {title:'一起坚持7天，发现每日好礼',
      path:'/sage_dksy/pages/growth/index'+(this.data.inviteCode?'?invite='+this.data.inviteCode:''),
    };
  },
  onShareTimeline: function(){return {title:'元享7天成长礼遇 · 每日好礼',query:'source=timeline'};},
  goTrial: function(ev){wx.navigateTo({url:'/sage_dksy/pages/trial/trial_show?id='+Number(ev.currentTarget.dataset.id)});},
  goPrize: function(ev){wx.navigateTo({url:'/sage_dksy/pages/prize/prize_show?id='+Number(ev.currentTarget.dataset.id)});},
  goHome: function(){wx.redirectTo({url:'/sage_dksy/pages/index/index'});}
});
