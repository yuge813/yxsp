'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPage,flush}=require('./helpers/load-page.cjs');
function fixture(file='sage_dksy/pages/trial/trial.js',overrides={}){
 const pending=[],requests=[],logins=[],tracks=[];
 const helper={login:()=>Promise.resolve({openid:'test-user'}),text:e=>e.message,request:(name,data)=>new Promise((resolve,reject)=>pending.push({name,data,resolve,reject}))};
 const f=loadPage(file,{wx:{request:o=>requests.push(o),login:o=>logins.push(o)},modules:{'sage_dksy/pages/trial/view_helpers.js':helper,'sage_dksy/utils/v10.js':{track:(...args)=>tracks.push(args),api(){},shareCover:s=>s}}});
 return {...f,pending,requests,logins,tracks};
}
const settle=async()=>{await flush();await flush();};
test('trial status tabs separate open, upcoming and ended activities without counting unknown states',()=>{
 const f=fixture();f.page.setData({trial:[{pro_id:1,isyes:'0'},{pro_id:2,isyes:'1'},{pro_id:3,isyes:'2'},{pro_id:4,isyes:'unknown'}]});f.page.applyTrialView();
 assert.equal(f.page.data.activeCount,1);assert.equal(f.page.data.upcomingCount,1);assert.equal(f.page.data.endedCount,1);assert.equal(f.page.data.filteredTrial[0].pro_id,2);
 f.page.switchTrialTab({currentTarget:{dataset:{tab:1}}});assert.equal(f.page.data.filteredTrial[0].pro_id,1);
 f.page.switchTrialTab({currentTarget:{dataset:{tab:2}}});assert.equal(f.page.data.filteredTrial[0].pro_id,3);
});
test('trial list uses an in-flight lock and preserves already loaded activities on failure',async()=>{
 const f=fixture();f.page.setData({openid:'test-user',trial:[{pro_id:9,isyes:'1'}],loaded:true});f.page.load(true);f.page.load(true);await settle();assert.equal(f.pending.length,1);
 f.pending[0].reject(new Error('offline'));await settle();assert.equal(f.page.data.trial[0].pro_id,9);assert.equal(f.page.data.loaded,true);assert.equal(f.page.data.loading,false);assert.ok(f.page.data.error);
});
test('trial list advances pages only after a valid response and rejects missing arrays',async()=>{
 const f=fixture();f.page.load(true);await settle();assert.equal(f.pending[0].data.pages,1);f.pending[0].resolve({trial:[{pro_id:1,isyes:'1'}],page:1});await settle();assert.equal(f.page.data.pages,2);
 f.page.load(false);await settle();assert.equal(f.pending[1].data.pages,2);f.pending[1].resolve({});await settle();assert.equal(f.page.data.trial.length,1);assert.equal(f.page.data.pages,2);assert.ok(f.page.data.error);
});
test('trial application prevents duplicate submit and does not claim success on an ambiguous reply',async()=>{
 const f=fixture('sage_dksy/pages/trial/trial_input.js');f.page.setData({id:7,loaded:true,loading:false,canApply:true,trial_show:{isyes:1}});f.page.resQuick();f.page.resQuick();assert.equal(f.pending.length,1);
 f.pending[0].resolve({msg:'ambiguous'});await settle();assert.equal(f.page.data.submitting,false);assert.equal(f.page.data.submissionUnknown,true);assert.equal(f.tracks.length,0);
 f.page.resQuick();assert.equal(f.pending.length,1);
});
test('confirmed trial application routes to application history and says application is not selection',async()=>{
 const f=fixture('sage_dksy/pages/trial/trial_input.js');f.page.setData({id:7,loaded:true,loading:false,canApply:true,trial_show:{isyes:1}});f.page.resQuick();f.pending[0].resolve({error:0});await settle();
 const modal=f.calls.find(c=>c.name==='showModal').args[0];assert.match(modal.content,/不等于中选/);modal.success({confirm:true});assert.match(f.calls.find(c=>c.name==='redirectTo').args[0].url,/user\/trial_list$/);
});
test('trial address requires complete data and locks duplicate submission',async()=>{
 const f=fixture('sage_dksy/pages/trial/complete/complete.js');f.page.setData({id:7});f.page.save({detail:{value:{username:' ',tel:'13800000000',address:'地址'}}});assert.equal(f.pending.length,0);
 const event={detail:{value:{username:'测试用户',tel:'13800000000',address:'测试地址'}}};f.page.save(event);f.page.save(event);assert.equal(f.pending.length,1);
 f.pending[0].resolve({error:0});await settle();assert.equal(f.page.data.busy,false);assert.equal(f.calls.filter(c=>c.name==='showModal').length,1);
});
test('trial history refreshes on returning from address completion and retains data when refresh fails',()=>{
 const f=fixture('sage_dksy/pages/user/trial_list.js');f.page.onShow();f.logins[0].success({code:'test-code'});f.requests[0].success({data:{error:0,triallist:[{id:1}],page:0}});
 assert.equal(f.page.data.loaded,true);f.page.onShow();assert.equal(f.logins.length,2);f.logins[1].success({code:'test-code'});f.requests[1].fail({});assert.equal(f.page.data.triallist.length,1);assert.equal(f.page.data.loaded,true);assert.ok(f.page.data.error);
});

test('trial submission refuses upcoming, ended or unknown activity state even when a stale CTA is enabled',()=>{
 for(const isyes of [0,2,undefined,'unknown']){const f=fixture('sage_dksy/pages/trial/trial_input.js');f.page.setData({id:7,loaded:true,loading:false,canApply:true,trial_show:{isyes}});f.page.resQuick();assert.equal(f.pending.length,0);assert.equal(f.page.data.submitting,false);}
});
test('failed final-page trial refresh can still be retried as a first-page refresh',async()=>{
 const f=fixture();f.page.setData({openid:'test-user',loaded:true,hasMore:false,error:'refresh failed',trial:[{pro_id:9,isyes:1}],pages:8});f.page.retry();await settle();assert.equal(f.pending.length,1);assert.equal(f.pending[0].data.pages,1);f.pending[0].resolve({trial:[],page:0});await settle();assert.equal(f.page.data.error,'');assert.equal(f.page.data.trial.length,0);
});
test('failed final-page application history refresh retains a functioning retry action',()=>{
 const f=fixture('sage_dksy/pages/user/trial_list.js');f.page.setData({loaded:true,hasMore:false,error:'refresh failed',triallist:[{id:1}],pages:8});f.page.retry();assert.equal(f.logins.length,1);f.logins[0].success({code:'test-code'});assert.equal(f.requests[0].data.pages,1);f.requests[0].success({data:{error:0,triallist:[],page:0}});assert.equal(f.page.data.error,'');
});
