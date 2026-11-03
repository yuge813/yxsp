'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {ROOT,loadPage,makeRuntime}=require('./helpers/load-page.cjs');
const trial=require('../sage_dksy/pages/trial/status.js');
test('five core navigation destinations and service catalog exclude retired primary features',()=>{
 const nav=fs.readFileSync(ROOT+'/sage_dksy/pages/nav/nav.wxml','utf8');assert.equal((nav.match(/<navigator\b/g)||[]).length,5);
 for(const label of ['首页','赚金币','好礼','试用','我的'])assert.ok(nav.includes('>'+label+'</text>'));
 const registry=makeRuntime().load(ROOT+'/sage_dksy/utils/v1216nav.js');const ids=registry.features().map(x=>x.id);
 for(const id of ['sign','video','prize','trial','promote'])assert.ok(ids.includes(id));for(const id of ['read','growth','featured','favorites'])assert.equal(ids.includes(id),false);
});
test('trial outcome relies on explicit server status and does not infer selection from ended or arbitrary numeric enums',()=>{
 const cases=[[{can_complete:1},'selected'],[{can_complete:'1'},'selected'],[{status_text:'未中选'},'unselected'],[{status_text:'已中选'},'selected'],[{status_text:'收货资料已提交'},'submitted'],[{status_text:'等待活动结果'},'pending'],[{status_text:'已结束'},'unknown'],[{can_complete:0},'unknown'],[{status:2,isyes:2},'unknown']];for(const [data,expected] of cases)assert.equal(trial.outcome(data),expected);
});
test('an unknown trial result never exposes address-completion navigation',()=>{
 const f=loadPage('sage_dksy/pages/user/trial_list.js');f.page.setData({triallist:[{id:8,status_text:'已结束',can_complete:0}]});f.page.openProgress({currentTarget:{dataset:{id:8}}});assert.equal(f.page.data.activeRecord._outcome,'unknown');f.page.goComplete();assert.equal(f.calls.some(x=>x.name==='navigateTo'),false);f.page.closeProgress();assert.equal(f.page.data.activeRecord,null);
});
test('a selected trial transfers only the actual selected application to its recipient form',()=>{
 const f=loadPage('sage_dksy/pages/user/trial_list.js');f.page.setData({triallist:[{id:8,status_text:'已中选',can_complete:1}]});f.page.openProgress({currentTarget:{dataset:{id:8}}});f.page.goComplete();assert.match(f.calls.find(x=>x.name==='navigateTo').args[0].url,/complete\/complete\?id=8$/);
});
test('red task result views show paid, unpaid and pending as distinct states without stale coin gains',()=>{
 const f=loadPage('sage_dksy/pages/v14/tasks/index.js');f.page.onRewardResult({state:'paid',coins:2,taskId:'x',message:'confirmed'});assert.equal(f.page.data.rewardViewMode,'paid');assert.equal(f.page.data.rewardCoins,2);
 f.page.onRewardResult({state:'unpaid',coins:null});assert.equal(f.page.data.rewardViewMode,'unpaid');assert.equal(f.page.data.rewardCoins,null);
 f.page.onRewardResult({state:'pending',coins:null});assert.equal(f.page.data.rewardViewMode,'pending');assert.equal(f.page.data.rewardCoins,null);
});
test('red task paid receipt with a missing amount does not fabricate a zero reward',()=>{
 const f=loadPage('sage_dksy/pages/v14/tasks/index.js');f.page.onRewardResult({state:'paid',coins:null});assert.equal(f.page.data.rewardViewMode,'pending');assert.equal(f.page.data.rewardCoins,null);
});
test('address selection stages a choice until the explicit use-address action',()=>{
 const selected=[];const f=loadPage('sage_dksy/pages/address/list.js',{modules:{'sage_dksy/utils/v12229_address.js':{select:id=>{selected.push(id);return {ok:true};}}}});f.page.setData({selectMode:true,items:[{id:'a'},{id:'b'}],pendingSelectionId:'a'});f.page.onSelect({currentTarget:{dataset:{id:'b'}}});assert.equal(f.page.data.pendingSelectionId,'b');assert.equal(selected.length,0);f.page.onUse();assert.deepEqual(selected,['b']);
});
test('order logistics requires an actual tracking number and copies the existing number only',()=>{
 const f=loadPage('sage_dksy/pages/user/order.js');f.page.setData({orderView:'detail',detailOrder:{id:7,expressage_number:''}});f.page.openLogistics();assert.equal(f.page.data.orderView,'detail');f.page.setData({detailOrder:{id:7,expressage_number:'REAL-TRACKING-TEST'}});f.page.openLogistics();assert.equal(f.page.data.orderView,'logistics');f.page.copyLogistics();assert.equal(f.calls.find(x=>x.name==='setClipboardData').args[0].data,'REAL-TRACKING-TEST');
});
