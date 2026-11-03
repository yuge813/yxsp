var app = getApp();
function number(value) { if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object'||String(value).trim()==='')return null;var n=Number(value);return Number.isFinite(n)&&n>=0?n:null; }
function yes(value) { return value===true||value===1||value==='1'; }
function flag(value) { return value===false||value===0||value==='0'?false:yes(value)?true:null; }
function ok(value) { return !!value&&(value.error===0||value.error==='0'); }
function object(value) { return !!value&&typeof value==='object'&&!Array.isArray(value); }
function challengeView(raw) {
  var c=object(raw)?raw:{}, joined=flag(c.joined), count=number(c.done_count);
  if(count!==null&&(count>7||Math.floor(count)!==count))count=null;
  var source=Array.isArray(c.days)?c.days:[];
  var days=Array.from({length:7},function(_,i){
    var d=source.find(function(x){return object(x)&&Number(x.index)===i+1;});
    if(!d&&object(source[i])&&source[i].index===undefined)d=source[i];
    var date=d&&typeof d.date==='string'?d.date:'', state=d?(yes(d.done)?'done':yes(d.today)?'today':'pending'):'unknown';
    return {index:i+1,date:date.replace(/^\d{4}[-/]/,''),state:state};
  });
  var milestones=[3,7].map(function(day){
    var claimed=yes(c['claimed'+day]), enabled=yes(c.reward_enabled)&&yes(c['day'+day+'_enabled']), amount=number(c[day===3?'three_points':'seven_points']);
    var canClaim=joined===true&&enabled&&!claimed&&amount!==null&&amount>0&&yes(c['can_claim'+day]);
    return {day:day,amount:amount,enabled:enabled,claimed:claimed,canClaim:canClaim,label:claimed?'已领取':canClaim?'领取礼遇':enabled?'等待达成':'当前未开放'};
  });
  return {known:joined!==null,joined:joined===true,doneCount:count,progress:count===null?0:count/7*100,days:days,milestones:milestones,startDay:c.start_day||'',endDay:c.end_day||'',canStart:joined!==null&&(joined?yes(c.can_start):flag(c.can_start)!==false)};
}
Page({
  data:{thisurl:'sage_dksy/pages/growth/index',loading:true,loaded:false,busy:false,message:'',actionUnknown:false,lastActionMessage:'',balance:null,challenge:{},growth:challengeView(null),friend:{paired:false,peer_days:null},wish:null,prizes:[],activities:[],inviteCode:'',incomingInvite:'',wishPercent:0,wishRemaining:null,missingWishImage:false},
  onLoad:function(options){this._alive=true;wx.showShareMenu({menus:['shareAppMessage','shareTimeline']});var invite=options&&options.invite;this.setData({incomingInvite:typeof invite==='string'?invite.slice(0,256):''});this.ensureLogin();},
  onShow:function(){if(!this.data.loading&&!this.data.busy)this.ensureLogin();},
  onUnload:function(){this._alive=false;this._loadSeq=(this._loadSeq||0)+1;},
  onPullDownRefresh:function(){if(this.data.busy){wx.stopPullDownRefresh();return;}this.ensureLogin();},
  ensureLogin:function(){
    if(!this._alive||this._connecting)return;
    if(wx.getStorageSync('sage_safe_token')){this.load();return;}
    var self=this;this._connecting=true;this.setData({loading:true,message:''});
    function failed(){self._connecting=false;if(self._alive){self.setData({loading:false,message:'暂时连接不上，请重新连接后查看成长进度。'});wx.stopPullDownRefresh();}}
    wx.login({success:function(login){if(!self._alive)return;if(!login.code){failed();return;}
      app.secureRequest({url:app.util.url('entry/wxapp/set')+'m=sage_dksy',method:'POST',data:{code:login.code},success:function(response){self._connecting=false;if(!self._alive)return;var status=number(response&&response.statusCode),body=response&&response.data;if(status===null||status<200||status>=300||!object(body)||typeof body.auth_token!=='string'||!body.auth_token.trim()){failed();return;}self.load();},fail:failed});
    },fail:failed});
  },
  api:function(name,data,callback){
    var self=this;app.secureRequest({url:app.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:15000,
      success:function(response){if(!self._alive)return;var body=response&&response.data,status=number(response&&response.statusCode),error=object(body)?number(body.error):null;
        if(status===null||status<200||status>=300||error===null||Math.floor(error)!==error){callback({error:1,_uncertain:true});return;}
        if(error===401&&typeof app.clearAuth==='function')app.clearAuth();callback(body);
      },fail:function(){if(self._alive)callback({error:1,_uncertain:true});}});
  },
  load:function(){
    if(!this._alive||this.data.busy)return;
    var self=this,seq=this._loadSeq=(this._loadSeq||0)+1;this.setData({loading:true,message:''});
    this.api('growthstatus',{},function(res){if(!self._alive||self._loadSeq!==seq)return;wx.stopPullDownRefresh();
      if(!ok(res)){self.setData({loading:false,message:'成长进度暂未更新，请重试。已有进度会保留。'});return;}
      var wish=object(res.wish)?Object.assign({},res.wish):null,bal=number(res.balance),cost=wish?number(wish.prize_integral):null;
      if(wish)wish._cost=cost;
      var prizes=Array.isArray(res.prizes)?res.prizes.filter(object).map(function(p){return Object.assign({},p,{_cost:number(p.prize_integral)});}):[];
      var friend=object(res.friend)?Object.assign({},res.friend):{};friend.paired=yes(friend.paired);friend.peer_days=number(friend.peer_days);
      self.setData({loading:false,loaded:true,challenge:object(res.challenge)?res.challenge:{},growth:challengeView(res.challenge),friend:friend,wish:wish,prizes:prizes,activities:Array.isArray(res.activities)?res.activities.filter(object):[],balance:bal,wishRemaining:bal===null||cost===null?null:Math.max(0,cost-bal),wishPercent:bal!==null&&cost!==null&&cost>0?Math.min(100,Math.floor(bal/cost*100)):0,missingWishImage:false,actionUnknown:false});
    });
  },
  available:function(){return this._alive&&this.data.loaded&&!this.data.loading&&!this.data.busy&&!this.data.message&&!this.data.actionUnknown;},
  actionResult:function(res,message){
    this.setData({busy:false});
    if(ok(res)){this.setData({lastActionMessage:message});wx.showToast({title:message,icon:'success'});this.load();return;}
    if(res&&res._uncertain){this.setData({actionUnknown:true,message:'提交结果尚未确认，请先刷新成长进度，再决定下一步。'});wx.showToast({title:'请先刷新核对结果',icon:'none'});return;}
    wx.showToast({title:'当前操作未完成，请刷新查看实际状态。',icon:'none',duration:2200});
  },
  join:function(){if(!this.available()||!this.data.growth.canStart)return;var self=this;this.setData({busy:true,lastActionMessage:''});this.api('growthjoin',{},function(res){self.actionResult(res,'7天计划已开启');});},
  claim:function(ev){
    if(!this.available())return;var day=Number(ev&&ev.currentTarget&&ev.currentTarget.dataset.milestone),milestone=this.data.growth.milestones.find(function(x){return x.day===day;});
    if(!milestone||!milestone.canClaim)return;var self=this;this.setData({busy:true,lastActionMessage:''});
    this.api('growthclaim',{milestone:day},function(res){var points=number(res&&res.points);self.actionResult(res,points===null||points===0?'领取结果已确认，请核对明细':'礼遇已到账 +'+points+' 金币');});
  },
  onWishImageError:function(){this.setData({missingWishImage:true});},
  onChoiceImageError:function(e){var id=Number(e.currentTarget.dataset.id);this.setData({prizes:this.data.prizes.map(function(p){return Number(p.prize_id)===id?Object.assign({},p,{_missingImage:true}):p;})});},
  chooseWish:function(ev){var id=Number(ev.currentTarget.dataset.id);if(!this.available()||!this.data.prizes.some(function(p){return Number(p.prize_id)===id&&id>0;}))return;var self=this;this.setData({busy:true});this.api('growthwish',{prize_id:id},function(res){self.actionResult(res,'心愿已保存');});},
  makeInvite:function(){if(!this.available())return;var self=this;this.setData({busy:true});this.api('growthinvite',{},function(res){self.setData({busy:false});if(ok(res)&&typeof res.code==='string'&&res.code.trim()){self.setData({inviteCode:res.code.slice(0,256)});}else wx.showToast({title:'邀请暂未生成，请重试',icon:'none'});});},
  acceptInvite:function(){if(!this.available()||!this.data.incomingInvite||this.data.friend.paired)return;var self=this;this.setData({busy:true});this.api('growthpair',{action:'accept',invite:this.data.incomingInvite},function(res){if(ok(res))self.setData({incomingInvite:''});self.actionResult(res,'同行已建立');});},
  dismissInvite:function(){this.setData({incomingInvite:''});},
  leavePair:function(){if(!this.available()||!this.data.friend.paired)return;var self=this;wx.showModal({title:'退出好友同行',content:'退出后，双方不再共享近7天签到进度；个人签到与奖励不受影响。',success:function(result){if(!result.confirm||!self.available())return;self.setData({busy:true});self.api('growthpair',{action:'leave'},function(res){self.actionResult(res,'已退出同行');});}});},
  onShareAppMessage:function(){return {title:'元享7天成长礼遇，一起给坚持一点期待',path:'/sage_dksy/pages/growth/index'+(this.data.inviteCode?'?invite='+encodeURIComponent(this.data.inviteCode):'')};},
  onShareTimeline:function(){return {title:'元享7天成长礼遇',query:'source=timeline'};},
  goSign:function(){wx.navigateTo({url:'/sage_dksy/pages/v14/sign/index'});},
  goRules:function(){wx.navigateTo({url:'/sage_dksy/pages/v14/rewards/index?category=growth'});},
  goLedger:function(){wx.navigateTo({url:'/sage_dksy/pages/user/integral'});},
  goTrial:function(ev){var id=Number(ev.currentTarget.dataset.id);if(id>0)wx.navigateTo({url:'/sage_dksy/pages/trial/trial_show?id='+id});},
  goPrize:function(ev){var id=Number(ev.currentTarget.dataset.id);if(id>0)wx.navigateTo({url:'/sage_dksy/pages/prize/prize_show?id='+id});},
  goHome:function(){wx.redirectTo({url:'/sage_dksy/pages/index/index'});}
});
