'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {makeRuntime,ROOT}=require('./helpers/load-page.cjs');
function fixture(){const requests=[],successes=[],failures=[];const runtime=makeRuntime({wx:{request:o=>requests.push(o)}});const api=runtime.load(path.join(ROOT,'sage_dksy/utils/v11.js')).api;api('v12feed',{category:'recommend'},body=>successes.push(body),message=>failures.push(message));return {requests,successes,failures};}
test('shared API rejects non-2xx responses even if the response body looks successful',()=>{
 for(const statusCode of [0,undefined,401,500,503]){const f=fixture();f.requests[0].success({statusCode,data:{error:0,items:[]}});assert.equal(f.successes.length,0);assert.equal(f.failures.length,1);}
});
test('shared API rejects missing, malformed, array and empty-object response bodies',()=>{
 for(const data of [undefined,null,'not JSON','null','[]','{}',[],{}]){const f=fixture();f.requests[0].success({statusCode:200,data});assert.equal(f.successes.length,0,JSON.stringify(data));assert.equal(f.failures.length,1);}
});
test('shared API accepts valid JSON strings and legacy nonempty objects without an error field',()=>{
 for(const data of ['{"error":0,"items":[]}',{error:'0',items:[]},{items:[]}]){const f=fixture();f.requests[0].success({statusCode:200,data});assert.equal(f.successes.length,1);assert.equal(f.successes[0].items.length,0);assert.equal(f.failures.length,0);assert.equal(f.requests[0].method,'POST');}
});
test('shared API rejects business errors and sanitizes technical error messages',()=>{
 for(const data of [{error:1,msg:'PHP SQLSTATE token diagnostic'},{error:'invalid',msg:'异常'}]){const f=fixture();f.requests[0].success({statusCode:200,data});assert.equal(f.successes.length,0);assert.equal(f.failures.length,1);assert.doesNotMatch(f.failures[0],/PHP|SQLSTATE|token/);}
});
test('shared API reports transport failures through the failure callback only',()=>{
 const f=fixture();f.requests[0].fail({errMsg:'request failed'});assert.equal(f.successes.length,0);assert.equal(f.failures.length,1);assert.match(f.failures[0],/重试/);
});
