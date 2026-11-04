'use strict';
var api=require('./v11.js').api;
function obj(x){return !!x&&typeof x==='object'&&!Array.isArray(x);}
function count(x){if((typeof x!=='number'&&typeof x!=='string')||String(x).trim()==='')return null;var n=Number(x);return Number.isSafeInteger(n)&&n>=0?n:null;}
function yes(x){return x===true||x===1||x==='1';}
function text(x,n){return typeof x==='string'?x.trim().slice(0,n||120):'';}
function date(x){var n=count(x);if(!n)return '';try{return new Date((n+28800)*1000).toISOString().slice(0,16).replace('T',' ');}catch(_){return '';}}
function empty(){return {loaded:false,loading:false,error:'',campaign:null,mine:null,inviter:{earned:null,pending_coins:null,qualified:null,waiting:null},records:[],page:0,has_more:false};}
var labels={waiting_sign:'等待首次签到',waiting_retention:'等待签到达标',completed:'本次礼遇已完成',expired:'本次参与已到期',no_budget:'本次暂无奖励名额',relation_changed:'邀请归属待核对',pending:'奖励正在核验',not_invited:'暂无受邀参与记录',unavailable:'本次奖励暂不可用'};
function normalize(raw){
 if(!obj(raw)||(raw.error!==0&&raw.error!=='0')||(raw.version!==1&&raw.version!=='1')||!Array.isArray(raw.records))throw new Error('invalid');
 var r=empty(),c=raw.campaign;r.loaded=true;
 if(c!==null&&c!==undefined){
  if(!obj(c)||!yes(c.enabled)||!yes(c.public_visible))throw new Error('campaign');
  var a=count(c.inviter_points),b=count(c.invitee_points),days=count(c.min_sign_days),window=count(c.window_days);
  if(a===null||b===null||days===null||days<1||window===null||window<days||window>366)throw new Error('campaign');
  r.campaign={name:text(c.name)||'一级邀请礼遇',inviter_points:a,invitee_points:b,min_sign_days:days,window_days:window,rules_text:text(c.rules_text,800),ends:date(c.ends_at)};
 }
 if(obj(raw.mine)&&Object.prototype.hasOwnProperty.call(labels,raw.mine.state)){
  var m=raw.mine;r.mine={state:m.state,title:labels[m.state],signed_days:count(m.signed_days),required_days:count(m.required_days),invitee_coins:count(m.invitee_coins),inviter_coins:count(m.inviter_coins),invitee_paid:yes(m.invitee_paid),inviter_paid:yes(m.inviter_paid),expires:date(m.expires_at)};
  r.mine.visible=['not_invited','unavailable'].indexOf(m.state)<0;
  r.mine.canSign=['waiting_sign','waiting_retention'].indexOf(m.state)>=0;
 }
 var totals=obj(raw.inviter)?raw.inviter:{};
 ['earned','pending_coins','qualified','waiting'].forEach(function(k){r.inviter[k]=count(totals[k]);});
 r.records=raw.records.map(function(x){
  if(!obj(x)||['invitee_first_sign','inviter_retention'].indexOf(x.stage)<0||['invitee','inviter'].indexOf(x.role)<0||['paid','waiting','expired','no_budget','relation_changed'].indexOf(x.status)<0||count(x.coins)===null||!((typeof x.id==='string'&&x.id.trim())||count(x.id)!==null))throw new Error('record');
  var paid=x.status==='paid'&&count(x.paid_at)>0&&count(x.coins)>0;
  return {id:String(x.id),coins:count(x.coins),paid:paid,status:paid?'已到账':x.status==='waiting'?'待达标':x.status==='expired'?'已到期':x.status==='no_budget'?'暂无名额':x.status==='paid'?'待核对':'归属待核对',title:x.role==='invitee'?'新人首次签到奖励':'一级邀请留存奖励',member_label:text(x.member_label,32),time:date(paid?x.paid_at:x.created_at),signed_days:count(x.signed_days),required_days:count(x.required_days)};
 });
 r.page=count(raw.page);if(!r.page||typeof raw.has_more!=='boolean')throw new Error('pagination');r.has_more=raw.has_more;
 return r;
}
function identity(page){var stored='';try{stored=wx.getStorageSync('openid')||wx.getStorageSync('sage_safe_token')||'';}catch(_){}return String(page._identityKey||'')+'|'+String(stored);}
function active(page){return page._alive!==false&&!page._disposed;}
function load(page,options){
 options=options||{};if(!active(page))return;
 var owner=identity(page),old=page.data.rr||empty();
 if(page._rrOwner!==undefined&&page._rrOwner!==owner){old=empty();page.setData({rr:old});}
 if(old.loading&&!options.force)return;
 var append=!!options.more,next=append?old.page+1:1,seq=page._rrSeq=(page._rrSeq||0)+1;page._rrOwner=owner;
 page.setData({'rr.loading':true,'rr.error':''});
 function current(){if(!active(page)||page._rrSeq!==seq)return false;var now=identity(page);if(now!==owner){page._rrOwner=now;page.setData({rr:empty()});return false;}return true;}
 function fail(){if(!current())return;page.setData({'rr.loading':false,'rr.error':'推广奖励暂未同步，请稍后重试。'});}
 api('v150referralsummary',{page:next},function(raw){
  if(!current())return;var r;try{r=normalize(raw);}catch(_){fail();return;}
  if(append){var seen=Object.create(null);r.records=old.records.concat(r.records).filter(function(row){if(seen[row.id])return false;seen[row.id]=true;return true;});}
  page.setData({rr:r});
  if(r.mine&&r.mine.invitee_paid&&!(old.mine&&old.mine.invitee_paid)&&typeof page.refreshWallet==='function')page.refreshWallet();
 },fail);
}
function refresh(){load(this,{force:true});}
function more(){var r=this.data.rr;if(r&&r.has_more&&!r.loading)load(this,{more:true});}
function records(){wx.navigateTo({url:'/sage_dksy/pages/v132grow/index?tab=rewards'});}
function sign(){wx.navigateTo({url:'/sage_dksy/pages/v14/sign/index'});}
module.exports={empty:empty,normalize:normalize,load:load,refresh:refresh,more:more,records:records,sign:sign};
