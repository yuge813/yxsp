'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {makeRuntime}=require('./helpers/load-page.cjs');
const HERO='/sage_dksy/resource/red/hero.png';
const LOGO='/sage_dksy/resource/brand/logo.png';
const QR='http://tmp/verified-real-qr.png';
function fixture(options={}){
 const images=[],exports=[],drawn=[],texts=[],drawCallbacks=[],saved=[];
 const context=new Proxy({}, {get(_target,key){
  if(key==='createLinearGradient')return ()=>({addColorStop(){}});
  if(key==='fillText')return (...args)=>texts.push(args);
  if(key==='drawImage')return (...args)=>{drawn.push(args);if(typeof args[0]!=='string'||!/^\/|^[a-z]:[\\/]|^(?:wxfile:|file:|https?:)/i.test(args[0]))throw Error('legacy canvas resolved a relative image against the page directory');};
  if(key==='draw')return (_reserve,done)=>{drawCallbacks.push(done);if(!options.deferDraw)done();};
  return ()=>{};
 }});
 const runtime=makeRuntime({wx:{env:{USER_DATA_PATH:'http://usr'},
  getImageInfo:input=>{if(options.imageThrows||options.imageThrowsOn===input.src)throw Error('image API failed');images.push(input);},
  createCanvasContext:()=>{if(options.canvasThrows)throw Error('canvas unavailable');return context;},
  canvasToTempFilePath:input=>{if(options.exportThrows)throw Error('export API failed');exports.push(input);},
  saveImageToPhotosAlbum:input=>saved.push(input)
 },modules:{'sage_dksy/utils/v11.js':{api(){},toast(){},env(){return 'develop';}}}});
 const {page}=runtime.instantiate('sage_dksy/pages/v11/promote.js');
 page._alive=true;page._identityKey='member|aabbccddeeff|develop';
 page.setData({code:'aabbccddeeff',nickname:'实际用户'});
 page.ensureQr=done=>done(true,QR);
 const renderer=runtime.load('/workspace/yxsp/sage_dksy/pages/v11/red-poster.js');
 const timers=()=>runtime.calls.filter(call=>call.name==='timer');
 return {page,renderer,images,exports,drawn,texts,drawCallbacks,saved,timers};
}
function decoded(input,path){input.success({path:path||input.src.slice(1),width:input.src===LOGO?512:420,height:input.src===LOGO?512:368});}
function decodeBoth(f,attempt=0){decoded(f.images[attempt*2]);decoded(f.images[attempt*2+1]);}
test('poster restores both package-root image paths, draws the official logo and keeps the verified QR unchanged',()=>{
 const f=fixture();f.page.makeQr();assert.equal(f.page.data.drawing,true);assert.deepEqual(f.images.map(x=>x.src),[HERO,LOGO]);
 decoded(f.images[0]);assert.equal(f.drawn.length,0,'both brand resources must be decoded before drawing');decoded(f.images[1]);
 assert.deepEqual(f.drawn.map(x=>x[0]),[LOGO,HERO,QR]);assert.equal(f.texts.some(x=>x[0]==='享'),false,'no hand-drawn substitute logo');
 assert.equal(f.drawn[0][3],58);assert.equal(f.drawn[0][4],58);
 assert.equal(f.exports.length,1);assert.equal(f.exports[0].canvasId,'v11ShareCanvas');assert.equal(f.exports[0].destWidth,1080);
 f.exports[0].success({tempFilePath:'http://tmp/exported-poster.jpg'});
 assert.equal(f.page.data.drawing,false);assert.equal(f.page.data.posterPath,'http://tmp/exported-poster.jpg');assert.equal(f.page.data.qrStage,'');
});
test('poster preserves absolute and WeChat/Windows local paths for both brand assets in either load order',()=>{
 const pairs=[[HERO,LOGO],['./'+HERO.slice(1),'./'+LOGO.slice(1)],['wxfile://tmp/hero.png','wxfile://tmp/logo.png'],['http://tmp/hero.png','http://tmp/logo.png'],['http://usr/hero.png','http://usr/logo.png'],['C:\\WeChat\\tmp\\hero.png','C:\\WeChat\\tmp\\logo.png']];
 for(const [hero,logo] of pairs){
  const f=fixture();f.page.makeQr();decoded(f.images[1],logo);assert.equal(f.drawn.length,0);decoded(f.images[0],hero);
  assert.deepEqual(f.drawn.map(x=>x[0]),[logo.startsWith('./')?LOGO:logo,hero.startsWith('./')?HERO:hero,QR]);assert.equal(f.exports.length,1);
 }
});
test('poster refuses an unverified remote QR before requesting official brand assets',()=>{
 const f=fixture(),failures=[];
 f.renderer.render(f.page,'https://example.test/qr.png',0,{},()=>assert.fail('must not export'),m=>failures.push(m));
 assert.equal(f.images.length,0);assert.equal(f.drawn.length,0);assert.equal(failures.length,1);
});
test('artwork failure clears generation and automatic-save locks, allowing a fresh successful retry',()=>{
 const f=fixture();f.page.saveQrPoster();assert.equal(f.page._saveAfterRender,true);
 f.images[0].fail({errMsg:'missing hero'});assert.equal(f.page.data.drawing,false);assert.equal(f.page._saveAfterRender,false);assert.match(f.page.data.qrStage,/插画/);
 decoded(f.images[1]);assert.equal(f.drawn.length,0,'late logo does not revive failed render');
 f.page.saveQrPoster();assert.equal(f.images.length,4);decodeBoth(f,1);f.exports[0].success({tempFilePath:'wxfile://tmp/poster.jpg'});
 assert.equal(f.page.data.drawing,false);assert.equal(f.saved.length,1);assert.equal(f.saved[0].filePath,'wxfile://tmp/poster.jpg');
 f.saved[0].complete();assert.equal(f.page.data.saveBusy,false);
});
test('a missing or invalid official logo fails explicitly, unlocks generation and never draws a substitute',()=>{
 for(const kind of ['missing','invalid-path','invalid-size']){
  const f=fixture();f.page.makeQr();decoded(f.images[0]);
  if(kind==='missing')f.images[1].fail({errMsg:'missing logo'});
  else f.images[1].success({path:kind==='invalid-path'?'https://example.test/logo.png':LOGO,width:kind==='invalid-size'?0:512,height:512});
  assert.equal(f.page.data.drawing,false);assert.match(f.page.data.qrStage,/LOGO/);assert.equal(f.drawn.length,0);assert.equal(f.exports.length,0);
 }
});
test('a stalled logo request times out and ignores late data; a subsequent retry can export normally',()=>{
 const f=fixture();f.page.makeQr();decoded(f.images[0]);assert.equal(f.exports.length,0);
 f.timers()[0].args[0]();assert.equal(f.page.data.drawing,false);assert.match(f.page.data.qrStage,/超时/);
 decoded(f.images[1]);assert.equal(f.drawn.length,0);f.page.makeQr();decodeBoth(f,1);assert.equal(f.exports.length,1);
});
test('a stalled canvas draw times out once, releases the page and ignores a late draw callback',()=>{
 const f=fixture({deferDraw:true});f.page.makeQr();decodeBoth(f);assert.equal(f.exports.length,0);
 f.timers()[0].args[0]();assert.equal(f.page.data.drawing,false);assert.match(f.page.data.qrStage,/超时/);
 f.drawCallbacks[0]();assert.equal(f.exports.length,0);
 f.page.makeQr();assert.equal(f.images.length,4);decodeBoth(f,1);f.drawCallbacks[1]();assert.equal(f.exports.length,1);
});
test('export failure and synchronous image/canvas platform exceptions release the generation lock',()=>{
 for(const options of [{imageThrows:true},{imageThrowsOn:LOGO},{canvasThrows:true},{exportThrows:true},{}]){
  const f=fixture(options);f.page.makeQr();for(const request of f.images)decoded(request);
  if(f.exports.length)f.exports[0].fail({errMsg:'export failed'});
  assert.equal(f.page.data.drawing,false,JSON.stringify(options));assert.equal(f.page.data.posterPath,'');
 }
});
test('duplicate asset, draw and export callbacks cannot start another export or overwrite the completed poster',()=>{
 const f=fixture({deferDraw:true});f.page.makeQr();
 for(const request of f.images){decoded(request);decoded(request);request.fail();}
 assert.equal(f.drawn.length,3);assert.equal(f.drawCallbacks.length,1);assert.equal(f.page.data.drawing,true);
 f.drawCallbacks[0]();f.drawCallbacks[0]();assert.equal(f.exports.length,1);
 f.exports[0].success({tempFilePath:'wxfile://tmp/first.jpg'});f.exports[0].success({tempFilePath:'wxfile://tmp/second.jpg'});f.exports[0].fail();
 assert.equal(f.page.data.posterPath,'wxfile://tmp/first.jpg');assert.equal(f.page.data.drawing,false);
});
test('unloading prevents late logo and export callbacks from changing a destroyed poster page',()=>{
 for(const exportPending of [false,true]){
  const f=fixture();f.page.makeQr();decoded(f.images[0]);if(exportPending)decoded(f.images[1]);f.page.onUnload();
  const state=JSON.stringify(f.page.data);
  if(exportPending)f.exports[0].success({tempFilePath:'wxfile://tmp/late.jpg'});else decoded(f.images[1]);
  f.timers()[0].args[0]();assert.equal(JSON.stringify(f.page.data),state);assert.equal(f.saved.length,0);
 }
});
