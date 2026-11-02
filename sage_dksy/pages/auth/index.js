// 审核整改：提供可选的个人资料入口，不调用已不适用的 wx.getUserProfile。
Page({
    data: {},
    onLoad: function() {},
    editProfile: function() {
        wx.navigateTo({ url: "/sage_dksy/pages/user/user/index" });
    },
    cancelLogin: function() {
        wx.reLaunch({ url: "/sage_dksy/pages/index/index" });
    }
});
