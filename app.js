var we7 = require("we7/resource/js/util.js");
App({
  util: we7,
  siteInfo: require("siteinfo.js"),
  onLaunch: function () {
    // Clear pre-upgrade cached advertising policy: stale ad units must not open automatically.
    try { wx.removeStorageSync("adset"); } catch (_) {}
    var self = this, original = we7.request;
    we7.request = function (opts) {
      return original.call(we7, self.secureOptions(opts));
    };
  },
  secureOptions: function (opts) {
    var copy = Object.assign({}, opts || {});
    copy.data = Object.assign({}, copy.data || {});
    if ((copy.method || 'GET').toUpperCase() === 'POST') {
      copy.header = Object.assign({'content-type':'application/x-www-form-urlencoded'},copy.header || {});
    }
    copy.method = copy.method || "POST";
    copy.header = Object.assign({}, copy.header || {}, { "content-type": "application/x-www-form-urlencoded" });
    var token = wx.getStorageSync("sage_safe_token");
    if (token) copy.data.safe_token = token;
    var originalSuccess = copy.success;
    copy.success = function (res) {
      if (res && res.data && res.data.auth_token) {
        wx.setStorageSync("sage_safe_token", res.data.auth_token);
      }
      if (typeof originalSuccess === "function") originalSuccess(res);
    };
    return copy;
  },
  secureRequest: function (opts) { return wx.request(this.secureOptions(opts)); },
  clearAuth: function () { wx.removeStorageSync("sage_safe_token"); },
  userInfo: { sessionid: null }
});
