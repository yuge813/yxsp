'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {ROOT,loadPage}=require('./helpers/load-page.cjs');
const avatarSource=require('../sage_dksy/utils/avatar-source.js');
const SENTINELS=[0,'0',' 0 ',false,'false','FALSE',null,'null',undefined,'undefined','',' ',{},[]];
const URL='https://example.test/real-avatar.jpg?size=132';
function fixture(file,wx={}){
 const requests=[],logins=[],uploads=[];
 const f=loadPage(file,{wx:{request:r=>requests.push(r),login:r=>logins.push(r),uploadFile:r=>uploads.push(r),compressImage:null,...wx}});
 return {...f,requests,logins,uploads};
}
function accountReply(f,value){f.page.onShow();f.logins.at(-1).success({code:'test-code'});f.requests.at(-1).success({statusCode:200,data:{userinfo:{headimg:value,nickname:'真实用户',num:12},openid:'user-for-test'}});}
function profileReply(f,value){f.page.refreshProfile();f.logins.at(-1).success({code:'test-code'});f.requests.at(-1).success({statusCode:200,data:{error:0,userinfo:{headimg:value,nickname:'真实用户'}}});}
test('avatar sources reject backend empty markers and bare page-relative paths while preserving actual remote and selected local files',()=>{
 for(const value of SENTINELS)assert.equal(avatarSource(value),'',String(value));
 for(const value of ['0.png','images/avatar.jpg','javascript:alert(1)','data:text/html,bad','//example.test/avatar.jpg'])assert.equal(avatarSource(value),'');
 for(const value of [URL,'http://example.test/avatar.jpg','wxfile://tmp/avatar.png','http://tmp/avatar.png','https://tmp/avatar.png','file:///tmp/avatar.png','/sage_dksy/resource/brand/logo.png','C:\\temp\\avatar.png'])assert.equal(avatarSource(value),value);
});
test('actual account responses with string zero or other missing-avatar values select the existing default icon without changing account data',()=>{
 for(const value of SENTINELS){const f=fixture('sage_dksy/pages/user/index.js');accountReply(f,value);assert.equal(f.page.data.userinfo.headimg,'');assert.equal(f.page.data.avatarFailed,false);assert.equal(f.page.data.balance,12);assert.equal(f.page.data.userinfo.nickname,'真实用户');}
 const view=fs.readFileSync(ROOT+'/sage_dksy/pages/user/index.wxml','utf8');assert.ok(view.includes('wx:if="{{userinfo.headimg&&!avatarFailed}}"'));assert.ok(view.includes('wx:else class="mine-avatar mine-avatar-empty"'));
});
test('account refresh preserves valid remote avatars, keeps image-error fallback and clears a later empty backend marker',()=>{
 const f=fixture('sage_dksy/pages/user/index.js');accountReply(f,URL);assert.equal(f.page.data.userinfo.headimg,URL);f.page.avatarError();assert.equal(f.page.data.avatarFailed,true);accountReply(f,'0');assert.equal(f.page.data.userinfo.headimg,'');assert.equal(f.page.data.avatarFailed,false);
});
test('profile responses normalize missing avatars while preserving a real avatar and its existing editable nickname',()=>{
 for(const value of ['0',null,false,{}]){const f=fixture('sage_dksy/pages/user/user/index.js');profileReply(f,value);assert.equal(f.page.data.userinfo.headimg,'');assert.equal(f.page.data.nickname,'真实用户');}
 const f=fixture('sage_dksy/pages/user/user/index.js');profileReply(f,URL);assert.equal(f.page.data.userinfo.headimg,URL);f.page.avatarError();assert.equal(f.page.data.userinfo.headimg,'');assert.equal(f.page.data.avatarPreview,'');
});
test('selected avatar upload retains native local paths and refuses a backend zero marker as a saved image',()=>{
 const f=fixture('sage_dksy/pages/user/user/index.js');f.page.setData({userinfo:{headimg:URL}});f.page.uploadSelectedAvatar('wxfile://tmp/selected.png');assert.equal(f.page.data.avatarPreview,'wxfile://tmp/selected.png');f.logins[0].success({code:'test-code'});assert.equal(f.uploads[0].filePath,'wxfile://tmp/selected.png');
 f.uploads[0].success({statusCode:200,data:JSON.stringify({error:0,path:'0'})});f.uploads[0].complete();assert.equal(f.page.data.userinfo.headimg,URL);assert.ok(f.page.data.profileError);assert.equal(f.page.data.avatarPreview,'');
 f.page.uploadSelectedAvatar('http://tmp/next.png');f.logins[1].success({code:'test-code'});f.uploads[1].success({statusCode:200,data:JSON.stringify({error:0,path:URL})});f.uploads[1].complete();assert.equal(f.page.data.userinfo.headimg,URL);assert.equal(f.page.data.avatarPreview,'');assert.equal(f.page.data.profileError,'');
});
test('promotion login normalizes the same backend avatar marker without replacing a real user image',()=>{
 for(const [value,expected] of [['0',''],[false,''],[URL,URL]]){
  const pending=[],logins=[];const f=loadPage('sage_dksy/pages/v11/promote.js',{wx:{login:r=>logins.push(r)},modules:{'sage_dksy/utils/v11.js':{api:(name,data,success)=>pending.push({name,success})}}});
  f.page._alive=true;f.page.init();logins[0].success({code:'test-code'});assert.equal(pending[0].name,'set');pending[0].success({auth_token:'test-session',userinfo:{headimg:value,nickname:'真实用户'}});assert.equal(f.page.data.avatar,expected);assert.equal(f.page.data.nickname,'真实用户');
 }
});
