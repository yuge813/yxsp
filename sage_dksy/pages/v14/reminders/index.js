var app=getApp();
function object(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function bodyOf(value){if(typeof value==='string'){try{value=JSON.parse(value);}catch(_){return null;}}return object(value)?value:null;}
function ok(value){return object(value)&&(value.error===0||value.error==='0');}
function alreadySubscribed(value){return object(value)&&(value.error===1||value.error==='1')&&typeof value.msg==='string'&&value.msg.trim()==='今天已经订阅';}
function today(){return new Date(Date.now()+8*3600000).toISOString().slice(0,10);}
function owner(){return JSON.stringify([String(wx.getStorageSync('openid')||''),String(wx.getStorageSync('sage_safe_token')||'')]);}
function message(value,fallback){var text=typeof value==='string'?value.trim():'';return text&&!/safe_token|auth_token|openid|sqlstate|mysql|fatal|exception|<\/?(?:html|script)|\.php/i.test(text)?text.slice(0,160):fallback;}
function template(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{16,}$/.test(value)&&value.indexOf('adunit-')!==0;}
function nativeFailure(error){
 var code=Number(error&&error.errCode),raw=String(error&&error.errMsg||'');
 if(code===20004)return '微信订阅总开关已关闭，请在微信设置中开启后重试。';
 if(code===20001||code===10001)return '签到提醒模板暂不可用，请重新获取；仍失败请联系管理员核对模板。';
 if(/cancel/i.test(raw))return '本次未开启订阅，仍可正常签到。';
 return '微信订阅授权未完成，请稍后重试；仍可正常签到。';
}
Page({
 data:{loading:true,busy:false,templateId:'',authorized:false,accepted:false,registeredDay:'',error:'',registrationError:''},
 onLoad:function(){this._alive=true;this._configSeq=0;if(typeof console!=='undefined'&&typeof console.info==='function')console.info('[元享签到提醒版本]','YX-REMINDER-20261104-R1');this.getConfig();},
 onShow:function(){if(this.data.accepted&&(this.data.registeredDay!==today()||this._registeredOwner!==owner())){this.setData({accepted:false,authorized:false,registeredDay:'',registrationError:''});this.getConfig();}},
 onUnload:function(){this._alive=false;this._configSeq=(this._configSeq||0)+1;this._loginSeq=(this._loginSeq||0)+1;this._loginCallbacks=[];},
 ensureSession:function(done,force){
  if(this._alive===false)return;
  if(!force&&wx.getStorageSync('sage_safe_token')){done(true);return;}
  if(this._connecting){this._loginCallbacks.push(done);return;}
  if(force&&typeof app.clearAuth==='function')app.clearAuth();
  this._connecting=true;this._loginCallbacks=[done];var self=this,seq=this._loginSeq=(this._loginSeq||0)+1,finished=false;
  function finish(success){if(finished)return;finished=true;if(self._alive===false||seq!==self._loginSeq)return;self._connecting=false;var callbacks=self._loginCallbacks;self._loginCallbacks=[];callbacks.forEach(function(cb){cb(success);});}
  try{wx.login({timeout:10000,success:function(login){
   if(self._alive===false||seq!==self._loginSeq)return;
   if(!login||!login.code){finish(false);return;}
   app.secureRequest({url:app.util.url('entry/wxapp/set')+'m=sage_dksy',method:'POST',data:{code:login.code},timeout:15000,
    success:function(response){var body=bodyOf(response&&response.data),status=Number(response&&response.statusCode);
     if(self._alive===false||seq!==self._loginSeq)return;
     if(!Number.isFinite(status)||status<200||status>=300||!body||(body.error!==undefined&&!ok(body))||typeof body.auth_token!=='string'||!body.auth_token.trim()){finish(false);return;}
     try{wx.setStorageSync('sage_safe_token',body.auth_token);}catch(_){finish(false);return;}finish(true);
    },fail:function(){finish(false);}});
  },fail:function(){finish(false);}});}catch(_){finish(false);}
 },
 api:function(name,data,done,retried){
  var self=this,finished=false;
  function finish(body,error){if(finished)return;finished=true;if(self._alive!==false)done(body,error);}
  try{app.secureRequest({url:app.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:15000,
   success:function(response){
    if(finished||self._alive===false)return;
    var status=Number(response&&response.statusCode),body=bodyOf(response&&response.data),auth=status===401||body&&(body.error===401||body.error==='401');
    if(auth&&!retried){finished=true;self.ensureSession(function(ready){if(ready)self.api(name,data,done,true);else done(null,{kind:'auth',message:'登录状态暂未恢复，请重新连接后登记提醒。'});},true);return;}
    if(auth){finish(null,{kind:'auth',message:'登录状态已失效，请重新连接后重试。'});return;}
    if(!Number.isFinite(status)||status<200||status>=300){finish(null,{kind:'http',message:'提醒服务暂时没有响应，请稍后重试。'});return;}
    if(!body||(body.error===undefined&&!(name==='subscribeconfig'&&Array.isArray(body.sign)))){finish(null,{kind:'response',message:'提醒服务未返回有效登记结果，请稍后重试。'});return;}
    if(name==='adddy'&&alreadySubscribed(body)){finish(body,null);return;}
    if(!ok(body)&&!(name==='subscribeconfig'&&body.error===undefined&&Array.isArray(body.sign))){finish(body,{kind:'server',message:message(body.msg||body.message,'提醒登记未完成，请稍后重试。')});return;}
    finish(body,null);
   },fail:function(){finish(null,{kind:'network',message:'连接中断，登记结果暂未确认，请稍后重试。'});}});}catch(_){finish(null,{kind:'network',message:'提醒服务暂未连接，请稍后重试。'});}
 },
 getConfig:function(){
  if(this._alive===false||this.data.busy)return;
  var self=this,seq=this._configSeq=(this._configSeq||0)+1;this.setData({loading:true,error:''});
  this.ensureSession(function(ready){
   if(self._alive===false||seq!==self._configSeq)return;
   if(!ready){self.setData({loading:false,error:'账号暂未连接，请点击重新获取后订阅提醒。'});return;}
   self.api('subscribeconfig',{},function(body,error){
    if(self._alive===false||seq!==self._configSeq)return;
    if(error){self.setData({loading:false,error:error.message});return;}
    var ids=Array.isArray(body.sign)?body.sign.filter(template):[],id=ids[0]||'',patch={loading:false,templateId:id,error:id?'':'签到提醒暂未开放，仍可正常签到。'};
    if(id!==self.data.templateId){patch.authorized=false;patch.accepted=false;patch.registeredDay='';patch.registrationError='';}
    self.setData(patch);
   });
  });
 },
 register:function(id){
  var self=this;this.api('adddy',{priTmplId:id},function(body,error){
   var existing=alreadySubscribed(body),confirmed=!error&&(ok(body)||existing);
   if(confirmed)self._registeredOwner=owner();
   self.setData({busy:false,accepted:confirmed,registeredDay:confirmed?today():'',registrationError:confirmed?'':error&&error.message||'提醒登记未完成，请稍后重试。'});
   wx.showToast({title:confirmed?(existing?'今天已经订阅':'今日提醒已登记'):'已授权，登记尚未确认',icon:'none'});
  });
 },
 subscribe:function(){
  if(this._alive===false||this.data.loading||this.data.busy||this.data.accepted||!this.data.templateId)return;
  var self=this,id=this.data.templateId;
  if(this.data.authorized&&!this.data.accepted){this.setData({busy:true,registrationError:''});this.register(id);return;}
  if(typeof wx.requestSubscribeMessage!=='function'){this.setData({registrationError:'当前微信不支持订阅消息，请更新微信后重试。'});return;}
  this.setData({busy:true,registrationError:''});var handled=false;
  function once(callback){return function(result){if(handled)return;handled=true;if(self._alive===false)return;callback(result);};}
  try{wx.requestSubscribeMessage({tmplIds:[id],success:once(function(result){
   if(result&&result[id]==='accept'){self.setData({authorized:true,accepted:false});self.register(id);}
   else{var text=result&&(result[id]==='ban'||result[id]==='filter')?'提醒模板暂不可用，请重新获取；仍失败请联系管理员核对模板。':'本次未同意订阅，仍可正常签到。';self.setData({busy:false,registrationError:text});wx.showToast({title:'未开启本次提醒',icon:'none'});}
  }),fail:once(function(error){var text=nativeFailure(error);self.setData({busy:false,registrationError:text});wx.showToast({title:'订阅授权未完成',icon:'none'});})});}
  catch(_){if(!handled){handled=true;this.setData({busy:false,registrationError:'微信订阅暂时不可用，请稍后重试。'});}}
 },
 goSign:function(){var pages=typeof getCurrentPages==='function'?getCurrentPages():[];var prev=pages[pages.length-2];if(prev&&prev.route==='sage_dksy/pages/v14/sign/index')wx.navigateBack({delta:1});else wx.redirectTo({url:'/sage_dksy/pages/v14/sign/index'});}
});
