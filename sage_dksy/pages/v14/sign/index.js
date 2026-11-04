var app=getApp();
function good(r){return !!r&&typeof r==='object'&&!Array.isArray(r)&&(r.error===undefined||Number(r.error)===0);}
function int(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);return isFinite(n)&&n>=0?Math.floor(n):null;}
function daysFrom(cfg,streak,signed){
  var active=signed?((Math.max(1,streak)-1)%7)+1:((Math.max(0,streak))%7)+1;
  return [1,2,3,4,5,6,7].map(function(i){return {day:i,amount:int(cfg&&cfg['day'+i]),state:i<active?'done':i===active?(signed?'done':'today'):'future'};});
}
function message(raw){var text=String(raw||'');return text&&!/PHP|SQL|JSON|https?:|微擎|auth_token|补丁/i.test(text)?text.slice(0,40):'签到未成功，请稍后重试';}

function recordDate(value){
 var raw=String(value===null||value===undefined?'':value).trim(),date;
 if(/^(?:\d{10}|\d{13})$/.test(raw)){var n=Number(raw);date=new Date((raw.length===10?n*1000:n)+8*3600000);if(!isNaN(date.getTime()))return date.getUTCFullYear()+'-'+String(date.getUTCMonth()+1).padStart(2,'0')+'-'+String(date.getUTCDate()).padStart(2,'0');}
 var parts=raw.match(/(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})/);return parts?parts[1]+'-'+parts[2].padStart(2,'0')+'-'+parts[3].padStart(2,'0'):'';
}
function signRecords(rows,page){return (Array.isArray(rows)?rows:[]).filter(function(row){return row&&typeof row==='object'&&!Array.isArray(row)&&Number(row.static)===1&&/签到/.test(String(row.title||row.remark||row.remarks||row.description||row.content||''));}).map(function(row,index){var amount=int(row.num),raw=row.createtime||row.addtime||row.create_time||'';return {key:String(row.id||row.log_id||('page'+page+'_'+index)),title:String(row.title||row.remark||row.remarks||'每日签到'),time:String(raw||'时间未记录'),amount:amount,date:recordDate(raw)};});}
function calendarFor(rows){var now=new Date(Date.now()+8*3600000),year=now.getUTCFullYear(),month=now.getUTCMonth(),monthKey=year+'-'+String(month+1).padStart(2,'0'),first=new Date(Date.UTC(year,month,1)).getUTCDay(),offset=(first+6)%7,total=new Date(Date.UTC(year,month+1,0)).getUTCDate(),keys={};(rows||[]).forEach(function(r){if(r.date)keys[r.date]=true;});var days=[];for(var i=0;i<offset;i++)days.push({key:'blank'+i,label:'',recorded:false});for(var d=1;d<=total;d++)days.push({key:monthKey+'-'+String(d).padStart(2,'0'),label:d,recorded:!!keys[monthKey+'-'+String(d).padStart(2,'0')]});return {label:year+' 年 '+(month+1)+' 月',days:days};}

