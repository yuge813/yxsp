// YX_UGC_PERSONAL_20261101: Personal-entity publishing is disabled for all users, not just reviewers.
Page({
  data:{},
  onLoad:function(){try{wx.hideShareMenu();}catch(e){}},
  goHome:function(){wx.redirectTo({url:'/sage_dksy/pages/index/index'});}
});
