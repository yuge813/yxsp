'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPage,clone}=require('./helpers/load-page.cjs');
const route='sage_dksy/pages/growth/index.js';
const event=day=>({currentTarget:{dataset:{milestone:day}}});
function fixture(){
 const requests=[];
 const app={util:{url:value=>'https://example.test/'+value+'?'},secureRequest:opts=>requests.push(opts),clearAuth(){}};
 const f=loadPage(route,{app});f.storage.set('sage_safe_token','offline-test-token');f.page.onLoad({});return {...f,requests};
}
function reply(request,data,statusCode=200){request.success({statusCode,data});}
function snapshot(challenge={}){return {error:0,balance:45,challenge:{joined:1,done_count:3,reward_enabled:1,day3_enabled:1,day7_enabled:1,three_points:20,seven_points:80,can_claim3:1,can_claim7:0,claimed3:0,claimed7:0,can_start:0,days:[{index:1,done:1,date:'2026-11-01'},{index:2,done:1,date:'2026-11-02'},{index:3,done:0,today:1,date:'2026-11-03'}],...challenge}};}
function ready(challenge){const f=fixture();reply(f.requests[0],snapshot(challenge));return f;}
test('growth progress and milestone rewards come only from their own server fields',()=>{
 const f=fixture();reply(f.requests[0],{...snapshot({done_count:null,three_points:null}),sign_rewards:[999,999,999,999,999,999,999]});
 assert.equal(f.page.data.growth.doneCount,null);assert.equal(f.page.data.growth.milestones[0].amount,null);
 assert.equal(f.page.data.growth.milestones[0].canClaim,false);
 assert.equal(f.page.data.growth.days[2].state,'today');assert.equal(f.page.data.growth.days[3].state,'unknown');
 assert.equal(f.page.data.growth.days[0].date,'11-01');assert.equal(f.page.data.growth.canStart,false);
});
test('known first-time participants retain the original join contract, while restart and explicit prohibitions stay guarded',()=>{
 for(const value of [false,0,'0']){
  const f=ready({joined:0,can_start:value});f.page.join();assert.equal(f.requests.length,1);assert.equal(f.page.data.growth.canStart,false);
 }
 for(const challenge of [{joined:null,can_start:1},{joined:undefined,can_start:1},{joined:1,can_start:undefined},{joined:1,can_start:0}]){
  const f=ready(challenge);f.page.join();assert.equal(f.requests.length,1);assert.equal(f.page.data.growth.canStart,false);
 }
 for(const joined of [0,false,'0']){
  const f=ready({joined,can_start:undefined});f.page.join();assert.equal(f.requests.length,2);assert.match(f.requests[1].url,/growthjoin/);
 }
 const f=ready({joined:1,can_start:'1'});f.page.join();f.page.join();assert.equal(f.requests.length,2);
 assert.match(f.requests[1].url,/growthjoin/);assert.deepEqual(clone(f.requests[1].data),{});assert.equal(f.page.data.busy,true);
 reply(f.requests[1],{error:'0'});assert.equal(f.requests.length,3);assert.match(f.requests[2].url,/growthstatus/);
 reply(f.requests[2],snapshot({done_count:0}));assert.equal(f.page.data.growth.joined,true);assert.equal(f.page.data.busy,false);
});
test('growth claim guards reject disabled, already claimed, zero, unknown and malformed reward eligibility',()=>{
 for(const challenge of [{reward_enabled:'0'},{day3_enabled:'0'},{claimed3:'1'},{can_claim3:'0'},{three_points:0},{three_points:null},{three_points:true},{three_points:{}},{joined:0}]){
  const f=ready(challenge);f.page.claim(event(3));assert.equal(f.requests.length,1,JSON.stringify(challenge));
 }
 const f=ready();f.page.claim(event(8));assert.equal(f.requests.length,1);f.page.claim(event(3));f.page.claim(event(3));
 assert.equal(f.requests.length,2);assert.deepEqual(clone(f.requests[1].data),{milestone:3});
});
test('an uncertain growth claim locks resubmission until a successful fresh status lookup',()=>{
 const f=ready();f.page.claim(event(3));f.requests[1].fail({errMsg:'request:fail timeout'});
 assert.equal(f.page.data.actionUnknown,true);assert.equal(f.page.data.busy,false);f.page.claim(event(3));assert.equal(f.requests.length,2);
 f.page.ensureLogin();f.requests[2].fail({errMsg:'offline'});assert.equal(f.page.data.actionUnknown,true);assert.equal(f.page.data.growth.doneCount,3);
 f.page.ensureLogin();reply(f.requests[3],snapshot({claimed3:1,can_claim3:0}));assert.equal(f.page.data.actionUnknown,false);
 assert.equal(f.page.data.growth.milestones[0].claimed,true);f.page.claim(event(3));assert.equal(f.requests.length,4);
});
test('missing HTTP status and malformed envelopes never establish growth claim success',()=>{
 for(const response of [{data:{error:0,points:20}},{statusCode:true,data:{error:0}},{statusCode:200,data:{error:null}},{statusCode:200,data:{error:false}},{statusCode:200,data:[]},{statusCode:500,data:{error:0}}]){
  const f=ready();f.page.claim(event(3));f.requests[1].success(response);
  assert.equal(f.page.data.actionUnknown,true);assert.equal(f.requests.length,2);assert.equal(f.page.data.lastActionMessage,'');
 }
});
test('growth receipts never substitute configured rewards or invent zero-coin gains',()=>{
 for(const points of [undefined,null,'',true,{},0,'0']){
  const f=ready({three_points:999});f.page.claim(event(3));reply(f.requests[1],{error:0,points});
  assert.match(f.page.data.lastActionMessage,/核对明细/);assert.doesNotMatch(f.page.data.lastActionMessage,/到账|\+0|999/);
 }
 const f=ready({three_points:999});f.page.claim(event(3));reply(f.requests[1],{error:0,points:'17'});
 assert.match(f.page.data.lastActionMessage,/\+17/);assert.doesNotMatch(f.page.data.lastActionMessage,/999/);
});
test('latest growth status wins and late replies do not mutate an unloaded page',()=>{
 const f=fixture();f.page.load();reply(f.requests[1],snapshot({done_count:6}));reply(f.requests[0],snapshot({done_count:1}));
 assert.equal(f.page.data.growth.doneCount,6);f.page.load();const before=JSON.stringify(f.page.data);f.page.onUnload();reply(f.requests[2],snapshot({done_count:7}));assert.equal(JSON.stringify(f.page.data),before);
});
test('growth login rejects failed HTTP authentication and never starts status loading from its token-shaped body',()=>{
 const logins=[],requests=[];const app={util:{url:value=>value},secureRequest:opts=>requests.push(opts)};
 const f=loadPage(route,{app,wx:{login:opts=>logins.push(opts)}});f.page.onLoad({});logins[0].success({code:'offline-code'});
 reply(requests[0],{auth_token:'token-shaped-offline-fixture'},500);assert.equal(requests.length,1);assert.equal(f.page.data.loaded,false);assert.equal(f.page.data.loading,false);assert.ok(f.page.data.message);
 f.page.ensureLogin();logins[1].success({code:'another-offline-code'});reply(requests[1],{auth_token:'valid-shaped-offline-fixture'});
 assert.equal(requests.length,3);assert.match(requests[2].url,/growthstatus/);
});
test('unknown challenge and invalid day counts stay unknown rather than fabricating progress',()=>{
 const f=fixture();reply(f.requests[0],{error:0,challenge:null,balance:false});assert.equal(f.page.data.growth.known,false);assert.equal(f.page.data.balance,null);f.page.join();assert.equal(f.requests.length,1);
 for(const count of [-1,8,2.5,{},true]){f.page.load();reply(f.requests.at(-1),snapshot({done_count:count}));assert.equal(f.page.data.growth.doneCount,null);}
});
