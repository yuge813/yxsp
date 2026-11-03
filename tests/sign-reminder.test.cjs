'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPage}=require('./helpers/load-page.cjs');
const FILE='sage_dksy/pages/v14/reminders/index.js', ID='valid_sign_template_12345';
function fixture(options={}){
 const requests=[],logins=[],subscriptions=[];
 const f=loadPage(FILE,{wx:{request:r=>requests.push(r),login:r=>logins.push(r),requestSubscribeMessage:r=>subscriptions.push(r)}});
 f.app.clearAuth=()=>f.storage.delete('sage_safe_token');
 if(options.token!==false)f.storage.set('sage_safe_token','test-existing-session');
 return {...f,requests,logins,subscriptions};
}
function respond(request,data,statusCode=200){request.success({statusCode,data});}
function ready(f){f.page.onLoad();const request=f.requests.at(-1);assert.match(request.url,/subscribeconfig/);respond(request,{error:0,sign:[ID]});return f;}
function accepted(f){f.page.subscribe();f.subscriptions.at(-1).success({[ID]:'accept'});return f.requests.at(-1);}

test('reminder direct entry restores login before preloading configuration, keeping the click authorization synchronous',()=>{
 const f=fixture({token:false});f.page.onLoad();assert.equal(f.logins.length,1);assert.equal(f.requests.length,0);
 f.page.subscribe();assert.equal(f.subscriptions.length,0);
 f.logins[0].success({code:'one-time-test-code'});assert.match(f.requests[0].url,/entry\/wxapp\/set/);
 respond(f.requests[0],{error:0,auth_token:'test-restored-session'});assert.equal(f.storage.get('sage_safe_token'),'test-restored-session');assert.match(f.requests[1].url,/subscribeconfig/);
 respond(f.requests[1],{error:0,sign:[ID]});f.page.subscribe();assert.equal(f.subscriptions.length,1);assert.equal(f.logins.length,1);assert.equal(f.page.data.busy,true);
});
test('reminder retains original POST priTmplId contract and accepts a JSON-encoded successful server response',()=>{
 const f=ready(fixture());const request=accepted(f);assert.match(request.url,/entry\/wxapp\/adddy/);assert.equal(request.method,'POST');assert.deepEqual(JSON.parse(JSON.stringify(request.data)),{priTmplId:ID});
 respond(request,JSON.stringify({error:0}));assert.equal(f.page.data.accepted,true);assert.equal(f.page.data.authorized,true);assert.equal(f.page.data.busy,false);
});
test('native rejection, missing acceptance and native failure never register a reminder',()=>{
 for(const outcome of ['reject','ban',null,'failure']){
  const f=ready(fixture());f.page.subscribe();
  if(outcome==='failure')f.subscriptions[0].fail({errCode:20004});else f.subscriptions[0].success(outcome?{[ID]:outcome}:{});
  assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,0);assert.equal(f.page.data.authorized,false);assert.equal(f.page.data.accepted,false);assert.equal(f.page.data.busy,false);assert.ok(f.page.data.registrationError);
 }
});
test('subscription duplicates and rapid taps cannot register twice or unlock before backend confirmation',()=>{
 const f=ready(fixture());f.page.subscribe();f.page.subscribe();assert.equal(f.subscriptions.length,1);
 const callback=f.subscriptions[0];callback.success({[ID]:'accept'});callback.success({[ID]:'accept'});callback.fail({errCode:10002});f.page.subscribe();
 assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,1);assert.equal(f.page.data.busy,true);assert.equal(f.page.data.accepted,false);
 const request=f.requests.at(-1);respond(request,{error:0});request.fail({});assert.equal(f.page.data.accepted,true);assert.equal(f.page.data.busy,false);
});
test('explicit registration failure preserves authorization and an actionable backend reason without claiming success',()=>{
 const f=ready(fixture());const request=accepted(f);respond(request,{error:4,msg:'订阅模板尚未关联，请联系管理员'});
 assert.equal(f.page.data.authorized,true);assert.equal(f.page.data.accepted,false);assert.equal(f.page.data.registrationError,'订阅模板尚未关联，请联系管理员');
 assert.ok(f.calls.some(c=>c.name==='showToast'&&c.args[0].title==='已授权，登记尚未确认'));
 f.page.subscribe();assert.equal(f.subscriptions.length,1);assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,2);respond(f.requests.at(-1),{error:'0'});assert.equal(f.page.data.accepted,true);
});
test('uncertain network failure never automatically resends adddy or fabricates registration',()=>{
 const f=ready(fixture());const request=accepted(f);request.fail({errMsg:'timeout'});
 assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,1);assert.equal(f.page.data.authorized,true);assert.equal(f.page.data.accepted,false);assert.equal(f.page.data.busy,false);assert.match(f.page.data.registrationError,/结果暂未确认/);
});
test('a definite 401 rejection restores authentication and retries registration only once',()=>{
 const f=ready(fixture());const request=accepted(f);respond(request,{error:401},401);assert.equal(f.logins.length,1);assert.equal(f.page.data.busy,true);assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,1);
 f.logins[0].success({code:'reconnect-code'});respond(f.requests.at(-1),{error:0,auth_token:'new-test-session'});
 const retry=f.requests.at(-1);assert.match(retry.url,/adddy/);respond(retry,{error:401},401);
 assert.equal(f.logins.length,1);assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,2);assert.equal(f.page.data.accepted,false);assert.equal(f.page.data.busy,false);assert.match(f.page.data.registrationError,/登录状态/);
});
test('malformed, primitive and HTTP error registration replies cannot pass as successful',()=>{
 for(const [data,status] of [[null,200],[1,200],[true,200],['not-json',200],[{},200],[{error:false},200],[{error:0},503],[{error:0},undefined]]){
  const f=ready(fixture());const request=accepted(f);request.success({statusCode:status,data});assert.equal(f.page.data.accepted,false);assert.equal(f.page.data.authorized,true);assert.equal(f.page.data.busy,false);assert.ok(f.page.data.registrationError);
 }
});
test('configuration validates actual sign template identifiers and exposes reconnect failures',()=>{
 const f=fixture();f.page.onLoad();respond(f.requests[0],{sign:['adunit-not-a-message-template',false,'short',ID]});assert.equal(f.page.data.templateId,ID);
 f.page.getConfig();respond(f.requests.at(-1),{error:0,sign:[]});assert.equal(f.page.data.templateId,'');assert.equal(f.page.data.authorized,false);assert.match(f.page.data.error,/暂未开放/);
 const bad=fixture({token:false});bad.page.onLoad();bad.logins[0].success({code:'code'});respond(bad.requests[0],{error:0,auth_token:'token'},500);assert.equal(bad.requests.length,1);assert.equal(bad.page.data.loading,false);assert.match(bad.page.data.error,/账号暂未连接/);
});
test('unloading ignores late configuration, native authorization and backend registration callbacks',()=>{
 let f=fixture();f.page.onLoad();f.page.onUnload();const before=JSON.stringify(f.page.data);respond(f.requests[0],{error:0,sign:[ID]});assert.equal(JSON.stringify(f.page.data),before);
 f=ready(fixture());f.page.subscribe();f.page.onUnload();f.subscriptions[0].success({[ID]:'accept'});assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,0);
 f=ready(fixture());const request=accepted(f);f.page.onUnload();const pending=JSON.stringify(f.page.data);respond(request,{error:0});assert.equal(JSON.stringify(f.page.data),pending);assert.equal(f.calls.some(c=>c.name==='showToast'),false);
});
test('native SDK throws unlock the button and give a recoverable message',()=>{
 const f=ready(fixture());f.wx.requestSubscribeMessage=()=>{throw new Error('unsupported SDK');};f.page.subscribe();assert.equal(f.page.data.busy,false);assert.equal(f.page.data.accepted,false);assert.match(f.page.data.registrationError,/稍后重试/);
});
test('raw backend internals are not exposed in the reminder UI',()=>{
 const f=ready(fixture());const request=accepted(f);respond(request,{error:9,msg:'SQLSTATE auth_token secret.php fatal'});assert.doesNotMatch(f.page.data.registrationError,/SQLSTATE|auth_token|secret/);assert.match(f.page.data.registrationError,/提醒登记未完成/);
});


