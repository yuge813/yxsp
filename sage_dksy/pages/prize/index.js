var app=getApp(),gate=require('../../utils/v3_ad_gate.js');
function body(res){if(!res||res.statusCode&&Number(res.statusCode)!==200||!res.data||typeof res.data!=='object')return null;return res.data;}
Page({
 data:{thisurl:'sage_dksy/pages/prize/index',prize:[],loading:true,loadingMore:false,error:'',moreError:'',pages:1,hasMore:true,userinfo:{},balance:null,setinfo:{},adset:{},v3Ready:false,v3Unit:'',v3ConfigFetched:false,share:{}},
 onLoad:function(){this._started=true;this.refresh();this.getadset();this.getShare();},
 onShow:function(){if(this._didShow)this.refresh();this._didShow=true;},
 onPullDownRefresh:function(){this.refresh();},
 request:function(name,data,done){app.secureRequest({url:app.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:15000,success:function(res){var b=body(res);done(b&&!(b.error!==undefined&&Number(b.error)!==0)?b:null);},fail:function(){done(null);}});},
 refresh:function(){if(this._refreshing||this.data.loadingMore){wx.stopPullDownRefresh();return;}this._refreshing=true;this.setData({loading:true,error:'',moreError:''});var self=this;wx.login({success:function(auth){if(!auth.code){self.failed();return;}self.request('set',{code:auth.code},function(b){if(!b||!b.userinfo){self.failed();return;}var raw=b.userinfo.num,n=raw===null||raw===undefined||typeof raw==='boolean'||typeof raw==='object'||String(raw).trim()===''?NaN:Number(raw);self.setData({userinfo:b.userinfo,setinfo:b.setinfo||{},balance:isFinite(n)&&n>=0?n:null,openid:b.openid||''});if(b.openid)wx.setStorageSync('openid',b.openid);self.loadPage(true);});},fail:function(){self.failed();}});},
 failed:function(){this._refreshing=false;this.setData({loading:false,error:'暂时连接不上，请重试'});wx.stopPullDownRefresh();},
 loadPage:function(reset){if(!reset&&(this.data.loading||this.data.loadingMore||!this.data.hasMore))return;var self=this,page=reset?1:this.data.pages+1;this.setData(reset?{loading:true,error:''}:{loadingMore:true,moreError:''});this.request('prize',{openid:this.data.openid,pages:page},function(b){self._refreshing=false;if(!b||!Array.isArray(b.prize)){self.setData(reset?{loading:false,error:'好礼暂时没有加载出来'}:{loadingMore:false,moreError:'未能加载更多，点击重试'});wx.stopPullDownRefresh();return;}var rows=b.prize.map(function(p){return Object.assign({},p,{_imageFailed:false});});self.setData({prize:reset?rows:self.data.prize.concat(rows),loading:false,loadingMore:false,error:'',pages:page,hasMore:rows.length>0&&(b.page===undefined||Number(b.page)===1)});self.v3Refresh();wx.stopPullDownRefresh();});},
 onReachBottom:function(){this.loadPage(false);},loadMore:function(){this.loadPage(false);},retry:function(){this.refresh();},
 onPrizeImageError:function(ev){var id=String(ev.currentTarget.dataset.id);this.setData({prize:this.data.prize.map(function(p){return String(p.prize_id)===id?Object.assign({},p,{_imageFailed:true}):p;})});},
 prize_show:function(ev){var id=Number(ev.currentTarget.dataset.id);if(id>0)wx.navigateTo({url:'/sage_dksy/pages/prize/prize_show?id='+id});},
 integral_url:function(){wx.navigateTo({url:'/sage_dksy/pages/user/integral'});},
 getShare:function(){var self=this;this.request('share',{},function(b){if(b)self.setData({share:b.share||{}});});},
 onShareAppMessage:function(){return {title:this.data.share.share_title||'元享好礼 · 积累日常喜欢',path:'/sage_dksy/pages/prize/index',imageUrl:this.data.share.share_img||''};},
 onShareTimeline:function(){return {title:this.data.share.share_title||'元享好礼',imageUrl:this.data.share.share_img||''};},
 getadset:function(){var self=this;this.request('adset',{},function(b){if(!b)return;self.setData({adset:b.adset||{},v3ConfigFetched:true});self.v3Refresh();});},
 v3Refresh:function(){var c=this.data.adset||{},slots=c.v3_slots||{},on=this.data.v3ConfigFetched&&this.data.prize.length>=6&&Number(c.banner_prize_on)!==1&&gate.available(slots,'prize_list_native');this.setData({v3Ready:!!on,v3Unit:on?(slots.prize_list_native||{}).unit:''});},
 onV3AdLoad:function(){gate.loaded('prize_list_native');},onV3AdError:function(){this.setData({v3Ready:false,v3Unit:''});},onPrizeBannerLoad:function(){},onPrizeBannerError:function(){this.setData({bannerFailed:true});},onPrizeBannerClose:function(){this.setData({bannerFailed:true});}
});
