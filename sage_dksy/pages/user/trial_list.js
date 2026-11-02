var app=getApp();
Page({data:{prize_on:0,triallist:[],pages:1,loading:false,hasMore:true,loaded:false,error:''},
 onLoad:function(){wx.setNavigationBarTitle({title:'试用申请记录'});},onShow:function(){this.loadList(true);},
 typein:function(e){if(this.data.loading)return;var tab=Number(e.currentTarget.dataset.tt)===1?1:0;if(tab===this.data.prize_on)return;this.setData({prize_on:tab,triallist:[],loaded:false,pages:1,hasMore:true});this.loadList(true);},
 onReachBottom:function(){this.loadList(false);},onPullDownRefresh:function(){this.loadList(true);},retry:function(){this.loadList(true);},
 loadList:function(reset){var self=this;if(this.data.loading||(!reset&&!this.data.hasMore))return;var page=reset?1:this.data.pages;this.setData({loading:true,error:''});wx.login({success:function(auth){if(!auth.code){self.failed();return;}app.util.request({url:'entry/wxapp/triallist',data:{code:auth.code,pages:page,prize_on:self.data.prize_on},cache:'0',timeout:15000,
 success:function(res){var x=res&&res.data;if(res&&res.statusCode&&(Number(res.statusCode)<200||Number(res.statusCode)>=300)){self.failed();return;}if(!x||typeof x!=='object'||Array.isArray(x)||(x.error!==undefined&&x.error!==0&&x.error!=='0')){self.failed();return;}if(!Array.isArray(x.triallist)){self.failed();return;}var rows=x.triallist;self.setData({triallist:reset?rows:self.data.triallist.concat(rows),pages:page+1,hasMore:rows.length>0&&(x.page===undefined||Number(x.page)===1),loaded:true,loading:false});wx.stopPullDownRefresh();},fail:function(){self.failed();}});},fail:function(){self.failed();}});},
 failed:function(){this.setData({loading:false,error:'申请记录暂时无法加载，请重试'});wx.stopPullDownRefresh();},
 imageError:function(e){var id=String(e.currentTarget.dataset.id);this.setData({triallist:this.data.triallist.map(function(x){return String(x.id)===id?Object.assign({},x,{imageFailed:true}):x;})});}
});
