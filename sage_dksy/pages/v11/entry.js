var v=require('../../utils/v11.js');
Page({
  data:{message:'正在打开元享每日好礼…',isWork:false},
  onLoad:function(o){
    var sc=String(o&&o.scene||'');
    try{sc=decodeURIComponent(sc);}catch(e){sc='';}
    if(!sc&&/^[a-f0-9]{12}$/.test(String(o&&o.from||'')))sc='g'+o.from;
    var m=sc.match(/^w(\d+)i([a-f0-9]{12})$/);
    var g=sc.match(/^g([a-f0-9]{12})$/);
    var kind=m?'work':'home',id=m?Number(m[1]):0,code=m?m[2]:g?g[1]:'';
    if(!code){this.setData({message:'小程序码无效或已过期'});return;}
    var self=this;
    this.setData({isWork:kind==='work',message:kind==='work'?'正在打开好友分享的祝福卡…':'正在打开元享每日好礼…'});
    v.registerVisit(code,kind,id,'qr',function(ok){
      if(!ok){self.setData({message:'邀请来源暂不可用，可从首页继续浏览'});return;}
      if(kind==='work')wx.redirectTo({url:'/sage_dksy/pages/v11/public?id='+id+'&source=qr',fail:function(){self.setData({message:'作品暂不能打开'});}});
      else wx.reLaunch({url:'/sage_dksy/pages/index/index'});
    });
  },
  goHome:function(){wx.reLaunch({url:'/sage_dksy/pages/index/index'});}
});
