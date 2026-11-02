'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPage}=require('./helpers/load-page.cjs');
const FILE='sage_dksy/pages/user/index.js';
function fixture(){
 const requests=[],logins=[];
 const runtime=loadPage(FILE,{wx:{login:options=>logins.push(options),request:options=>requests.push(options)}});
 return {...runtime,requests,logins,load(){runtime.page.onShow();logins.at(-1).success({code:'test-login-code'});return requests.at(-1);}};
}
test('account onShow reloads a fresh balance after returning from reward or redemption',()=>{
 const f=fixture();let request=f.load();assert.match(request.url,/entry\/wxapp\/set/);
 request.success({statusCode:200,data:{userinfo:{num:81,nickname:'用户'},openid:'test-user'}});
 assert.equal(f.page.data.balance,81);assert.equal(f.page.data.loaded,true);
 request=f.load();request.success({statusCode:200,data:{userinfo:{num:83,nickname:'用户'},openid:'test-user'}});
 assert.equal(f.page.data.balance,83);assert.equal(f.logins.length,2);
});
test('missing balances remain unknown while a real zero remains displayable',()=>{
 for(const value of [undefined,null,'','bad',-1]){
  const f=fixture(),request=f.load();request.success({statusCode:200,data:{userinfo:{num:value}}});
  assert.equal(f.page.data.balance,null,`value ${String(value)}`);assert.equal(f.page.data.balanceText,'—');
 }
 const f=fixture(),request=f.load();request.success({statusCode:200,data:{userinfo:{num:0}}});
 assert.equal(f.page.data.balance,0);assert.equal(f.page.data.balanceText,'0');
});
test('account refresh failure keeps previously loaded profile and balance',()=>{
 const f=fixture();f.load().success({statusCode:200,data:{userinfo:{num:37,nickname:'已读用户'}}});
 f.load().fail({errMsg:'request:fail'});
 assert.equal(f.page.data.balance,37);assert.equal(f.page.data.userinfo.nickname,'已读用户');
 assert.equal(f.page.data.loaded,true);assert.equal(f.page.data.loading,false);assert.ok(f.page.data.pageError);
 f.load().success({statusCode:200,data:{userinfo:{num:39}}});assert.equal(f.page.data.balance,39);
});
test('duplicate refresh during login does not send duplicate account requests',()=>{
 const f=fixture();f.page.onShow();f.page.onShow();f.page.onPullDownRefresh();
 assert.equal(f.logins.length,1);assert.equal(f.requests.length,0);
 f.logins[0].success({code:'test-login-code'});assert.equal(f.requests.length,1);
});
test('late account response after unload does not mutate a destroyed page',()=>{
 const f=fixture(),request=f.load();f.page.onUnload();
 request.success({statusCode:200,data:{userinfo:{num:999,nickname:'迟到响应'}}});
 assert.equal(f.page.data.balance,null);assert.deepEqual(f.page.data.userinfo,{});
});
test('HTTP, business and malformed account failures enter recoverable error state',()=>{
 for(const response of [{statusCode:503,data:{userinfo:{num:1}}},{statusCode:200,data:{error:1,userinfo:{num:1}}},{statusCode:200,data:'invalid-json'},{statusCode:200,data:{userinfo:[]}}]){
  const f=fixture();f.load().success(response);
  assert.equal(f.page.data.loaded,false);assert.equal(f.page.data.loading,false);assert.ok(f.page.data.pageError);
  f.page.retry();assert.equal(f.logins.length,2,'retry releases the busy guard');
 }
});
