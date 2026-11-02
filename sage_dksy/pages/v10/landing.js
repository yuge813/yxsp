var v=require('../../utils/v10.js');
Page({data:{msg:'正在检查分享内容…',canHome:true},onLoad:function(o){
  var scene=(o&&o.scene)||'',kind='',id=0;
  try{scene=decodeURIComponent(scene);}catch(_){scene='';}
  if(/^p_[1-9]\d*$/.test(scene)){kind='prize';id=Number(scene.slice(2));}
  else if(/^t_[1-9]\d*$/.test(scene)){kind='trial';id=Number(scene.slice(2));}
  else if(/^r_[1-9]\d*$/.test(scene)){kind='review';id=Number(scene.slice(2));}
  if(!id||!isFinite(id)){this.setData({msg:'无法识别此小程序码，请从首页进入'});return;}
  var target=kind==='prize'?'/sage_dksy/pages/prize/prize_show':kind==='trial'?'/sage_dksy/pages/trial/trial_show':'/sage_dksy/pages/v10/public';
  var self=this;
  v.track('share_landing',kind,id,'qr');
  wx.redirectTo({url:target+'?id='+id+'&source=qr',fail:function(){self.setData({msg:'此分享对应的详情页尚未包含在当前小程序版本中，请更新到最新版本后重新扫码。'});}});
},goHome:function(){wx.reLaunch({url:'/sage_dksy/pages/index/index'});}});
