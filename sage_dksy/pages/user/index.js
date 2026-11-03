var app = getApp();
var v3gate = require('../../utils/v3_ad_gate.js');
var avatarSource = require('../../utils/avatar-source.js');
function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function bodyOf(response) { var b = response && response.data; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return null; } } return object(b) ? b : null; }
function balanceOf(user) { var raw = user && user.num; if (raw === null || raw === undefined || typeof raw === 'boolean' || String(raw).trim() === '') return null; var n = Number(raw); return Number.isFinite(n) && n >= 0 ? n : null; }
Page({
  data: {thisurl:'sage_dksy/pages/user/index',userinfo:{},balance:null,balanceText:'—',loading:true,loaded:false,pageError:'',avatarFailed:false,share:{},v3Unit:'',v3Ready:false,adset:{}},
  onLoad:function(){this._alive=true;this._accountSeq=0;this.getadset();this.getShare();},
  onShow:function(){this.loadAccount();},
  onUnload:function(){this._alive=false;this._accountSeq=(this._accountSeq||0)+1;},
  onPullDownRefresh:function(){this.loadAccount();},
  loadAccount:function(){
    if(this._accountBusy)return;
    var self=this,seq=(this._accountSeq||0)+1;this._accountSeq=seq;this._accountBusy=true;
    this.setData({loading:true,pageError:''});
    function current(){return self._alive!==false&&self._accountSeq===seq;}
    function failed(){if(!current())return;self._accountBusy=false;self.setData({loading:false,pageError:'账户暂时没有连接上，请重试'});wx.stopPullDownRefresh();}
    wx.login({success:function(auth){
      if(!auth||!auth.code){failed();return;}
      app.secureRequest({url:app.util.url('entry/wxapp/set')+'m=sage_dksy',method:'POST',data:{code:auth.code},timeout:15000,
        success:function(response){
          if(!current())return;
          var b=bodyOf(response),status=Number(response&&response.statusCode)||200;
          if(status<200||status>=300||!b||!object(b.userinfo)||(b.error!==undefined&&Number(b.error)!==0)){failed();return;}
          var balance=balanceOf(b.userinfo);
          self._accountBusy=false;
          self.setData({userinfo:Object.assign({},b.userinfo,{headimg:avatarSource(b.userinfo.headimg)}),balance:balance,balanceText:balance===null?'—':String(balance),setinfo:b.setinfo||{},openid:b.openid||'',loading:false,loaded:true,pageError:'',avatarFailed:false});
          if(b.openid)wx.setStorageSync('openid',b.openid);
          wx.stopPullDownRefresh();
        },fail:failed});
    },fail:failed});
  },
  retry:function(){this.loadAccount();},
  avatarError:function(){this.setData({avatarFailed:true});},
  getShare:function(){var self=this;app.secureRequest({url:app.util.url('entry/wxapp/share')+'m=sage_dksy',success:function(r){if(self._alive!==false){var b=bodyOf(r);if(b&&object(b.share))self.setData({share:b.share});}}});},
  onShareAppMessage:function(){return {title:this.data.share.share_title||'元享 · 让每一点积累都值得',path:'/sage_dksy/pages/index/index',imageUrl:this.data.share.share_img||''};},
  onShareTimeline:function(){return {title:this.data.share.share_title||'元享',imageUrl:this.data.share.share_img||''};},
  v3Set:function(slots){var c=slots&&slots.user_center_banner,ready=v3gate.available(slots,'user_center_banner');this.setData({v3Unit:ready&&c?c.unit:'',v3Ready:!!ready});},
  onV3AdLoad:function(){v3gate.loaded('user_center_banner');},
  onV3AdError:function(){this.setData({v3Unit:'',v3Ready:false});},
  getadset:function(){var self=this;app.secureRequest({url:app.util.url('entry/wxapp/adset')+'m=sage_dksy',data:{},success:function(r){if(self._alive===false)return;var b=bodyOf(r),adset=b&&b.adset||{};self.v3Set(adset.v3_slots||{});self.setData({adset:adset});wx.setStorageSync('adset',adset);}});}
});
