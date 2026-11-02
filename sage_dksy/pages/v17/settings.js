Page({data:{},goProfile(){wx.navigateTo({url:'/sage_dksy/pages/user/user/index'});},
 permissions(){wx.openSetting({fail:()=>wx.showToast({title:'请在微信设置中管理权限',icon:'none'})});},
 goHome(){wx.reLaunch({url:'/sage_dksy/pages/index/index'});}});