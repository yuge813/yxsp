var api=require('./view_helpers.js'),gate=require('../../utils/v3_ad_gate.js');
Page({data:{thisurl:'sage_dksy/pages/trial/trial',trial:[],filteredTrial:[],activeTab:0,activeCount:0,upcomingCount:0,endedCount:0,pages:1,hasMore:true,loading:false,loaded:false,error:'',v3Unit:'',v3Ready:false,adset:{}},
 onLoad:function(){this.getadset();},onShow:function(){this.load(true);},onPullDownRefresh:function(){this.load(true);},onReachBottom:function(){this.load(false);},
 retry:function(){this.load(true);},
 load:function(reset){var self=this;if(this.data.loading||(!reset&&!this.data.hasMore))return;var page=reset?1:this.data.pages;this.setData({loading:true,error:''});
 var ready=this.data.openid?Promise.resolve():api.login().then(function(x){self.setData({openid:x.openid||'',userinfo:x.userinfo||{},setinfo:x.setinfo||{}});});
 ready.then(function(){return api.request('trial',{openid:self.data.openid,pages:page});}).then(function(x){if(!Array.isArray(x.trial))throw new Error('返回的列表暂时无法读取，请重试');var rows=x.trial;
 self.setData({trial:reset?rows:self.data.trial.concat(rows),pages:page+1,hasMore:rows.length>0&&(x.page===undefined||Number(x.page)===1),loading:false,loaded:true});self.applyTrialView();self.v3Refresh();wx.stopPullDownRefresh();
 }).catch(function(e){self.setData({loading:false,error:api.text(e)});wx.stopPullDownRefresh();});},
 switchTrialTab:function(e){var tab=Number(e.currentTarget.dataset.tab);if(tab<0||tab>2)return;this.setData({activeTab:tab});this.applyTrialView();},
 applyTrialView:function(){var rows=this.data.trial||[],open=rows.filter(function(x){return String(x.isyes)==='1';}),soon=rows.filter(function(x){return String(x.isyes)==='0';}),end=rows.filter(function(x){return String(x.isyes)==='2';});this.setData({activeCount:open.length,upcomingCount:soon.length,endedCount:end.length,filteredTrial:[open,soon,end][this.data.activeTab]});},
 openTrial:function(e){var id=Number(e.currentTarget.dataset.id);if(id>0)wx.navigateTo({url:'/sage_dksy/pages/trial/trial_show?id='+id});},
 goHistory:function(){wx.navigateTo({url:'/sage_dksy/pages/user/trial_list'});},
 onTrialImageError:function(e){var id=String(e.currentTarget.dataset.id);this.setData({trial:this.data.trial.map(function(x){return String(x.pro_id)===id?Object.assign({},x,{_imageFailed:true}):x;})});this.applyTrialView();},
 getadset:function(){var self=this;api.request('adset',{}).then(function(x){self.setData({adset:x.adset||{},v3ConfigFetched:true});self.v3Refresh();}).catch(function(){});},
 v3Refresh:function(){var s=(this.data.adset||{}).v3_slots||{},ok=this.data.v3ConfigFetched&&this.data.trial.length>=6&&gate.available(s,'trial_list_native');this.setData({v3Ready:!!ok,v3Unit:ok?(s.trial_list_native||{}).unit:''});},
 onV3AdLoad:function(){gate.loaded('trial_list_native');},onV3AdError:function(){this.setData({v3Ready:false,v3Unit:''});}
});