Page({
 data:{thisurl:'sage_dksy/pages/v14/sign/index',busy:false,loading:true,statusReady:false,configReady:false,todaySigned:false,streak:0,currentDay:1,todayReward:null,days:daysFrom({},0,false),error:'',balance:null,justSigned:false,lastReward:null,referralWelcome:null,nextDayNumber:null,nextDayReward:null,recordsVisible:false,recordRows:[],recordLoading:false,recordError:'',recordPage:0,recordHasMore:true,recordOpenid:'',recordMonth:'',calendarDays:[]},
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
    self.setData({loading:false,statusReady:true,error:'',streak:streak,todaySigned:signed,currentDay:day,days:days,todayReward:days[day-1].amount,configReady:days.every(function(d){return d.amount!==null;}),nextDayNumber:signed?(day%7)+1:null,nextDayReward:signed?days[day%7].amount:null});
  });}
  wx.login({success:function(auth){if(!auth.code){fetchInfo({});return;}
    self.api('set',{code:auth.code},function(r){
      if(good(r)&&r.auth_token){
        if(r.setinfo&&typeof r.setinfo==='object'){cfg=r.setinfo;try{wx.setStorageSync('dksy_v7_sign_settings',cfg);}catch(_){}}
        if(r.userinfo)self.setData({balance:int(r.userinfo.num)});if(r.openid)self.setData({recordOpenid:r.openid});
      }
      fetchInfo(good(r)&&r.auth_token&&r.setinfo&&typeof r.setinfo==='object'?cfg:{});
    });},fail:function(){fetchInfo({});}});
 },
 sign:function(){if(this.data.busy||this.data.loading||this.data.todaySigned||!this.data.statusReady)return;
  var self=this;this.setData({busy:true});this.api('qian',{},function(r){
    self.setData({busy:false});var amount=int(r&&r.num);
    if(good(r)&&amount!==null){
      var rawWelcome=r.referral&&r.referral.invitee_coins;
      var welcome=r.referral&&r.referral.invitee_paid===true&&(typeof rawWelcome==='number'||typeof rawWelcome==='string')&&String(rawWelcome).trim()!==''&&Number.isSafeInteger(Number(rawWelcome))&&Number(rawWelcome)>0&&Number(rawWelcome)<=500?Number(rawWelcome):null;
      self.setData({justSigned:true,lastReward:amount,referralWelcome:welcome,todaySigned:true,balance:null});
      wx.showToast({title:'签到成功 +'+amount+'金币',icon:'none'});self.load();
    }else{wx.showToast({title:message(r&&r.msg),icon:'none'});self.load();}
  });},
 retry:function(){this.load();},
 openRecords:function(){this.setData({recordsVisible:true});wx.setNavigationBarTitle({title:'签到记录'});this.loadRecords(true);},
 closeRecords:function(){this.setData({recordsVisible:false});wx.setNavigationBarTitle({title:this.data.justSigned?'签到成功':'每日签到'});},
 loadRecords:function(reset){
  if(this.data.recordLoading||!reset&&!this.data.recordHasMore)return;var self=this,page=reset?1:this.data.recordPage+1;
  this.setData({recordLoading:true,recordError:''});
  function request(identity){self.api('numlog',Object.assign({},identity,{pages:page}),function(r){
    if(!good(r)||!Array.isArray(r.num_log)){self.setData({recordLoading:false,recordError:'签到记录暂未加载出来，请重试'});return;}
    var list=(reset?[]:self.data.recordRows).concat(signRecords(r.num_log,page)),calendar=calendarFor(list);
    self.setData({recordRows:list,recordLoading:false,recordPage:page,recordOpenid:r.openid||self.data.recordOpenid,recordHasMore:r.num_log.length>0&&(r.page===undefined||Number(r.page)===1),recordMonth:calendar.label,calendarDays:calendar.days});
  });}
  if(!reset&&this.data.recordOpenid){request({openid:this.data.recordOpenid});return;}
  wx.login({success:function(r){if(r.code)request({code:r.code});else self.setData({recordLoading:false,recordError:'账号连接暂未完成，请重试'});},fail:function(){self.setData({recordLoading:false,recordError:'网络暂时没有连接上，请重试'});}});
 },
 retryRecords:function(){this.loadRecords(true);},
 moreRecords:function(){this.loadRecords(false);},
 goReminders:function(){wx.navigateTo({url:'/sage_dksy/pages/v14/reminders/index'});},
 goLedger:function(){wx.navigateTo({url:'/sage_dksy/pages/user/integral'});},
 goReferralRecords:function(){wx.navigateTo({url:'/sage_dksy/pages/v132grow/index?tab=rewards'});},
 goGrowth:function(){wx.navigateTo({url:'/sage_dksy/pages/growth/index'});},
 goHome:function(){wx.redirectTo({url:'/sage_dksy/pages/index/index'});}
});
