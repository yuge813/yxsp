var v = require('../../utils/v11.js');
var referral = require('./referral.js');
Page({
  data:{tab:'friends',loading:true,loaded:false,message:'',direct:null,today:null,items:[],hasMore:false,page:1,growth:{joined:0,done_count:0,days:[]},growthLoaded:false,growthError:'',days:[1,2,3,4,5,6,7],rewardInfo:{approved:false,stages:[],cap:null,earned:null},milestones:[{day:1,title:'开启新旅程',hint:'了解元享，按自己的节奏体验'},{day:2,title:'再次相见',hint:'自愿再次访问小程序'},{day:3,title:'形成习惯',hint:'继续签到与阅读'},{day:5,title:'稳步成长',hint:'探索已有的实用功能'},{day:7,title:'七日成长',hint:'回顾这一周的成长进度'}]},
  onLoad:function(){this._alive=true;this.reload();},
  onShow:function(){if(this._shown)this.reload();this._shown=true;},
  onUnload:function(){this._alive=false;this._seq=(this._seq||0)+1;},
  onPullDownRefresh:function(){this.reload();},
  setTab:function(e){var tab=e.currentTarget.dataset.tab||'friends';if(['friends','growth','rewards'].indexOf(tab)>=0)this.setData({tab:tab});},
  reload:function(){
    if(this._loading)return;
    var self=this,seq=(this._seq||0)+1;this._seq=seq;this._loading=true;this.setData({loading:true,message:'',growthError:''});
    function current(){return self._alive!==false&&self._seq===seq;}
    function fail(){if(!current())return;self._loading=false;self.setData({loading:false,message:'好友信息暂时没有加载出来，请重试'});wx.stopPullDownRefresh();}
    v.api('v11promote',{page:1},function(r){if(!current())return;if(!r||!Array.isArray(r.items)){fail();return;}var a=referral.people(r.items);self._loading=false;self.setData({direct:referral.count(r.total),today:referral.count(r.today),items:a,page:2,hasMore:r.items.length===15,loading:false,loaded:true,rewardInfo:referral.campaign(r)});wx.stopPullDownRefresh();},fail);
  },
  loadMore:function(){if(this._loading||!this.data.hasMore)return;var self=this,seq=this._seq;this._loading=true;this.setData({loading:true,message:''});
    v.api('v11promote',{page:this.data.page},function(r){if(self._alive===false||self._seq!==seq)return;self._loading=false;if(!r||!Array.isArray(r.items)){self.setData({loading:false,message:'更多好友暂时没有加载出来'});return;}var a=referral.people(r.items,self.data.page);self.setData({items:self.data.items.concat(a),page:self.data.page+1,hasMore:r.items.length===15,loading:false});},function(){if(self._alive===false||self._seq!==seq)return;self._loading=false;self.setData({message:'更多好友暂时没有加载出来，请重试',loading:false});});
  },
  retry:function(){this.reload();},
  goRules:function(){wx.navigateTo({url:'/sage_dksy/pages/v14/rewards/index?category=invite'});},
  goLedger:function(){wx.navigateTo({url:'/sage_dksy/pages/user/integral'});},
  goPoster:function(){wx.navigateTo({url:'/sage_dksy/pages/v11/promote?mode=poster'});},
  goGrowth:function(){wx.navigateTo({url:'/sage_dksy/pages/growth/index'});}
});
