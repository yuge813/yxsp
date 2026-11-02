var app=getApp();
function ok(r){return !!r&&typeof r==='object'&&(r.error===undefined||Number(r.error)===0);}
Page({data:{loading:true,busy:false,templateId:'',accepted:false,error:''},
 onLoad:function(){this.getConfig();},
 api:function(name,data,done){app.secureRequest({url:app.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:15000,success:function(x){done(x&&typeof x.data==='object'?x.data:null);},fail:function(){done(null);}});},
 getConfig:function(){var self=this;this.setData({loading:true,error:''});this.api('subscribeconfig',{},function(r){
  if(!ok(r)){self.setData({loading:false,error:'提醒服务暂未连接，请稍后重试'});return;}
  var ids=Array.isArray(r.sign)?r.sign.filter(function(id){return typeof id==='string'&&id.length>=16;}):[];
  self.setData({loading:false,templateId:ids[0]||'',error:ids.length?'':'签到提醒暂未开放，仍可正常签到'});
 });},
 subscribe:function(){var self=this,id=this.data.templateId;if(this.data.busy||!id)return;
  if(typeof wx.requestSubscribeMessage!=='function'){wx.showToast({title:'请在微信中授权订阅',icon:'none'});return;}
  this.setData({busy:true});wx.requestSubscribeMessage({tmplIds:[id],success:function(r){
    if(r&&r[id]==='accept'){self.api('adddy',{priTmplId:id},function(res){var success=ok(res);self.setData({busy:false,accepted:success});wx.showToast({title:success?'下次提醒已登记':'提醒登记未成功，请重试',icon:'none'});});}
    else {self.setData({busy:false});wx.showToast({title:'未同意订阅',icon:'none'});}
  },fail:function(){self.setData({busy:false});wx.showToast({title:'请在微信真机中订阅',icon:'none'});}});
 },
 goSign:function(){var pages=typeof getCurrentPages==='function'?getCurrentPages():[];var prev=pages[pages.length-2];if(prev&&prev.route==='sage_dksy/pages/v14/sign/index')wx.navigateBack({delta:1});else wx.redirectTo({url:'/sage_dksy/pages/v14/sign/index'});}
});