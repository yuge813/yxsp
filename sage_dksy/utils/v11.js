var app=getApp();
function api(name,data,success,failure){
 function fail(message){if(typeof failure==='function')failure(message);}
 return app.secureRequest({url:app.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:18000,
  success:function(resp){
   var status=Number(resp&&resp.statusCode),body=resp&&resp.data;
   if(!Number.isFinite(status)||status<200||status>=300){fail('服务暂时没有响应，请稍后重试');return;}
   if(typeof body==='string'){try{body=JSON.parse(body);}catch(_){fail('内容暂时没有加载出来，请重试');return;}}
   if(!body||typeof body!=='object'||Array.isArray(body)||!Object.keys(body).length){fail('内容暂时没有加载出来，请重试');return;}
   if(body.error!==undefined&&(!Number.isFinite(Number(body.error))||Number(body.error)!==0)){
    var message=String(body.msg||'操作暂未完成，请重试');
    if(/php|json|mysql|sqlstate|微擎|fatal|exception|token|openid/i.test(message))message='操作暂未完成，请重试';
    fail(message);return;
   }
   if(typeof success==='function')success(body);
  },fail:function(){fail('网络连接失败，请重试');}
 });
}
function env(){try{var v=wx.getAccountInfoSync().miniProgram.envVersion;return /^(develop|trial|release)$/.test(v)?v:'release';}catch(e){return 'release';}}
function toast(msg){wx.showToast({title:String(msg||'操作失败').slice(0,28),icon:'none'});}
function beijing(d){var t=new Date(d||Date.now()),z=new Date(t.getTime()+8*3600000),wk=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];return z.getUTCFullYear()+'年'+(z.getUTCMonth()+1)+'月'+z.getUTCDate()+'日 '+wk[z.getUTCDay()];}
function clock(ts){return ts?new Date((ts+8*3600)*1000).toISOString().slice(0,16).replace('T',' '):'时间未知';}
function registerVisit(code,kind,id,source,cb){if(!/^[a-f0-9]{12}$/.test(code||'')){if(cb)cb(false);return;}
 api('v11visit',{code:code,kind:kind||'home',id:id||0,source:source||'friend'},function(r){try{wx.setStorageSync('v11_referral_receipt',{token:r.receipt,at:Date.now(),code:code});}catch(e){}if(cb)cb(true);},function(){if(cb)cb(false);});}

// YX_V1316: 用户主动打开有效专属邀请入口并正常完成首次登录后，
// 依据服务端访问凭据自动记录首次一级关系。没有强迫分享，没有即时金币奖励。
var autoBinding=false;
function autoBindReferral(done){
  done=typeof done==='function'?done:function(){};
  var r=null;
  try {r=wx.getStorageSync('v11_referral_receipt');}catch(e){}
  if(!r||!r.token||Date.now()-Number(r.at||0)>86400000){
    try {if(r&&r.token)wx.removeStorageSync('v11_referral_receipt');}catch(e){}
    done(null);return;
  }
  if(autoBinding){done(null);return;}
  autoBinding=true;
  api('v11bind',{receipt:r.token},function(res){
    autoBinding=false;
    try{wx.removeStorageSync('v11_referral_receipt');}catch(e){}
    done(res);
  },function(message){
    autoBinding=false;
    // 对于无法继续自动绑定的状态停止重试，网络问题暂时保留凭据。
    if(/已有有效邀请归属|仅新注册用户|不能邀请自己|循环关系|失效|已使用|来源凭据无效/.test(String(message||''))){
      try{wx.removeStorageSync('v11_referral_receipt');}catch(e){}
    }
    done({bound:0,message:message||'绑定暂未成功'});
  });
}

function acceptReferral(done){var r=null;try{r=wx.getStorageSync('v11_referral_receipt');}catch(e){}if(!r||!r.token||Date.now()-r.at>86400000){toast('分享来源已过期');return;}
 wx.showModal({title:'确认登录',content:'登录后将按规则核验一级邀请关系；已有邀请关系不会被覆盖。无需获取微信头像或昵称。',confirmText:'确认登录',success:function(answer){if(!answer.confirm)return;
  wx.login({success:function(login){if(!login.code){toast('微信登录失败');return;}
   api('set',{code:login.code},function(){api('v11bind',{receipt:r.token},function(b){wx.removeStorageSync('v11_referral_receipt');toast('邀请关系已建立');if(done)done(b);},function(message){toast(message);if(done)done(null);});},function(m){toast(m);});},fail:function(){toast('微信登录失败');}});
 }});
}
function share(kind,id,code,channel){var root='/sage_dksy/pages/v11/';var params='id='+encodeURIComponent(id)+'&source='+(channel==='timeline'?'timeline':'friend')+(code?'&from='+encodeURIComponent(code):'');return {path:root+'public?'+params,query:params};}
module.exports={api:api,env:env,toast:toast,beijing:beijing,clock:clock,registerVisit:registerVisit,acceptReferral:acceptReferral,autoBindReferral:autoBindReferral,share:share};
