'use strict';
// Preserve the historic invitation-poster route while using the current genuine-QR generator.
Page({data:{error:''},onLoad(){this.openPoster();},openPoster(){this.setData({error:''});wx.redirectTo({url:'/sage_dksy/pages/v11/promote?mode=poster',fail:()=>this.setData({error:'海报页面暂时无法打开，请重试'})});}});
