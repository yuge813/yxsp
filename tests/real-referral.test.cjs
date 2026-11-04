'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {makeRuntime,clone,ROOT}=require('./helpers/load-page.cjs');
const HOME='sage_dksy/pages/index/index.js',FRIENDS='sage_dksy/pages/v132grow/index.js',HUB='sage_dksy/pages/v11/promote.js';
function row(id='1',change={}){return {id,stage:'inviter_retention',role:'inviter',coins:10,status:'paid',created_at:1793700000,paid_at:1793786400,member_label:'好友***123',signed_days:2,required_days:2,...change};}
function summary(change={}){return {error:0,version:1,campaign:{id:1,enabled:true,public_visible:true,name:'一级邀请礼遇',inviter_points:10,invitee_points:5,min_sign_days:2,window_days:7,rules_text:'不要求观看或点击广告。',ends_at:0},mine:{state:'waiting_sign',signed_days:0,required_days:2,invitee_coins:5,invitee_paid:false,inviter_coins:10,inviter_paid:false,expires_at:1794304800},inviter:{earned:10,pending_coins:20,qualified:1,waiting:2},records:[row()],page:1,has_more:false,...change};}
function fixture(file=FRIENDS){
 const pending=[];
 const runtime=makeRuntime({modules:{'sage_dksy/utils/v11.js':{api:(name,data,success,fail)=>pending.push({name,data,success,fail}),env:()=> 'trial',clock:()=>'',autoBindReferral(){}}}});
 const f=runtime.instantiate(file),helper=runtime.load(path.join(ROOT,'sage_dksy/utils/referral-rewards.js'));
 f.page._alive=true;f.storage.set('openid','test-account-a');
 return {...f,helper,pending};
}
test('real referral normalization uses published server amounts and keeps unknown totals unknown',()=>{
 const f=fixture(),view=f.helper.normalize(summary({campaign:{...summary().campaign,inviter_points:13,invitee_points:6},inviter:{earned:null,pending_coins:'',qualified:false,waiting:0}}));
 assert.equal(view.campaign.inviter_points,13);assert.equal(view.campaign.invitee_points,6);
 assert.deepEqual(clone(view.inviter),{earned:null,pending_coins:null,qualified:null,waiting:0});
 assert.equal(view.records[0].paid,true);assert.match(view.records[0].time,/^2026-/);
});
test('old or malformed reward APIs never become a live campaign or a false empty success',()=>{
 const f=fixture();
 for(const raw of [{},{error:0},{...summary(),version:true},{...summary(),records:{}},{...summary(),records:[{...row(),coins:false}]},{...summary(),page:0},{...summary(),has_more:'false'},{...summary(),campaign:{...summary().campaign,enabled:false}},{...summary(),campaign:{...summary().campaign,invitee_points:false}}])assert.throws(()=>f.helper.normalize(raw));
});
test('campaign pause preserves existing commitments, actual earnings and paid history',()=>{
 const f=fixture(),view=f.helper.normalize(summary({campaign:null,mine:{...summary().mine,state:'waiting_retention',signed_days:1,invitee_paid:true}}));
 assert.equal(view.campaign,null);assert.equal(view.mine.visible,true);assert.equal(view.mine.canSign,true);assert.equal(view.mine.invitee_paid,true);assert.equal(view.mine.invitee_coins,5);
 assert.equal(view.inviter.earned,10);assert.equal(view.records[0].paid,true);
});
test('all real newcomer lifecycle states remain distinct, with signup navigation only while eligible',()=>{
 const f=fixture();
 for(const state of ['waiting_sign','waiting_retention','completed','expired','no_budget','relation_changed','pending']){
  const mine=f.helper.normalize(summary({mine:{...summary().mine,state}})).mine;
  assert.equal(mine.visible,true,state);assert.ok(mine.title);assert.equal(mine.canSign,['waiting_sign','waiting_retention'].includes(state),state);
 }
 for(const state of ['not_invited','unavailable'])assert.equal(f.helper.normalize(summary({mine:{...summary().mine,state}})).mine.visible,false);
});
test('a positive receipt requires a paid ledger status, positive amount and actual paid timestamp',()=>{
 const f=fixture(),view=f.helper.normalize(summary({records:[row('a',{status:'waiting'}),row('b',{paid_at:null}),row('c',{coins:0}),row('d',{status:'expired'}),row('e')]}));
 assert.deepEqual(clone(view.records.map(x=>x.paid)),[false,false,false,false,true]);
 assert.equal(view.records[1].status,'待核对');assert.equal(view.records[4].coins,10);
});
test('network and unsupported API errors differ from a real successful empty response',()=>{
 const f=fixture();f.helper.load(f.page);assert.equal(f.pending[0].name,'v150referralsummary');assert.deepEqual(clone(f.pending[0].data),{page:1});
 f.pending[0].fail();assert.equal(f.page.data.rr.loaded,false);assert.equal(f.page.data.rr.inviter.earned,null);assert.ok(f.page.data.rr.error);
 f.helper.refresh.call(f.page);f.pending[1].success(summary({campaign:null,mine:{state:'not_invited'},inviter:{earned:0,pending_coins:0,qualified:0,waiting:0},records:[]}));
 assert.equal(f.page.data.rr.loaded,true);assert.equal(f.page.data.rr.error,'');assert.equal(f.page.data.rr.inviter.earned,0);assert.equal(f.page.data.rr.records.length,0);
});
test('refresh failure retains actual earnings and records, without inventing a new balance',()=>{
 const f=fixture();f.page.setData({num:77});f.helper.load(f.page);f.pending[0].success(summary());f.helper.refresh.call(f.page);f.pending[1].fail();
 assert.equal(f.page.data.rr.loaded,true);assert.equal(f.page.data.rr.inviter.earned,10);assert.equal(f.page.data.rr.records.length,1);assert.ok(f.page.data.rr.error);assert.equal(f.page.data.num,77);
});
test('new paid newcomer status refreshes the server wallet once and never adds UI coins itself',()=>{
 const f=fixture(HOME);let wallets=0;f.page.refreshWallet=()=>wallets++;f.page.setData({num:77});
 const paid=summary({mine:{...summary().mine,state:'waiting_retention',signed_days:1,invitee_paid:true}});
 f.helper.load(f.page);f.pending[0].success(paid);assert.equal(wallets,1);assert.equal(f.page.data.num,77);
 f.helper.refresh.call(f.page);f.pending[1].success(paid);assert.equal(wallets,1);assert.equal(f.page.data.num,77);
});
test('stale account responses cannot render even when the promotion identity key has not yet refreshed',()=>{
 const f=fixture(HUB);f.page._identityKey='stale-verified-key';f.helper.load(f.page);f.pending[0].success(summary());
 f.helper.refresh.call(f.page);f.storage.set('openid','test-account-b');f.pending[1].success(summary({inviter:{earned:999}}));assert.equal(f.page.data.rr.inviter.earned,null);assert.equal(f.page.data.rr.loaded,false);
 f.helper.refresh.call(f.page);assert.equal(f.page.data.rr.loaded,false);assert.equal(f.page.data.rr.inviter.earned,null);
 f.pending[2].success(summary({campaign:null,inviter:{earned:0,pending_coins:0,qualified:0,waiting:0},records:[]}));assert.equal(f.page.data.rr.inviter.earned,0);
});
test('superseded requests and responses after unload do not replace actual data',()=>{
 const f=fixture();f.helper.load(f.page);f.helper.refresh.call(f.page);f.pending[1].success(summary());f.pending[0].success(summary({inviter:{earned:999}}));assert.equal(f.page.data.rr.inviter.earned,10);
 f.helper.refresh.call(f.page);f.page.onUnload();f.pending[2].success(summary({inviter:{earned:888}}));assert.equal(f.page.data.rr.inviter.earned,10);
});
test('reward pagination retries the same failed page and deduplicates stable record IDs',()=>{
 const f=fixture();f.helper.load(f.page);f.pending[0].success(summary({records:[row('__proto__')],has_more:true}));
 f.helper.more.call(f.page);assert.equal(f.pending[1].data.page,2);f.pending[1].fail();assert.equal(f.page.data.rr.page,1);assert.equal(f.page.data.rr.records.length,1);
 f.helper.more.call(f.page);assert.equal(f.pending[2].data.page,2);f.pending[2].success(summary({page:2,records:[row('__proto__'),row('2')]}));assert.deepEqual(f.page.data.rr.records.map(x=>x.id),['__proto__','2']);assert.equal(f.page.data.rr.has_more,false);
});
test('reward pane requests its own summary even when no published campaign exists in the friend API',()=>{
 const f=fixture();f.page.onLoad({tab:'rewards'});assert.equal(f.page.data.tab,'rewards');assert.equal(f.pending[0].name,'v11promote');assert.equal(f.pending[1].name,'v150referralsummary');
 f.pending[0].success({total:2,today:0,items:[]});f.pending[1].success(summary({campaign:null}));assert.equal(f.page.data.rewardInfo.approved,false);assert.equal(f.page.data.rr.inviter.earned,10);
 f.page.setTab({currentTarget:{dataset:{tab:'friends'}}});f.page.setTab({currentTarget:{dataset:{tab:'rewards'}}});assert.equal(f.pending[2].name,'v150referralsummary');
});
test('verified promotion identity requests summary independently from legacy activity publication',()=>{
 const f=fixture(HUB);f.page.ensureQr=()=>{};f.page.fetchIdentity();const who=f.pending.find(x=>x.name==='v11whoami');who.success({code:'abcdef012345',member_no:'1001'});
 const req=f.pending.find(x=>x.name==='v150referralsummary');assert.ok(req);req.success(summary({campaign:null}));assert.equal(f.page.data.rr.inviter.earned,10);assert.equal(f.page.data.rr.campaign,null);
});
test('home refresh after ordinary sign-in checks the real referral service without ad conditions',()=>{
 const f=fixture(HOME),ordinary=[];f.page.setData({loaded:true,signReady:true,today_qian:0,num:70});f.page.api=(name,data,success)=>ordinary.push({name,success});f.page.refreshTodayTask=()=>{};f.page.refreshWallet=()=>{};
 f.page.bindSignIn();assert.equal(ordinary[0].name,'qian');ordinary[0].success({error:0,num:1});assert.equal(f.pending[0].name,'v150referralsummary');
 f.pending[0].success(summary({mine:{...summary().mine,state:'waiting_retention',signed_days:1,invitee_paid:true}}));assert.equal(f.page.data.rr.mine.invitee_paid,true);assert.equal(f.page.data.num,71);assert.equal(f.calls.some(x=>/Ad$/.test(x.name)),false);
});
test('newcomer actions use real sign-in and authenticated reward-record pages',()=>{
 const f=fixture(HOME);f.page.goReferralSign();f.page.goRewardRecords();assert.deepEqual(f.calls.filter(x=>x.name==='navigateTo').map(x=>x.args[0].url),['/sage_dksy/pages/v14/sign/index','/sage_dksy/pages/v132grow/index?tab=rewards']);
});
test('standalone sign receipt separates the real newcomer payment from ordinary sign coins',()=>{
 const f=fixture('sage_dksy/pages/v14/sign/index.js'),requests=[];f.page.api=(name,data,success)=>requests.push({name,success});f.page.load=()=>{};f.page.setData({loading:false,statusReady:true,todaySigned:false,balance:70});
 f.page.sign();requests[0].success({error:0,num:2,referral:{state:'waiting_retention',signed_days:1,invitee_paid:true,invitee_coins:5}});
 assert.equal(f.page.data.justSigned,true);assert.equal(f.page.data.lastReward,2);assert.equal(f.page.data.referralWelcome,5);assert.equal(f.page.data.balance,null);
 f.page.goReferralRecords();assert.equal(f.calls.find(x=>x.name==='navigateTo').args[0].url,'/sage_dksy/pages/v132grow/index?tab=rewards');
});
test('standalone sign receipt never turns pending, unpaid or malformed referral data into a payout',()=>{
 for(const referral of [undefined,{state:'pending',invitee_coins:5},{invitee_paid:false,invitee_coins:5},{invitee_paid:'true',invitee_coins:5},{invitee_paid:true,invitee_coins:null},{invitee_paid:true,invitee_coins:0},{invitee_paid:true,invitee_coins:false},{invitee_paid:true,invitee_coins:true},{invitee_paid:true,invitee_coins:Infinity},{invitee_paid:true,invitee_coins:0.5},{invitee_paid:true,invitee_coins:-1},{invitee_paid:true,invitee_coins:501}]){
  const f=fixture('sage_dksy/pages/v14/sign/index.js'),requests=[];f.page.api=(name,data,success)=>requests.push({name,success});f.page.load=()=>{};f.page.setData({loading:false,statusReady:true,todaySigned:false});
  f.page.sign();requests[0].success({error:0,num:2,referral});assert.equal(f.page.data.lastReward,2);assert.equal(f.page.data.referralWelcome,null,JSON.stringify(referral));
 }
});
test('failed ordinary sign request cannot show a referral receipt from its reward-shaped payload',()=>{
 const f=fixture('sage_dksy/pages/v14/sign/index.js'),requests=[];f.page.api=(name,data,success)=>requests.push({name,success});f.page.load=()=>{};f.page.setData({loading:false,statusReady:true,todaySigned:false});
 f.page.sign();requests[0].success({error:1,num:2,referral:{invitee_paid:true,invitee_coins:5}});assert.equal(f.page.data.justSigned,false);assert.equal(f.page.data.referralWelcome,null);
});
