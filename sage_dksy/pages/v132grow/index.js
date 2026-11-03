var v = require('../../utils/v11.js');
function count(value){if(value===undefined||value===null||value==='')return null;var n=Number(value);return Number.isFinite(n)&&n>=0?Math.floor(n):null;}
function people(rows){return rows.map(function(x){return {member_mask:x.member_mask||'',nickname:x.nickname||'',registered:v.clock(Number(x.registered_at)||0),bound:v.clock(Number(x.bound_at)||0)};});}
function rewards(reply){var c=reply&&reply.published_referral_campaign;var approved=!!(c&&c.approved===true&&c.enabled===true&&c.public_visible===true);var stages=approved&&Array.isArray(c.stages)?c.stages.filter(function(t){return Number(t.coins)>0&&t.label;}).map(function(t){return {label:String(t.label),coins:Math.floor(Number(t.coins))};}):[];return {approved:approved&&stages.length>0,stages:stages,cap:approved?count(c.cap):null,earned:approved&&typeof c.earned==='number'?c.earned:null};}
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
    v.api('v11promote',{page:1},function(r){if(!current())return;if(!r||!Array.isArray(r.items)){fail();return;}var a=people(r.items);self._loading=false;self.setData({direct:count(r.total),today:count(r.today),items:a,page:2,hasMore:a.length===15,loading:false,loaded:true,rewardInfo:rewards(r)});wx.stopPullDownRefresh();},fail);
  },
  loadMore:function(){if(this._loading||!this.data.hasMore)return;var self=this,seq=this._seq;this._loading=true;this.setData({loading:true,message:''});
    v.api('v11promote',{page:this.data.page},function(r){if(self._alive===false||self._seq!==seq)return;self._loading=false;if(!r||!Array.isArray(r.items)){self.setData({loading:false,message:'更多好友暂时没有加载出来'});return;}var a=people(r.items);self.setData({items:self.data.items.concat(a),page:self.data.page+1,hasMore:a.length===15,loading:false});},function(){if(self._alive===false||self._seq!==seq)return;self._loading=false;self.setData({message:'更多好友暂时没有加载出来，请重试',loading:false});});
  },
  retry:function(){this.reload();},
  goPoster:function(){wx.navigateTo({url:'/sage_dksy/pages/v11/promote?mode=poster'});},
  goGrowth:function(){wx.navigateTo({url:'/sage_dksy/pages/growth/index'});}
});
