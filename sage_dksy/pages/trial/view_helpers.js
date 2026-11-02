var app = getApp();
function failure(message,kind){var e=new Error(message);e.kind=kind;return e;}
function request(name, data) {
  return new Promise(function(resolve, reject) {
    app.util.request({url:'entry/wxapp/'+name,data:data||{},cache:'0',timeout:15000,
      success:function(res){var body=res&&res.data;if(!body||typeof body!=='object'||Array.isArray(body)){reject(failure('暂时无法读取数据，请重试','schema'));return;}
        if(res.statusCode && (res.statusCode<200||res.statusCode>=300)){reject(failure('服务暂时不可用，请稍后重试','http'));return;}
        if(body.error!==undefined&&!((typeof body.error==='number'&&isFinite(body.error))||(typeof body.error==='string'&&/^-?\d+$/.test(body.error)))){reject(failure('返回状态尚未确认，请稍后核对记录','schema'));return;}if(body.error!==undefined&&body.error!==0&&body.error!=='0'){var message=typeof body.msg==='string'?body.msg.trim():'';if(!message||message.length>160||/(php|mysql|sqlstate|exception|stack|trace|\\.php|https?:\/\/)/i.test(message))message='当前请求未完成，请稍后重试';reject(failure(message,'business'));return;}resolve(body);},
      fail:function(){reject(failure('网络连接不稳定，请重试','network'));}});
  });
}
function login(from) { return new Promise(function(resolve,reject){wx.login({success:function(auth){if(!auth.code){reject(new Error('微信连接未完成，请重试'));return;}
  request('set',{code:auth.code,fromopenid:from||''}).then(function(body){if(typeof body.openid!=='string'||!body.openid.trim()){reject(failure('账号连接尚未完成，请重试','schema'));return;}if(body.openid)try{wx.setStorageSync('openid',body.openid);}catch(_){}resolve(body);},reject);},fail:function(){reject(new Error('微信连接未完成，请重试'));}});}); }
function text(err){return err&&err.message||'暂时无法加载，请重试';}
module.exports={request:request,login:login,text:text};
