'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {makeRuntime,ROOT}=require('./helpers/load-page.cjs');
function parsed(html='<p>正文</p>'){
 const runtime=makeRuntime();const {page,calls}=runtime.instantiate('sage_dksy/pages/prize/prize_show.js');
 const parser=runtime.load(path.join(ROOT,'sage_dksy/wxParse/wxParse.js'));parser.wxParse('content','html',html,page,0);return {page,calls};
}
test('rich-text parsing injects the actual image and link event handlers used by imported templates',()=>{
 const {page}=parsed();for(const name of ['wxParseImgLoad','wxParseImgTap','wxParseTagATap'])assert.equal(typeof page[name],'function');
});
test('rich-text links require explicit user confirmation to copy and never navigate automatically',()=>{
 const {page,calls}=parsed();const link='https://example.test/source';page.wxParseTagATap({currentTarget:{dataset:{src:link}}});
 const modal=calls.find(c=>c.name==='showModal').args[0];assert.equal(calls.some(c=>c.name==='setClipboardData'),false);assert.equal(calls.some(c=>['navigateTo','redirectTo'].includes(c.name)),false);
 modal.success({confirm:true});assert.equal(calls.find(c=>c.name==='setClipboardData').args[0].data,link);
});
test('rich-text custom schemes are not copied or navigated',()=>{
 const {page,calls}=parsed();for(const src of ['javascript:alert(1)','weixin://profile','ftp://example.test','https://user:pass@example.test/'])page.wxParseTagATap({currentTarget:{dataset:{src}}});
 assert.equal(calls.some(c=>['setClipboardData','showModal','navigateTo','redirectTo'].includes(c.name)),false);
});
test('rich-text depth fallback retains text below the bounded WXML template depth',()=>{
 const {page}=parsed('<div>'.repeat(16)+'深层正文'+'</div>'.repeat(16));let node=page.data.content.nodes[0],depth=0,seen=false;
 while(node){if(node.terminalText&&node.terminalText.includes('深层正文'))seen=true;node=node.nodes&&node.nodes[0];depth++;}
 assert.ok(depth>12);assert.equal(seen,true);
});
