var api=require('./view_helpers.js'),v10=require('../../utils/v10.js'),gate=require('../../utils/v3_ad_gate.js'),parse=require('../../wxParse/wxParse.js');
Page({data:{id:0,loading:true,error:'',trial_show:null,v3Unit:'',v3Ready:false,imageFailed:false},
 onLoad:function(q){this.setData({id:Number(q.id)||0,fromopenid:q.fromopenid||'',v10source:q.source||'detail'});this.load();this.getadset();this.v10Config();if(q.source)v10.track('share_landing','trial',Number(q.id),q.source);},
 onShow:function(){if(this._shown)this.load();this._shown=true;},onPullDownRefresh:function(){this.load();},retry:function(){this.load();},
 load:function(){var self=this;if(this._loading)return;if(!this.data.id){this.setData({loading:false,error:'活动链接无效，请从试用列表重新进入'});return;}this._loading=true;this.setData({loading:true,error:''});
 api.login(this.data.fromopenid).then(function(x){self.setData({openid:x.openid||'',setinfo:x.setinfo||{},userinfo:x.userinfo||{}});return api.request('trialshow',{openid:x.openid,id:self.data.id});}).then(function(x){if(!x.trial_show||typeof x.trial_show!=='object')throw new Error('此活动暂时无法查看');
 var p=x.trial_show;parse.wxParse('content','html',p.content||'',self,0);parse.wxParse('guize','html',p.guize||'',self,0);self.setData({trial_show:p,trial_input:x.trial_input,trial_share:x.trial_share,loading:false,imageFailed:false});self._loading=false;wx.stopPullDownRefresh();
 }).catch(function(e){self._loading=false;self.setData({loading:false,error:api.text(e)});wx.stopPullDownRefresh();});},
 imageError:function(){this.setData({imageFailed:true});},
 baoming:function(){if(this._navigating||!this.data.trial_show||String(this.data.trial_show.isyes)!=='1')return;this._navigating=true;var self=this;wx.navigateTo({url:'/sage_dksy/pages/trial/trial_input?id='+this.data.id+'&source='+encodeURIComponent(this.data.v10source),complete:function(){self._navigating=false;}});},
 trialprize:function(){wx.navigateTo({url:'/sage_dksy/pages/trial/trial_prize?id='+this.data.id});},
 trialshare:function(){wx.navigateTo({url:'/sage_dksy/pages/trial/trial_share?id='+this.data.id});},
 onShareAppMessage:function(){var p=this.data.trial_show||{},id=this.data.id;v10.track('share_entry','trial',id,'friend');return {title:this.data.v10shareTitle||p.pro_title||'元享试用活动',path:'/sage_dksy/pages/trial/trial_show?id='+id+'&source=friend',imageUrl:v10.shareCover(this.data.v10shareCover||p.pro_picurl||'')};},
 onShareTimeline:function(){var p=this.data.trial_show||{},id=this.data.id;v10.track('share_entry','trial',id,'timeline');return {title:this.data.v10shareTitle||p.pro_title||'元享试用活动',query:'id='+id+'&source=timeline',imageUrl:v10.shareCover(this.data.v10shareCover||p.pro_picurl||'')};},
 v10Poster:function(){v10.poster('trial',this.data.id);},
 v10Config:function(){var self=this;v10.api('v10config',{},function(c){c=c&&typeof c==='object'?c:{};self.setData({v10shareOn:!!c.share_on,v10posterOn:!!c.posters_on});if(!c.share_on)wx.hideShareMenu();else wx.showShareMenu({menus:['shareAppMessage','shareTimeline']});});v10.api('v10featured',{},function(r){r=r&&typeof r==='object'?r:{};var row=(Array.isArray(r.items)?r.items:[]).filter(function(x){return x.kind==='trial'&&Number(x.id)===Number(self.data.id);})[0];if(row)self.setData({v10shareTitle:row.share_title,v10shareCover:row.share_cover});});},
 getadset:function(){var self=this;api.request('adset',{}).then(function(x){var s=(x.adset||{}).v3_slots||{},ok=gate.available(s,'trial_detail_banner');self.setData({adset:x.adset||{},v3Ready:!!ok,v3Unit:ok?(s.trial_detail_banner||{}).unit:''});}).catch(function(){});},
 onV3AdLoad:function(){gate.loaded('trial_detail_banner');},onV3AdError:function(){this.setData({v3Ready:false,v3Unit:''});}
});
