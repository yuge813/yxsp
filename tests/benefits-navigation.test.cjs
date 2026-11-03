'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {ROOT,loadPage,makeRuntime}=require('./helpers/load-page.cjs');
test('reading, growth and first-level referral are reachable from home, earn and account pages',()=>{
 for(const route of ['index/index','v14/tasks/index','user/index']){
  const source=fs.readFileSync(ROOT+'/sage_dksy/pages/'+route+'.wxml','utf8');
  for(const target of ['v12/list','growth/index','v11/promote'])assert.ok(source.includes('url="/sage_dksy/pages/'+target+'"'),route+' → '+target);
 }
 const registry=makeRuntime().load(ROOT+'/sage_dksy/utils/v1216nav.js');
 assert.equal(registry.find('read').path,'v12/list');assert.equal(registry.find('growth').path,'growth/index');
 assert.equal(registry.find('promote').name,'一级推广');assert.equal(registry.find('friends').path,'v132grow/index');
});
test('rule deep links select and expand the requested reading, growth and first-level referral category',()=>{
 for(const category of ['read','growth','invite']){
  const {page}=loadPage('sage_dksy/pages/v14/rewards/index.js');page.onLoad({category});
  assert.equal(page.data.activeCategory,category);assert.ok(page.data.visibleQuestions.length>=2);
  assert.ok(page.data.visibleQuestions.every(q=>q.category===category));
  assert.ok(page.data.visibleQuestions.some(q=>q.id===page.data.expanded));
  assert.ok(page.data.activeTopic.path.startsWith('/sage_dksy/pages/'));
 }
});
test('unknown rule categories leave state intact, while switching categories cannot expand an invisible question',()=>{
 const {page}=loadPage('sage_dksy/pages/v14/rewards/index.js');page.onLoad({category:'invite'});
 const before=JSON.stringify(page.data);page.chooseCategory({currentTarget:{dataset:{category:'__proto__'}}});assert.equal(JSON.stringify(page.data),before);
 page.chooseCategory({currentTarget:{dataset:{category:'read'}}});const selected=page.data.expanded;
 page.toggleQuestion({currentTarget:{dataset:{id:5}}});assert.equal(page.data.expanded,selected);
 page.toggleQuestion({currentTarget:{dataset:{id:selected}}});assert.equal(page.data.expanded,0);
});
test('reading and promotion explanations preserve voluntary ads, server settlement and first-level ownership boundaries',()=>{
 const {page}=loadPage('sage_dksy/pages/v14/rewards/index.js');
 const text=category=>page.data.questions.filter(q=>q.category===category).map(q=>q.answer).join('');
 assert.match(text('read'),/免费阅读/);assert.match(text('read'),/自愿/);assert.match(text('read'),/服务端核验/);
 assert.match(text('growth'),/分别统计/);assert.match(text('growth'),/已领取不会重复发放/);
 assert.match(text('invite'),/已有邀请归属不会被覆盖/);assert.match(text('invite'),/不计入你的一级好友/);assert.match(text('invite'),/不代表金币立即到账/);
});
