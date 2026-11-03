'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ROOT,makeRuntime,flush}=require('./helpers/load-page.cjs');
const LIST='sage_dksy/pages/v12/list.js',DETAIL='sage_dksy/pages/v12/detail.js';
const UNIT='adunit-12345678',TASK='a'.repeat(32);
const ready=()=>({error:0,logged_in:1,reward_enabled:1,mode:'native_auto_1234567890',coins:2,remaining:3,daily_limit:10,cooldown_sec:600,now:Math.floor(Date.now()/1000),next_at:0,ad_unit_id:UNIT});
function pageFixture(file=LIST,options={}){
 const api=[],ads=[];
 const runtime=makeRuntime({wx:{createRewardedVideoAd:opts=>{
  const ad={opts,shows:0,destroyed:false,onClose(fn){this.close=fn;},onError(fn){this.error=fn;},show(){this.shows++;return Promise.resolve();},offClose(){this.closeDetached=true;},offError(){this.errorDetached=true;},destroy(){this.destroyed=true;}};ads.push(ad);return ad;
 }},modules:{'sage_dksy/utils/v11.js':{registerVisit(){},api:(name,data,resolve)=>{
  api.push({name,data});
  if(name==='v12feed')resolve({items:[{id:7,title:'真实接口测试文章',body:'正文内容'}],has_more:false});
  else if(name==='v12detail')resolve({article:{id:7,title:'真实接口测试文章',body:'正文内容'},favorite:0});
  else if(name==='v12status')resolve({...ready(),...options.status});
  else if(name==='v12start')resolve({task_id:TASK,ad_unit_id:UNIT});
  else if(name==='v12signal')resolve(data.signal==='ended'?{paid:true,status:'settled'}:{status:'closed_unpaid'});
  else if(name==='v12task')resolve(options.ledger||{paid:true,status:'settled',coins:2});
  else resolve({error:0});
 }}}});
 const {page}=runtime.instantiate(file);page.onLoad({id:7});page.onShow();
 return {runtime,page,api,ads};
}
function pendingFixture(ledger,options={}){
 const api=[],results=[];let resolveLedger;
 const runtime=makeRuntime({modules:{'sage_dksy/utils/v11.js':{api:(name,data,resolve)=>{
  api.push({name,data});
  if(name==='v12status')resolve({...ready(),pending_task:api.filter(x=>x.name==='v12status').length===1?TASK:'',pending_status:'pending_verification'});
  else if(name==='v12task'){if(options.defer)resolveLedger=resolve;else resolve(ledger);}
 }}}});
 const {page}=runtime.instantiate(LIST);page._alive=true;
 page.onRewardResult=options.callback||function(result){results.push(result);};
 const control=runtime.load(ROOT+'/sage_dksy/utils/v12read.js').makeReward(page);control.start();
 return {runtime,page,control,api,results,resolveLedger:value=>resolveLedger(value)};
}
test('reading list and article load free content without creating or reserving a rewarded ad',async()=>{
 for(const file of [LIST,DETAIL]){
  const f=pageFixture(file,{status:{reward_enabled:0}});await flush();
  assert.ok(file===LIST?f.page.data.items.length:f.page.data.article);
  assert.equal(f.ads.length,0);assert.equal(f.api.some(x=>x.name==='v12start'),false);
  f.page.watch();await flush();assert.equal(f.ads.length,0);
 }
});
test('reading pages present paid results only after the real native host verifies the read-channel ledger',async()=>{
 for(const file of [LIST,DETAIL]){
  const f=pageFixture(file);await flush();f.page.watch();await flush();
  assert.equal(f.ads.length,1);assert.equal(f.ads[0].shows,1);assert.equal(f.page.data.rewardResult,null);
  assert.equal(f.api.find(x=>x.name==='v12start').data.channel,'read');
  await f.ads[0].close({isEnded:true});
  assert.equal(f.api.filter(x=>x.name==='v12task').length,1);
  assert.equal(f.page.data.rewardResult.state,'paid');assert.equal(f.page.data.rewardResult.coins,2);
  assert.equal(f.api.some(x=>x.name==='v125clientclaim'),false);
 }
});
test('early close leaves reading available and produces an unpaid result without requesting ledger payout',async()=>{
 for(const file of [LIST,DETAIL]){
  const f=pageFixture(file);await flush();f.page.watch();await flush();await f.ads[0].close({isEnded:false});
  assert.equal(f.page.data.rewardResult.state,'unpaid');assert.equal(f.page.data.rewardResult.coins,null);
  assert.equal(f.api.some(x=>x.name==='v12task'),false);
  assert.ok(file===LIST?f.page.data.items.length:f.page.data.article);
 }
});
test('native no-fill displays a recoverable error instead of a fabricated reading reward',async()=>{
 const f=pageFixture(DETAIL);await flush();f.page.watch();await flush();await f.ads[0].error({errCode:1004});
 assert.equal(f.page.data.rewardResult.state,'error');assert.equal(f.page.data.rewardResult.coins,null);
 assert.equal(f.api.find(x=>x.name==='v12signal').data.signal,'no_fill');assert.ok(f.page.data.article);
 assert.equal(f.api.some(x=>x.name==='v12task'),false);
});
test('reading result adapters reject missing or invalid paid amounts and discard stale gains on pending/unpaid/error',async()=>{
 const f=pageFixture();await flush();
 for(const value of [null,undefined,'',true,{},[],NaN,Infinity,-1]){
  f.page.onRewardResult({state:'paid',coins:value});assert.equal(f.page.data.rewardResult.state,'pending');assert.equal(f.page.data.rewardResult.coins,null);
 }
 f.page.onRewardResult({state:'paid',coins:'2'});assert.equal(f.page.data.rewardResult.coins,2);
 for(const state of ['pending','unpaid','error']){f.page.onRewardResult({state,coins:99});assert.equal(f.page.data.rewardResult.state,state);assert.equal(f.page.data.rewardResult.coins,null);}
});
test('unloaded reading pages destroy native ads and ignore late result, dismiss and play events',async()=>{
 for(const file of [LIST,DETAIL]){
  const f=pageFixture(file);await flush();f.page.watch();await flush();f.page.onUnload();
  assert.equal(f.ads[0].closeDetached,true);assert.equal(f.ads[0].errorDetached,true);assert.equal(f.page._yxRewardAd,null);
  // Native view destruction is deliberately deferred until its closing animation ends.
  f.runtime.calls.filter(x=>x.name==='timer').at(-1).args[0]();assert.equal(f.ads[0].destroyed,true);
  const snapshot=JSON.stringify(f.page.data),count=f.api.length;
  f.page.onRewardResult({state:'paid',coins:999});f.page.dismissReward();f.page.watch();await flush();
  assert.equal(JSON.stringify(f.page.data),snapshot);assert.equal(f.api.length,count);assert.equal(f.ads.length,1);
 }
});
test('pending read polling never treats false or string zero as a paid ledger',async()=>{
 for(const paid of [false,0,'0',null,undefined,[],{}]){
  const f=pendingFixture({paid,status:'pending_verification',coins:2});await flush();
  assert.equal(f.results.length,0);assert.equal(f.runtime.calls.some(x=>x.name==='showToast'),false);
  assert.equal(f.api.filter(x=>x.name==='v12status').length,1);
 }
});
test('pending read polling reports only explicit confirmation and preserves missing or invalid amounts as unknown',async()=>{
 for(const paid of [true,1,'1']){
  const f=pendingFixture({paid,status:'pending_verification',coins:'2'});await flush();
  assert.equal(f.results.length,1);assert.equal(f.results[0].state,'paid');assert.equal(f.results[0].coins,2);assert.equal(f.results[0].taskId,TASK);
 }
 for(const coins of [undefined,null,'',false,{},[],Infinity,-1]){
  const f=pendingFixture({paid:false,status:'settled',coins});await flush();
  assert.equal(f.results[0].state,'paid');assert.equal(f.results[0].coins,null);
  const toast=f.runtime.calls.find(x=>x.name==='showToast');assert.match(toast.args[0].title,/核对金币明细/);assert.doesNotMatch(toast.args[0].title,/\+0/);
 }
});
test('a pending reading result becomes paid only when status polling confirms the actual ledger',async()=>{
 const f=pageFixture(DETAIL,{status:{pending_task:TASK,pending_status:'pending_verification'}});await flush();
 assert.equal(f.ads.length,0);assert.equal(f.api.find(x=>x.name==='v12task').data.task_id,TASK);
 assert.equal(f.page.data.rewardResult.state,'paid');assert.equal(f.page.data.rewardResult.coins,2);
 assert.ok(f.page.data.article);
});
test('finished unpaid read tasks report unpaid and stopped polling ignores late ledger callbacks',async()=>{
 const unpaid=pendingFixture({paid:0,status:'closed_unpaid'});await flush();assert.equal(unpaid.results[0].state,'unpaid');assert.equal(unpaid.results[0].coins,null);
 const f=pendingFixture(null,{defer:true});await flush();f.control.stop();f.resolveLedger({paid:true,status:'settled',coins:2});await flush();
 assert.equal(f.results.length,0);assert.equal(f.runtime.calls.some(x=>x.name==='showToast'),false);assert.equal(f.api.filter(x=>x.name==='v12status').length,1);
});
test('a read result display failure cannot prevent confirmed ledger refresh',async()=>{
 const f=pendingFixture({paid:true,status:'settled',coins:2},{callback(){throw new Error('view unavailable');}});await flush();
 assert.equal(f.api.filter(x=>x.name==='v12status').length,2);
});
