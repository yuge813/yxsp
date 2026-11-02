'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPage,flush}=require('./helpers/load-page.cjs');
const DETAIL='sage_dksy/pages/prize/prize_show.js',LIST='sage_dksy/pages/prize/index.js',ORDERS='sage_dksy/pages/user/order.js';
function fixture(file=DETAIL){
 const requests=[],logins=[],subscriptions=[],tracks=[];
 const r=loadPage(file,{wx:{request:o=>requests.push(o),login:o=>logins.push(o),requestSubscribeMessage:o=>subscriptions.push(o)},modules:{'sage_dksy/utils/v10.js':{track:(...args)=>tracks.push(args),api(){},shareCover:s=>s},'sage_dksy/wxParse/wxParse.js':{wxParse(){}}}});
 return {...r,requests,logins,subscriptions,tracks};
}
function seed(f,change={}){
 f.page.setData({id:7,loading:false,accountReady:true,priceReady:true,stockReady:true,balance:120,prize_show:{prize_id:7,prize_title:'测试商品',prize_type:1,prize_num:5,prize_integral:30},remark:'测试接收信息',yx38OrderTemplateIds:['template-id-for-testing'],...change});
}
function submit(f){f.page.duihuan();f.page.confirmRedeem();f.subscriptions.at(-1)?.complete({});f.logins.at(-1).success({code:'test-code'});return f.requests.at(-1);}
test('redemption opens an explicit confirmation before sending any order request',()=>{
 const f=fixture();seed(f);f.page.duihuan();assert.equal(f.page.data.confirmVisible,true);assert.equal(f.requests.length,0);assert.equal(f.logins.length,0);assert.equal(f.subscriptions.length,0);
 f.page.closeConfirmation();assert.equal(f.page.data.confirmVisible,false);f.page.confirmRedeem();assert.equal(f.requests.length,0);assert.equal(f.subscriptions.length,0);
});
test('redemption guard covers confirmation, subscription, login and in-flight request',()=>{
 const f=fixture();seed(f);f.page.duihuan();f.page.confirmRedeem();f.page.confirmRedeem();f.page.duihuan();
 assert.equal(f.page.data.submitting,true);assert.equal(f.subscriptions.length,1);assert.equal(f.logins.length,0);
 f.page.closeConfirmation();assert.equal(f.page.data.confirmVisible,true,'cannot dismiss while submitting');
 f.subscriptions[0].complete({errMsg:'reject'});f.subscriptions[0].complete({errMsg:'duplicate SDK callback'});assert.equal(f.logins.length,1,'subscribe completion is one-shot');
 f.page.confirmRedeem();f.logins[0].success({code:'test-code'});f.page.confirmRedeem();assert.equal(f.requests.length,1);assert.match(f.requests[0].url,/entry\/wxapp\/order/);
 f.requests[0].success({statusCode:200,data:{error:0}});assert.equal(f.page.data.orderSuccess,true);assert.equal(f.page.data.submitting,false);assert.equal(f.tracks.length,1);
 f.page.duihuan();f.page.confirmRedeem();assert.equal(f.requests.length,1,'successful order cannot be resubmitted');
 f.page.goOrders();assert.match(f.calls.find(c=>c.name==='redirectTo').args[0].url,/user\/order$/);
});
test('redemption blocks unknown price, unknown stock, missing account and insufficient coins',()=>{
 for(const change of [{priceReady:false},{stockReady:false},{accountReady:false},{balance:null},{balance:29},{prize_show:{prize_type:1,prize_num:0,prize_integral:30}},{remark:''}]){
  const f=fixture();seed(f,change);f.page.duihuan();assert.equal(f.page.data.confirmVisible,false,JSON.stringify(change));assert.equal(f.requests.length,0);
 }
});
test('redemption rechecks stock and balance when the confirmation is accepted',()=>{
 for(const change of [{stockReady:false},{balance:1},{prize_show:{prize_num:0,prize_integral:30,prize_type:1}}]){
  const f=fixture();seed(f);f.page.duihuan();f.page.setData(change);f.page.confirmRedeem();assert.equal(f.page.data.confirmVisible,false);assert.equal(f.page.data.submitting,false);assert.equal(f.subscriptions.length,0);
 }
});
test('login failure unlocks redemption without posting an order',()=>{
 const f=fixture();seed(f);f.page.duihuan();f.page.confirmRedeem();f.subscriptions[0].complete({});f.logins[0].fail({errMsg:'login failed'});
 assert.equal(f.requests.length,0);assert.equal(f.page.data.submitting,false);assert.equal(f.page.data.orderUnknown,false);assert.ok(f.page.data.orderMessage);
 f.page.duihuan();assert.equal(f.page.data.confirmVisible,true,'a known pre-submit login failure can be retried');
});
test('network interruption after posting blocks another order until the user verifies records',()=>{
 const f=fixture();seed(f);submit(f).fail({errMsg:'offline'});
 assert.equal(f.page.data.orderUnknown,true);assert.equal(f.page.data.orderSuccess,false);assert.equal(f.page.data.submitting,false);
 f.page.duihuan();f.page.confirmRedeem();assert.equal(f.requests.length,1);assert.equal(f.subscriptions.length,1);
 assert.match(f.page.data.orderMessage,/兑换记录/);
});
test('ambiguous or malformed redemption replies cannot show success or allow another submission',()=>{
 for(const response of [{statusCode:500,data:{error:0}},{statusCode:200,data:{}},{statusCode:200,data:{error:null}},{statusCode:200,data:'bad'}]){
  const f=fixture();seed(f);submit(f).success(response);assert.equal(f.page.data.orderUnknown,true);assert.equal(f.page.data.orderSuccess,false);assert.equal(f.tracks.length,0);
 }
});
test('definite business rejection unlocks redemption and hides technical server details',()=>{
 const f=fixture();seed(f);submit(f).success({statusCode:200,data:{error:1,msg:'PHP SQLSTATE credential token failure'}});
 assert.equal(f.page.data.orderUnknown,false);assert.equal(f.page.data.orderSuccess,false);assert.equal(f.page.data.submitting,false);assert.doesNotMatch(f.page.data.orderMessage,/PHP|SQLSTATE|token/);
});
test('gift list network error preserves loaded goods and retries the correct pagination page',()=>{
 const f=fixture(LIST);f.page.setData({loading:false,prize:[{prize_id:1}],pages:1,hasMore:true});f.page.loadMore();assert.equal(f.requests[0].data.pages,2);f.requests[0].fail({});
 assert.equal(f.page.data.prize.length,1);assert.equal(f.page.data.pages,1);assert.ok(f.page.data.moreError);assert.equal(f.page.data.loadingMore,false);
 f.page.loadMore();assert.equal(f.requests[1].data.pages,2);f.requests[1].success({statusCode:200,data:{prize:[{prize_id:2}],page:1}});assert.equal(f.page.data.prize.length,2);assert.equal(f.page.data.pages,2);
});
test('gift list distinguishes malformed response from a truly empty catalog',()=>{
 for(const body of [{}, {prize:null}, {error:1,prize:[]}]){
  const f=fixture(LIST);f.page.loadPage(true);f.requests[0].success({statusCode:200,data:body});assert.ok(f.page.data.error);assert.equal(f.page.data.loading,false);
 }
 const f=fixture(LIST);f.page.loadPage(true);f.requests[0].success({statusCode:200,data:{prize:[],page:0}});assert.equal(f.page.data.error,'');assert.equal(f.page.data.prize.length,0);assert.equal(f.page.data.hasMore,false);
});
test('gift list unknown wallet values are not shown as zero coins',()=>{
 for(const balance of [null,undefined,'']){
  const f=fixture(LIST);f.page.refresh();f.logins[0].success({code:'test-code'});f.requests[0].success({statusCode:200,data:{userinfo:{num:balance},openid:'test-user'}});assert.equal(f.page.data.balance,null);
 }
});
test('order refresh failure preserves current records and a later onShow reloads',()=>{
 const f=fixture(ORDERS);f.page.setData({userorder:[{id:1}],loading:false});f.page.onShow();f.page.onShow();assert.equal(f.logins.length,1);f.logins[0].success({code:'test-code'});f.requests[0].fail({});
 assert.equal(f.page.data.userorder.length,1);assert.equal(f.page.data.loading,false);assert.ok(f.page.data.error);
 f.page.onShow();assert.equal(f.logins.length,2);f.logins[1].success({code:'test-code'});f.requests[1].success({statusCode:200,data:{userorder:[],page:0}});assert.equal(f.page.data.userorder.length,0);assert.equal(f.page.data.error,'');assert.equal(f.page.data.hasMore,false);
});
