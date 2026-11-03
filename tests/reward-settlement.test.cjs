'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {makeRuntime}=require('./helpers/load-page.cjs');
const UNIT='adunit-12345678';
const READY={error:0,logged_in:1,reward_enabled:1,mode:'native_auto_1234567890',coins:2,remaining:3,daily_limit:10,cooldown_sec:600,now:1000,next_at:0,ad_unit_id:UNIT};
function fixture(channel='read',status={},options={}){
 const api=[],native=[];
 const runtime=makeRuntime({wx:{createRewardedVideoAd:opts=>{native.push(opts);return {onClose(){},onError(){},show:()=>Promise.resolve(),offClose(){},offError(){},destroy(){}};}},modules:{'sage_dksy/utils/v11.js':{api:(name,data,resolve)=>{
  api.push({name,data});
  if(name==='v12status')resolve({...READY,...status});
  else if(name==='v12start')resolve({task_id:'a'.repeat(32),ad_unit_id:UNIT});
  else if(name==='v12signal')resolve(data.signal==='ended'?{paid:true,status:'settled'}:{status:'closed_unpaid'});
  else if(name==='v12task')resolve(options.ledger||{paid:true,status:'settled',coins:2});else resolve({error:0});
 }}}});
 const {page}=runtime.instantiate('sage_dksy/pages/v14/tasks/index.js');page.rewardControl={refresh:()=>Promise.resolve()};
 const host=runtime.load('/workspace/yxsp/sage_dksy/utils/v12234_reward_inline.js').create(page,channel);
 return {page,host,api,native,runtime};
}
test('reward host reserves and plays using the explicitly selected channel',async()=>{
 for(const channel of ['home','read']){const f=fixture(channel);await f.host.play(UNIT);assert.equal(f.host.phase,'playing');assert.equal(f.native.length,1);assert.equal(f.api.find(c=>c.name==='v12status').data.channel,channel);assert.equal(f.api.find(c=>c.name==='v12start').data.channel,channel);}
});
test('closing early or without a completed-watch signal never claims a reward',async()=>{
 for(const result of [{isEnded:false},undefined,{}]){
  const f=fixture();await f.host.play(UNIT);await f.host.closed(result);
  assert.equal(f.host.phase,'idle');assert.equal(f.api.find(c=>c.name==='v12signal').data.signal,'closed');
  assert.equal(f.api.some(c=>['v125clientclaim','v12task'].includes(c.name)),false);
 }
});
test('completed native video verifies server ledger before presenting an earned reward',async()=>{
 const f=fixture();await f.host.play(UNIT);await f.host.closed({isEnded:true});
 assert.equal(f.host.phase,'idle');assert.equal(f.api.find(c=>c.name==='v12signal').data.signal,'ended');assert.equal(f.api.filter(c=>c.name==='v12task').length,1);assert.equal(f.api.some(c=>c.name==='v125clientclaim'),false);
});
test('an unavailable or changed reward configuration never reserves an ad task',async()=>{
 for(const change of [{reward_enabled:0},{mode:'manual_verified'},{pending_task:'pending'},{remaining:0},{budget_blocked:1},{next_at:1030},{coins:3},{ad_unit_id:'adunit-abcdefgh'}]){
  const f=fixture('home',change);await f.host.play(UNIT);assert.equal(f.native.length,0,JSON.stringify(change));assert.equal(f.api.some(c=>c.name==='v12start'),false);assert.equal(f.host.phase,'idle');
 }
});
test('native playback failure closes the reservation with no-fill instead of settling it',async()=>{
 const f=fixture();await f.host.play(UNIT);await f.host.failed({errCode:1004});assert.equal(f.host.phase,'idle');assert.equal(f.api.find(c=>c.name==='v12signal').data.signal,'no_fill');assert.equal(f.api.some(c=>['v125clientclaim','v12task'].includes(c.name)),false);
});

test('paid result is emitted only after the server ledger confirms settlement',async()=>{
 const f=fixture('home');const events=[];f.page.onRewardResult=r=>events.push(r);await f.host.play(UNIT);assert.equal(events.length,0);await f.host.closed({isEnded:true});assert.equal(events.length,1);assert.equal(events[0].state,'paid');assert.equal(events[0].coins,2);assert.equal(events[0].taskId,'a'.repeat(32));assert.equal(f.api.filter(x=>x.name==='v12task').length,1);
});
test('early close emits unpaid and never a successful reward result',async()=>{
 const f=fixture('home');const events=[];f.page.onRewardResult=r=>events.push(r);await f.host.play(UNIT);await f.host.closed({isEnded:false});assert.equal(events.length,1);assert.equal(events[0].state,'unpaid');assert.equal(events[0].coins,null);assert.equal(f.api.some(x=>x.name==='v12task'),false);
});
test('settled ledger with a missing amount stays unknown instead of showing zero coins',async()=>{
 const f=fixture('home',{}, {ledger:{paid:1,status:'settled'}});const events=[];f.page.onRewardResult=r=>events.push(r);await f.host.play(UNIT);await f.host.closed({isEnded:true});assert.equal(events[0].state,'paid');assert.equal(events[0].coins,null);
});
test('unverified completed video emits pending without a paid event',async()=>{
 const f=fixture('home',{}, {ledger:{paid:0,status:'pending_verification'}});const events=[];f.page.onRewardResult=r=>events.push(r);await f.host.play(UNIT);f.runtime.contexts.get('/workspace/yxsp/sage_dksy/utils/v12234_reward_inline.js').setTimeout=fn=>{fn();return 1;};await f.host.closed({isEnded:true});assert.equal(events.length,1);assert.equal(events[0].state,'pending');assert.equal(events[0].coins,null);assert.equal(f.api.filter(x=>x.name==='v12task').length,3);
});
test('a result-view callback error cannot alter the settled ledger outcome',async()=>{
 const f=fixture('home');f.page.onRewardResult=()=>{throw new Error('view failed');};await f.host.play(UNIT);await f.host.closed({isEnded:true});assert.equal(f.host.phase,'idle');assert.equal(f.api.filter(x=>x.name==='v12task').length,1);
});
