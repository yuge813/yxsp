'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPage,flush}=require('./helpers/load-page.cjs');
const HOME='sage_dksy/pages/index/index.js',TASKS='sage_dksy/pages/v14/tasks/index.js',SIGN='sage_dksy/pages/v14/sign/index.js';
const UNIT='adunit-12345678';
const READY={error:0,logged_in:1,reward_enabled:1,mode:'native_auto_1234567890',coins:2,remaining:3,daily_limit:10,cooldown_sec:600,now:1000,next_at:0,ad_unit_id:UNIT};
function fixture(file=TASKS){
 const calls=[],requests=[],logins=[],played=[],channels=[];
 const reader={call:(name,data)=>new Promise((resolve,reject)=>calls.push({name,data,resolve,reject}))};
 const runtime=loadPage(file,{wx:{request:options=>requests.push(options),login:options=>logins.push(options)},modules:{'sage_dksy/utils/v12read.js':reader,'sage_dksy/utils/v11.js':{api(){},autoBindReferral(){}},'sage_dksy/utils/v12234_reward_inline.js':{create:(page,channel)=>{channels.push(channel);return {phase:'idle',play:unit=>{played.push(unit);return Promise.resolve();},destroy(){}};}}}});
 return {...runtime,calls,requests,logins,played,channels};
}
test('home and task availability distinguish disabled, pending, limit, budget, cooling and invalid units',()=>{
 for(const [file,fn,enabled] of [[HOME,'makeTodayTask','enabled'],[TASKS,'taskView','available']]){
  const f=fixture(file),project=f.evaluate(fn);
  assert.equal(project(READY)[enabled],true);
  const cases=[[{logged_in:0},'unavailable'],[{logged_in:undefined},'unavailable'],[{error:1},'unavailable'],[{mode:'manual_verified'},'disabled'],[{mode:undefined},'disabled'],[{reward_enabled:0},'disabled'],[{pending_task:'task'},'pending'],[{remaining:0},'limit'],[{remaining:null},'unavailable'],[{remaining:''},'unavailable'],[{budget_blocked:1},'disabled'],[{next_at:1030},'cool'],[{ad_unit_id:'not-an-ad'},'unavailable']];
  for(const [change,state] of cases){const result=project({...READY,...change});assert.equal(result.state,state,`${fn}: ${JSON.stringify(change)}`);assert.equal(result[enabled],false);}
 }
});
test('bounded native reward configuration rejects untrusted amounts and limits',()=>{
 for(const file of [HOME,TASKS]){
  const f=fixture(file),project=f.evaluate(file===HOME?'makeTodayTask':'taskView');
  for(const change of [{coins:null},{coins:''},{coins:0},{coins:3},{coins:-1},{daily_limit:11},{cooldown_sec:599}])assert.equal(project({...READY,...change}).state,'disabled');
 }
});
test('task click rechecks home channel and will not play when fresh state is cooling',async()=>{
 const f=fixture();f.page.setData({home:f.evaluate('taskView')(READY)});
 const promise=f.page.watchHome();f.page.watchHome();assert.equal(f.calls.length,1);assert.equal(f.calls[0].data.channel,'home');
 f.calls[0].resolve({...READY,next_at:1030});await promise;assert.equal(f.played.length,0);assert.equal(f.page.data.home.state,'cool');assert.equal(f.page.data.watching,false);
});
test('task click plays on its current host with explicit home reward channel',async()=>{
 const f=fixture();f.page.setData({home:f.evaluate('taskView')(READY)});const promise=f.page.watchHome();f.calls[0].resolve(READY);await promise;
 assert.deepEqual(f.channels,['home']);assert.deepEqual(f.played,[UNIT]);assert.equal(f.page.data.watching,false);
});
test('task channels load independently so a failed read request does not erase a ready home task',async()=>{
 const f=fixture(),promise=f.page.load();assert.equal(f.calls.length,2);assert.deepEqual(f.calls.map(c=>c.data.channel),['home','read']);
 f.calls[0].resolve(READY);f.calls[1].reject(new Error('offline'));await promise;
 assert.equal(f.page.data.home.available,true);assert.equal(f.page.data.read.available,false);assert.ok(f.page.data.error);assert.equal(f.page.data.loading,false);
});
test('home onShow refreshes a real wallet and image errors update the displayed homeGoods',async()=>{
 const f=fixture(HOME);f.page.setData({loaded:true,num:10,prize:[{prize_id:1},{prize_id:2}],homeGoods:[{prize_id:1},{prize_id:2}]});f.page.onShow();
 assert.equal(f.logins.length,1);f.logins[0].success({code:'test-code'});const request=f.requests.find(r=>r.url.includes('/set?'));assert.ok(request);
 request.success({statusCode:200,data:{error:0,userinfo:{num:12}}});await flush();assert.equal(f.page.data.num,12);
 f.page.onPrizeImageError({currentTarget:{dataset:{id:'1'}}});assert.equal(f.page.data.prize[0]._imageFailed,true);assert.equal(f.page.data.homeGoods[0]._imageFailed,true);assert.equal(f.page.data.homeGoods[1]._imageFailed,undefined);
});
test('wallet failure preserves an already loaded amount and permits another refresh',async()=>{
 const f=fixture(HOME);f.page.setData({num:12});let promise=f.page.refreshWallet();f.logins[0].success({code:'test-code'});f.requests[0].fail({errMsg:'offline'});await promise;assert.equal(f.page.data.num,12);
 promise=f.page.refreshWallet();assert.equal(f.logins.length,2);f.logins[1].success({code:'test-code'});f.requests[1].success({statusCode:200,data:{error:0,userinfo:{num:0}}});await promise;assert.equal(f.page.data.num,0);
});
test('sign cards show unknown rewards as unknown and use server streak to mark the current day',()=>{
 const f=fixture(HOME),build=f.evaluate('buildSignCards');const empty=build({},0,false);assert.equal(empty.length,7);assert.ok(empty.every(d=>d.amount===null));assert.equal(empty[0].active,true);
 const days=build({day1:5,day2:10,day3:20},2,false);assert.equal(days[0].done,true);assert.equal(days[1].done,true);assert.equal(days[2].active,true);assert.equal(days[2].amount,20);assert.equal(days[3].amount,null);
});
test('signing requires loaded status and locks duplicate taps until server result',()=>{
 const f=fixture(SIGN);f.page.sign();assert.equal(f.requests.length,0);
 f.page.setData({loading:false,statusReady:true,todaySigned:false});f.page.sign();f.page.sign();assert.equal(f.requests.length,1);assert.equal(f.page.data.busy,true);
 f.requests[0].success({statusCode:200,data:{error:0,num:2}});assert.equal(f.page.data.todaySigned,true);assert.equal(f.page.data.lastReward,2);assert.equal(f.page.data.balance,null);assert.equal(f.page.data.busy,false);
});
test('missing sign amount is never fabricated as a successful zero-coin reward',()=>{
 const f=fixture(SIGN);f.page.setData({loading:false,statusReady:true,todaySigned:false});f.page.sign();f.requests[0].success({statusCode:200,data:{error:0,num:null}});
 assert.equal(f.page.data.justSigned,false);assert.equal(f.page.data.lastReward,null);assert.equal(f.page.data.todaySigned,false);
});
test('task direct entry establishes one authenticated session before loading reward channels',async()=>{
 const f=fixture();const first=f.page.ensureSession(true),second=f.page.ensureSession(true);assert.equal(first,second);assert.equal(f.logins.length,1);
 f.logins[0].success({code:'test-code'});assert.equal(f.requests.length,1);assert.match(f.requests[0].url,/entry\/wxapp\/set/);
 f.requests[0].success({statusCode:200,data:{error:0,auth_token:'test-only-token',openid:'test-user',setinfo:{day1:1}}});assert.equal(await first,true);assert.equal(f.page.data.sessionReady,true);assert.equal(f.page.data.sessionLoading,false);assert.equal(f.storage.get('openid'),'test-user');
});
test('task direct entry reuses an injected session instead of requesting another login',async()=>{
 const f=fixture();f.storage.set('sage_safe_token','test-only-existing-token');assert.equal(await f.page.ensureSession(false),true);assert.equal(f.logins.length,0);assert.equal(f.requests.length,0);assert.equal(f.page.data.sessionReady,true);
});
test('task session failure remains recoverable and does not load reward channels',async()=>{
 const f=fixture();const promise=f.page.connect();f.logins[0].fail({});await promise;assert.equal(f.page.data.sessionReady,false);assert.equal(f.page.data.sessionLoading,false);assert.equal(f.page.data.loading,false);assert.equal(f.calls.length,0);assert.ok(f.page.data.error);
 const retry=f.page.retry();assert.equal(f.logins.length,2);f.logins[1].success({code:'test-code'});f.requests[0].fail({});await retry;assert.equal(f.page.data.sessionReady,false);
});
test('task session rejects a server error even if its body contains a token field',async()=>{
 const f=fixture();const promise=f.page.ensureSession(true);f.logins[0].success({code:'test-code'});f.requests[0].success({statusCode:503,data:{error:0,auth_token:'test-only-token'}});assert.equal(await promise,false);assert.equal(f.page.data.sessionReady,false);
});
