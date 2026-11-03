'use strict';
var app = getApp();
var v11 = require('../../utils/v11.js');
function safe(v) {
  if (v === null || typeof v === 'undefined') return '';
  var s = String(v).trim();
  return /^(null|undefined|none|NaN)$/i.test(s) ? '' : s;
}
function isIncome(item) { return Number(item.static) === 1; }
function idOf(item) { return safe(item.id || item.log_id || item.ledger_log_id); }
function titleOf(item, labels) {
  var k = idOf(item);
  if (k && labels && labels[k]) return safe(labels[k]) || '阅读激励视频奖励';
  var raw = safe(item.title) || safe(item.remark) || safe(item.remarks) || safe(item.description) || safe(item.content);
  if (/^V12阅读激励任务\s*[a-f0-9]{32}$/i.test(raw) || /^(v12|v1213):.*client.*signal$/i.test(raw)) return '阅读激励视频奖励';
  // Unknown transactions must never be mislabeled as ad earnings solely by amount/date.
  return raw || (isIncome(item) ? '金币收入（未注明来源）' : '金币支出（未注明用途）');
}
function normalize(rows, labels, page) {
  return (Array.isArray(rows) ? rows : []).map(function(row, n) {
    var r = Object.assign({}, row);
    r.ledgerKey = idOf(r) || ('page' + page + '_row' + n);
    r.income = isIncome(r);
    r.displayTitle = titleOf(r, labels);
    r.displayDate = safe(r.createtime) || safe(r.addtime) || safe(r.create_time) || '时间未记录';
    r.displayAmount = String(Math.abs(Number(r.num) || 0));
    return r;
  });
}
function project(page) {
  var list = page.data.num_log || [];
  var filter = page.data.filter || 'all';
  var shown = list.filter(function(r) { return filter === 'all' || (filter === 'in' ? r.income : !r.income); });
  var credit = 0, debit = 0;
  list.forEach(function(r) { if (r.income) credit += Math.abs(Number(r.num)||0); else debit += Math.abs(Number(r.num)||0); });
  page.setData({visibleList:shown,loadedIncome:credit,loadedExpense:debit});
}
Page({
  data:{viewMode:'ledger',balance:null,balanceText:'—',balanceLoading:false,num_log:[],visibleList:[],filter:'all',pages:1,load:true,loading:false,openid:'',labels:{},loadedIncome:0,loadedExpense:0,error:'',firstLoaded:false},
  onLoad:function(q){this._alive=true;this.setData({viewMode:q&&q.view==='wallet'?'wallet':'ledger'});wx.setNavigationBarTitle({title:this.data.viewMode==='wallet'?'我的金币':'金币明细'});this.reload();this.refreshBalance();},
  onUnload:function(){this._alive=false;},
  onShow:function(){if(this._seen){this.reload();this.refreshBalance();}this._seen=true;},
  reload:function(){
    var self=this;
    if(this.data.loading)return;
    this.setData({loading:true,error:''});
    wx.login({success:function(result){
      if(!result.code){self.failed('微信登录失败，请重试');return;}
      self.requestPage(1,{code:result.code},true);
    },fail:function(){self.failed('网络连接失败，请重试');}});
  },
  requestPage:function(page, identity, replace){
    var self=this;
    app.util.request({url:'entry/wxapp/numlog',data:Object.assign({},identity,{pages:page}),cache:'0',
      success:function(response){
        if(!self._alive)return;
        var body=response&&response.data||{};
        if((response.statusCode&&response.statusCode>=400)||!Array.isArray(body.num_log)||(body.error!==undefined&&Number(body.error)!==0)){self.failed('金币记录暂时不可用，请重试');return;}
        var rows=body.num_log;
        var next=normalize(rows,self.data.labels,page);
        var prev=replace?[]:(self.data.num_log||[]);
        var combined=prev.concat(next);
        self.setData({num_log:combined,openid:safe(body.openid)||self.data.openid,pages:page,load:rows.length>0&&(replace||Number(body.page)===1),loading:false,error:'',firstLoaded:true});
        project(self);self.loadVerifiedLabels();
        wx.stopPullDownRefresh();
      },fail:function(){self.failed('金币记录加载失败，请重试');}});
  },
  loadVerifiedLabels:function(){
    var self=this;
    v11.api('v1214ledgerlabels',{},function(reply){
      if(!self._alive || !reply || !reply.labels)return;
      var labels=Object.assign({},self.data.labels,reply.labels);
      var rows=(self.data.num_log||[]).map(function(r){
        var v=Object.assign({},r);v.displayTitle=titleOf(v,labels);return v;
      });
      self.setData({labels:labels,num_log:rows});project(self);
    },function(){/* Older server: keep truthful non-specific title fallback. */});
  },
  failed:function(msg){if(!this._alive)return;this.setData({loading:false,error:msg});wx.stopPullDownRefresh();},
  refreshBalance:function(){
    if(this._balanceBusy)return;this._balanceBusy=true;this.setData({balanceLoading:true});var self=this;
    function finish(value){self._balanceBusy=false;if(!self._alive)return;var valid=value!==null&&value!==undefined&&typeof value!=='boolean'&&typeof value!=='object'&&String(value).trim()!==''&&isFinite(Number(value))&&Number(value)>=0;var patch={balanceLoading:false};if(valid){patch.balance=Number(value);patch.balanceText=String(Number(value)).replace(/\B(?=(\d{3})+(?!\d))/g,',');}self.setData(patch);}
    wx.login({success:function(auth){if(!auth.code){finish(null);return;}app.secureRequest({url:app.util.url('entry/wxapp/set')+'m=sage_dksy',method:'POST',data:{code:auth.code},timeout:15000,success:function(r){var b=r&&r.data;if(r&&r.statusCode>=200&&r.statusCode<300&&b&&typeof b==='object'&&!Number(b.error)&&b.userinfo)finish(b.userinfo.num);else finish(null);},fail:function(){finish(null);}});},fail:function(){finish(null);}});
  },
  showLedger:function(){this.setData({viewMode:'ledger'});wx.setNavigationBarTitle({title:'金币明细'});},
  goEarn:function(){wx.redirectTo({url:'/sage_dksy/pages/v14/tasks/index'});},
  goGifts:function(){wx.redirectTo({url:'/sage_dksy/pages/prize/index'});},
  chooseFilter:function(e){this.setData({filter:e.currentTarget.dataset.filter||'all'});project(this);},
  retry:function(){this.reload();},
  loadMore:function(){this.onReachBottom();},
  onPullDownRefresh:function(){this.reload();},
  onReachBottom:function(){if(!this.data.load || this.data.loading || !this.data.openid)return;this.setData({loading:true});this.requestPage(this.data.pages+1,{openid:this.data.openid},false);}
});
