'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPage,flush}=require('./helpers/load-page.cjs');
const LIST='sage_dksy/pages/v12/list.js',DETAIL='sage_dksy/pages/v12/detail.js';
const UNIT='adunit-12345678';
function fixture(file=LIST){
 const requests=[],played=[],created=[];
 const reader={call:(name,data)=>new Promise((resolve,reject)=>requests.push({name,data,resolve,reject})),makeReward:()=>({start(){},stop(){},refresh(){return Promise.resolve();}})};
 const r=loadPage(file,{modules:{'sage_dksy/utils/v12read.js':reader,'sage_dksy/utils/v11.js':{api(){},registerVisit(){}},'sage_dksy/utils/v12234_reward_inline.js':{create:(page,channel)=>{created.push(channel);return {play:unit=>played.push(unit),leave(){},destroy(){}};}}}});
 r.page._alive=true;r.page._request=0;
 return {...r,requests,played,created};
}
const story=(id,title,extra={})=>({id,title,summary:'正文摘要',cover_url:'https://example.test/cover.jpg',...extra});
test('reader search filters only loaded title/summary and clears to the loaded list',()=>{
 const f=fixture();f.page.setData({items:[story(1,'茶文化'),story(2,'晨间散步',{summary:'享受一杯好茶'})]});
 f.page.onSearch({detail:{value:'茶'}});assert.equal(f.page.data.filteredItems.length,2);assert.equal(f.requests.length,0);
 f.page.onSearch({detail:{value:'未加载的文章'}});assert.equal(f.page.data.filteredItems.length,0);assert.equal(f.requests.length,0);
 f.page.clearSearch();assert.equal(f.page.data.filteredItems.length,2);assert.equal(f.page.data.searchText,'');
});
test('latest reader category response wins over an older in-flight request',async()=>{
 const f=fixture(),first=f.page.load(true);
 const latest=f.page.switchCat({currentTarget:{dataset:{cat:'culture'}}});
 assert.equal(f.requests.length,2);assert.equal(f.requests[1].data.category,'culture');
 f.requests[1].resolve({items:[story(2,'文化新文章')],categories:[],has_more:false});await latest;
 f.requests[0].resolve({items:[story(1,'旧推荐文章')],categories:[],has_more:true});await first;
 assert.equal(f.page.data.items[0].id,2);assert.equal(f.page.data.category,'culture');assert.equal(f.page.data.hasMore,false);
});
test('reader pagination failure preserves loaded stories and retries the same page',async()=>{
 const f=fixture();let promise=f.page.load(true);f.requests[0].resolve({items:[story(1,'第一篇')],has_more:true});await promise;
 assert.equal(f.page.data.page,2);promise=f.page.load(false);f.requests[1].reject(new Error('offline'));await promise;
 assert.equal(f.page.data.items.length,1);assert.equal(f.page.data.page,2);assert.ok(f.page.data.error);
 promise=f.page.retry();assert.equal(f.requests[2].data.page,2);f.requests[2].resolve({items:[story(1,'重复篇'),story(2,'第二篇')],has_more:false});await promise;
 assert.equal(f.page.data.items.length,2);assert.equal(f.page.data.page,3);assert.equal(f.page.data.hasMore,false);
});
test('reader missing/malformed list is an error, while a real empty array is empty',async()=>{
 for(const body of [null,{}, {items:'bad'}]){
  const f=fixture(),promise=f.page.load(true);f.requests[0].resolve(body);await promise;
  assert.ok(f.page.data.error);assert.equal(f.page.data.loading,false);
 }
 const f=fixture(),promise=f.page.load(true);f.requests[0].resolve({items:[],has_more:false});await promise;
 assert.equal(f.page.data.error,'');assert.equal(f.page.data.items.length,0);assert.equal(f.page.data.hasMore,false);
});
test('reader unload invalidates an in-flight feed result',async()=>{
 const f=fixture(),promise=f.page.load(true);f.page.onUnload();f.requests[0].resolve({items:[story(9,'迟到内容')],has_more:true});await promise;
 assert.equal(f.page.data.items.length,0);
});
test('reader image failure updates both loaded and filtered representations',()=>{
 const f=fixture();f.page.setData({items:[story(1,'第一篇',{hasImage:true}),story(2,'第二篇',{hasImage:true})]});f.page.onSearch({detail:{value:'第一'}});
 f.page.imgError({currentTarget:{dataset:{id:'1'}}});assert.equal(f.page.data.items[0].hasImage,false);assert.equal(f.page.data.filteredItems[0].hasImage,false);assert.equal(f.page.data.items[1].hasImage,true);
});
test('reading list and detail use the read reward channel only when ready and valid',()=>{
 for(const file of [LIST,DETAIL]){
  for(const view of [{state:'cool',disabled:true},{state:'pending',disabled:true},{state:'limit',disabled:true},{state:'ready',disabled:true}]){
   const f=fixture(file);f.page.setData({reward:{ad_unit_id:UNIT},rewardView:view});f.page.watch();assert.equal(f.created.length,0);
  }
  const f=fixture(file);f.page.setData({reward:{ad_unit_id:'bad'},rewardView:{state:'ready',disabled:false}});f.page.watch();assert.equal(f.created.length,0);
  f.page.setData({reward:{ad_unit_id:UNIT}});f.page.watch();assert.deepEqual(f.created,['read']);assert.deepEqual(f.played,[UNIT]);
 }
});
test('article refresh failure retains already loaded article',async()=>{
 const f=fixture(DETAIL);f.page.setData({id:7,article:story(7,'保留文章')});const promise=f.page.load();f.requests[0].reject(new Error('offline'));await promise;
 assert.equal(f.page.data.article.id,7);assert.ok(f.page.data.error);assert.equal(f.page.data.loading,false);
});
test('article favorite lock prevents duplicate requests and unlocks on failure',async()=>{
 const f=fixture(DETAIL);f.page.setData({id:7,article:story(7,'文章')});f.page.toggleFavorite();f.page.toggleFavorite();
 assert.equal(f.requests.length,1);assert.equal(f.requests[0].name,'v12favorite');assert.equal(f.page.data.favoriteBusy,true);
 f.requests[0].reject(new Error('offline'));await flush();assert.equal(f.page.data.favoriteBusy,false);assert.equal(f.page.data.favorite,0);
 f.page.toggleFavorite();f.requests[1].resolve({favorite:1});await flush();assert.equal(f.page.data.favorite,1);
});
