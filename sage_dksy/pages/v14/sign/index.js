var app=getApp();
function good(r){return !!r&&typeof r==='object'&&!Array.isArray(r)&&(r.error===undefined||Number(r.error)===0);}
function int(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);return isFinite(n)&&n>=0?Math.floor(n):null;}
function daysFrom(cfg,streak,signed){
  var active=signed?((Math.max(1,streak)-1)%7)+1:((Math.max(0,streak))%7)+1;
  return [1,2,3,4,5,6,7].map(function(i){return {day:i,amount:int(cfg&&cfg['day'+i]),state:i<active?'done':i===active?(signed?'done':'today'):'future'};});
}
function message(raw){var text=String(raw||'');return text&&!/PHP|SQL|JSON|https?:|微擎|auth_token|补丁/i.test(text)?text.slice(0,40):'签到未成功，请稍后重试';}
Page({
 data:{thisurl:'sage_dksy/pages/v14/sign/index',busy:false,loading:true,statusReady:false,configReady:false,todaySigned:false,streak:0,currentDay:1,todayReward:null,days:daysFrom({},0,false),error:'',balance:null,justSigned:false,lastReward:null},
 onLoad:function(){this.load();},onShow:function(){if(this._shown)this.load();this._shown=true;},
 onPullDownRefresh:function(){this.load();},
 api:function(name,data,done){app.secureRequest({url:app.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:15000,success:function(x){done(x&&(!x.statusCode||x.statusCode>=200&&x.statusCode<300)&&x.data&&typeof x.data==='object'?x.data:null);},fail:function(){done(null);}});},
 load:function(){
  if(this._loading)return;this._loading=true;var self=this,cfg={};try{cfg=wx.getStorageSync('dksy_v7_sign_settings')||{};}catch(_){}
  this.setData({loading:true,error:'',configReady:[1,2,3,4,5,6,7].every(function(d){return int(cfg['day'+d])!==null;})});
  function finish(){self._loading=false;wx.stopPullDownRefresh();}
  function fetchInfo(settings){self.api('qianinfo',{},function(r){
    finish();if(!good(r)||r.qd===undefined){self.setData({loading:false,statusReady:false,error:'签到状态暂未同步，请检查网络后重试'});return;}
    var streak=Math.max(0,Number(r.qd)||0),signed=Number(r.today_qian)===1,days=daysFrom(settings,streak,signed),day=signed?((Math.max(1,streak)-1)%7)+1:(streak%7)+1;
    self.setData({loading:false,statusReady:true,error:'',streak:streak,todaySigned:signed,currentDay:day,days:days,todayReward:days[day-1].amount,configReady:days.every(function(d){return d.amount!==null;})});
  });}
  wx.login({success:function(auth){if(!auth.code){fetchInfo(cfg);return;}
    self.api('set',{code:auth.code},function(r){
      if(good(r)&&r.auth_token){
        if(r.setinfo&&typeof r.setinfo==='object'){cfg=r.setinfo;try{wx.setStorageSync('dksy_v7_sign_settings',cfg);}catch(_){}}
        if(r.userinfo)self.setData({balance:int(r.userinfo.num)});
      }
      fetchInfo(cfg);
    });},fail:function(){fetchInfo(cfg);}});
 },
 sign:function(){if(this.data.busy||this.data.loading||this.data.todaySigned||!this.data.statusReady)return;
  var self=this;this.setData({busy:true});this.api('qian',{},function(r){
    self.setData({busy:false});var amount=int(r&&r.num);
    if(good(r)&&amount!==null){
      self.setData({justSigned:true,lastReward:amount,todaySigned:true,balance:null});
      wx.showToast({title:'签到成功 +'+amount+'金币',icon:'none'});self.load();
    }else{wx.showToast({title:message(r&&r.msg),icon:'none'});self.load();}
  });},
 retry:function(){this.load();},
 goReminders:function(){wx.navigateTo({url:'/sage_dksy/pages/v14/reminders/index'});},
 goLedger:function(){wx.navigateTo({url:'/sage_dksy/pages/user/integral'});},
 goGrowth:function(){wx.navigateTo({url:'/sage_dksy/pages/growth/index'});},
 goHome:function(){wx.redirectTo({url:'/sage_dksy/pages/index/index'});}
});