test('actual daily-limit response confirms an already registered reminder and stops further authorization',()=>{
 for(const data of [{error:1,msg:'今天已经订阅'},JSON.stringify({error:'1',msg:' 今天已经订阅 '}),'{"error":1,"msg":"\\u4eca\\u5929\\u5df2\\u7ecf\\u8ba2\\u9605"}']){
  const f=ready(fixture());const request=accepted(f);respond(request,data);
  assert.equal(f.page.data.accepted,true);assert.equal(f.page.data.authorized,true);assert.equal(f.page.data.busy,false);assert.equal(f.page.data.registrationError,'');assert.match(f.page.data.registeredDay,/^\d{4}-\d{2}-\d{2}$/);
  f.page.subscribe();assert.equal(f.subscriptions.length,1);assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,1);
  assert.ok(f.calls.some(c=>c.name==='showToast'&&c.args[0].title==='今天已经订阅'));
 }
});
test('a newly confirmed registration also locks the daily button instead of asking for another grant',()=>{
 const f=ready(fixture());respond(accepted(f),{error:0});f.page.subscribe();f.page.onShow();f.page.subscribe();assert.equal(f.page.data.accepted,true);assert.equal(f.subscriptions.length,1);assert.equal(f.requests.filter(r=>/adddy/.test(r.url)).length,1);
});
test('only the exact supported daily-limit reply is confirmation, while other failures remain failures',()=>{
 for(const data of [{error:1,msg:'今天已经订阅，请重试'},{error:1,msg:'登记失败'},{error:2,msg:'今天已经订阅'},{error:true,msg:'今天已经订阅'},{error:'01',msg:'今天已经订阅'},{error:1,message:'今天已经订阅'}]){
  const f=ready(fixture());respond(accepted(f),data);assert.equal(f.page.data.accepted,false);assert.equal(f.page.data.registeredDay,'');assert.ok(f.page.data.registrationError);
 }
 const f=ready(fixture());respond(accepted(f),{error:1,msg:'今天已经订阅'},503);assert.equal(f.page.data.accepted,false);
});
test('the page-only daily confirmation expires at Beijing midnight and cannot carry to another identity or template',()=>{
 const f=ready(fixture());f.evaluate('Date.now = () => Date.parse("2026-11-03T15:59:59Z")');respond(accepted(f),{error:1,msg:'今天已经订阅'});assert.equal(f.page.data.registeredDay,'2026-11-03');
 f.evaluate('Date.now = () => Date.parse("2026-11-03T16:00:00Z")');f.page.onShow();assert.equal(f.page.data.accepted,false);assert.equal(f.page.data.authorized,false);assert.equal(f.page.data.registeredDay,'');
 const other=ready(fixture());respond(accepted(other),{error:0});other.storage.set('openid','another-test-account');other.page.onShow();assert.equal(other.page.data.accepted,false);assert.equal(other.page.data.authorized,false);
 const changed=ready(fixture());respond(accepted(changed),{error:0});changed.page.getConfig();respond(changed.requests.at(-1),{error:0,sign:['another_valid_template_123']});assert.equal(changed.page.data.accepted,false);assert.equal(changed.page.data.registeredDay,'');
});
