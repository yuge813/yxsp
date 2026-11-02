var api=require('./view_helpers.js');
Page({data:{id:0,loading:true,loaded:false,error:'',rows:[]},onLoad:function(q){this.setData({id:Number(q.id)||0});this.load();},onPullDownRefresh:function(){this.load();},retry:function(){this.load();},
 load:function(){var self=this;if(this._loading)return;if(!this.data.id){this.setData({loading:false,error:'活动链接无效，请返回活动详情重新进入'});return;}this._loading=true;this.setData({loading:true,error:''});
 api.login().then(function(account){self.setData({openid:account.openid});return api.request('trialshare',{id:self.data.id,openid:self.data.openid});}).then(function(x){if(!Array.isArray(x.trial_share))throw new Error('返回的记录暂时无法读取，请重试');var rows=x.trial_share;self._loading=false;self.setData({rows:rows,loading:false,loaded:true});wx.stopPullDownRefresh();}).catch(function(e){self._loading=false;self.setData({loading:false,error:api.text(e)});wx.stopPullDownRefresh();});},
 imageError:function(e){var i=Number(e.currentTarget.dataset.index),rows=this.data.rows.map(function(x,j){return i===j?Object.assign({},x,{imageFailed:true}):x;});this.setData({rows:rows});}
});
