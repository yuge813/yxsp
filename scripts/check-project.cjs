#!/usr/bin/env node
'use strict';
// Source checks only. This does not compile WXML/WXSS with WeChat's renderer.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {makeRuntime,resolveModule}=require('../tests/helpers/load-page.cjs');
const root=path.resolve(__dirname,'..');
const issues=[],warnings=[];
const counts={pages:0,pageLoads:0,components:0,json:0,js:0,wxml:0,wxss:0,requireReferences:0,componentReferences:0,handlerReferences:0,templateReferences:0,staticAssetReferences:0,staticRouteReferences:0,dynamicReferences:0};
const relative=file=>path.relative(root,file).replaceAll(path.sep,'/');
const read=file=>fs.readFileSync(file,'utf8');
function issue(file,message,line){issues.push({file:relative(file),...(line?{line}:{}),message});}
function warn(file,message){warnings.push({file:relative(file),message});}
function walk(dir){const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules','.cache'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(file));else if(entry.isFile())out.push(file);}return out;}
const allFiles=walk(root);
const sourceFiles=allFiles.filter(file=>!/^tests\/|^scripts\/|^docs\/|^preview\//.test(relative(file)));
const appFile=path.join(root,'app.json');
const json=new Map();
for(const file of sourceFiles.filter(file=>file.endsWith('.json'))){try{json.set(file,JSON.parse(read(file)));counts.json++;}catch(error){issue(file,`Invalid JSON: ${error.message}`);}}
const app=json.get(appFile)||{};
const pages=new Set(app.pages||[]);
counts.pages=pages.size;
if(pages.size!==(app.pages||[]).length)issue(appFile,'Duplicate page registration');
function resolveLocal(reference,from){return reference.startsWith('/')?path.join(root,reference):path.resolve(path.dirname(from),reference);}
function checkExists(reference,from,label,extension=''){
 const file=resolveLocal(reference,from)+extension;
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())issue(from,`${label} not found: ${reference}${extension}`);
 return file;
}
for(const file of sourceFiles.filter(file=>file.endsWith('.js'))){
 try{new vm.Script(read(file),{filename:relative(file)});counts.js++;}catch(error){issue(file,`JavaScript syntax: ${error.message}`);}
 const text=read(file);
 for(const match of text.matchAll(/\brequire\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g)){
  counts.requireReferences++;
  try{resolveModule(match[2],file,root);}catch(error){issue(file,error.message,text.slice(0,match.index).split('\n').length);}
 }
}
const nativeTags=new Set('view scroll-view swiper swiper-item movable-area movable-view cover-view cover-image icon text rich-text progress button checkbox checkbox-group editor form input label picker picker-view picker-view-column radio radio-group slider switch textarea navigator functional-page-navigator audio camera image live-player live-pusher video voip-room map canvas ad ad-custom official-account open-data web-view navigation-bar page-meta block template import include slot component contact-button match-media root-portal share-element channel-live channel-video snapshot aria-component page-container keyboard-accessory xr-frame'.split(' '));
function tags(text){
 const found=[];let index=0;
 while((index=text.indexOf('<',index))!==-1){
  if(text.startsWith('<!--',index)){const end=text.indexOf('-->',index+4);if(end===-1){found.push({raw:text.slice(index),index,malformed:true});break;}index=end+3;continue;}
  let end=index+1,quote='';
  for(;end<text.length;end++){const char=text[end];if(quote){if(char===quote)quote='';}else if(char==='"'||char==="'")quote=char;else if(char==='>')break;}
  if(end>=text.length){found.push({raw:text.slice(index),index,malformed:true});break;}
  const raw=text.slice(index,end+1),name=/^<\/?\s*([\w:-]+)/.exec(raw);
  if(name){const attrs={};for(const match of raw.matchAll(/([\w:@-]+)\s*=\s*(['"])([\s\S]*?)\2/g))attrs[match[1]]=match[3];found.push({raw,index,name:name[1],attrs,closing:/^<\//.test(raw),selfClosing:/\/\s*>$/.test(raw)});}
  index=end+1;
 }
 return found;
}
const wxmlCache=new Map();
function parseWxml(file){
 if(wxmlCache.has(file))return wxmlCache.get(file);
 const text=read(file),parsed=tags(text),stack=[];
 for(const tag of parsed){if(tag.malformed){issue(file,'Unterminated WXML tag/comment');continue;}if(tag.closing){const last=stack.pop();if(last!==tag.name)issue(file,`WXML closing </${tag.name}> mismatches <${last||'none'}>`,text.slice(0,tag.index).split('\n').length);}else if(!tag.selfClosing)stack.push(tag.name);}
 if(stack.length)issue(file,`Unclosed WXML elements: ${stack.join(', ')}`);
 wxmlCache.set(file,parsed);return parsed;
}
function templateFiles(file,visited=new Set()){
 if(visited.has(file)||!fs.existsSync(file))return visited;visited.add(file);
 for(const tag of parseWxml(file))if(['include','import'].includes(tag.name)&&tag.attrs.src&&!tag.attrs.src.includes('{{')){
  const next=checkExists(tag.attrs.src,file,'Template');counts.templateReferences++;
  if(fs.existsSync(next))templateFiles(next,visited);
 }
 return visited;
}
const componentChecked=new Set();
function componentsFor(configFile){return {...(app.usingComponents||{}),...((json.get(configFile)||{}).usingComponents||{})};}
function checkComponent(name,reference,configFile){
 counts.componentReferences++;
 if(reference.startsWith('plugin://')){warn(configFile,`Plugin component ${name} requires WeChat runtime validation`);return;}
 const base=resolveLocal(reference,configFile);
 if(componentChecked.has(base))return;componentChecked.add(base);counts.components++;
 for(const ext of ['.js','.json','.wxml'])checkExists(reference,configFile,`Component ${name}`,ext);
 if(fs.existsSync(base+'.wxml'))checkView(base,componentsFor(base+'.json'),true);
}
function checkView(base,components,isComponent=false){
 const file=base+'.wxml';if(!fs.existsSync(file))return;
 const views=templateFiles(file),names=new Set(),runtime=makeRuntime({root});let definition;
 try{definition=runtime.instantiate(relative(base+'.js')).definition;if(!isComponent)counts.pageLoads++;}catch(error){issue(base+'.js',`Page/component module evaluation: ${error.message}`);definition={};}
 const handlers={...definition,...(definition.methods||{})};
 // Accept only handlers whose assignments are present in the actual wxParse adapter.
 const js=fs.existsSync(base+'.js')?read(base+'.js'):'';
 if(/\.wxParse\(/.test(js)){const parser=read(path.join(root,'sage_dksy/wxParse/wxParse.js'));for(const name of ['wxParseImgLoad','wxParseImgTap','wxParseTagATap'])if(new RegExp('\\.'+name+'\\s*=').test(parser))handlers[name]=true;}
 for(const view of views){for(const tag of parseWxml(view)){if(tag.closing||tag.malformed)continue;if(tag.name==='template'&&tag.attrs.name)names.add(tag.attrs.name);}}
 for(const view of views){const text=read(view);for(const tag of parseWxml(view)){
  if(tag.closing||tag.malformed)continue;
  const line=text.slice(0,tag.index).split('\n').length;
  if(!nativeTags.has(tag.name)&&!Object.prototype.hasOwnProperty.call(components,tag.name))issue(view,`Unregistered component <${tag.name}> used by ${relative(base)}`,line);
  for(const [attribute,value] of Object.entries(tag.attrs)){
   if(/^(?:bind|catch|capture-bind|capture-catch)(?::[\w-]+|[\w-]+)$/.test(attribute)&&value){
    if(value.includes('{{'))counts.dynamicReferences++;else{counts.handlerReferences++;if(typeof handlers[value]!=='function'&&handlers[value]!==true)issue(view,`Handler ${value} is missing in ${relative(base+'.js')}`,line);}
   }
  }
  if(tag.name==='yx-icon'&&tag.attrs.name&&!tag.attrs.name.includes('{{')&&!(tag.attrs.tone||'ink').includes('{{')){counts.staticAssetReferences++;checkExists('/sage_dksy/resource/ui/'+tag.attrs.name+'-'+(tag.attrs.tone||'ink')+'.png',view,'Icon asset');}
  if(tag.name==='template'&&tag.attrs.is){const name=tag.attrs.is;if(name.includes('{{'))counts.dynamicReferences++;else if(!names.has(name))issue(view,`Unknown imported/named template ${name}`,line);}
  if(['image','cover-image','audio','video'].includes(tag.name)&&tag.attrs.src){const src=tag.attrs.src;if(src.includes('{{'))counts.dynamicReferences++;else if(!/^(?:https?:|data:|wxfile:|cloud:|\/\/)/i.test(src)){counts.staticAssetReferences++;checkExists(src,view,'Asset');}}
  if(tag.name==='navigator'&&tag.attrs.url){const url=tag.attrs.url;if(url.includes('{{'))counts.dynamicReferences++;else if(!/^(?:https?:|plugin:)/.test(url)){const route=relative(resolveLocal(url.split('?')[0],view));counts.staticRouteReferences++;if(!pages.has(route))issue(view,`Navigator target is not a registered page: ${url}`,line);}}
 }}
 for(const [name,reference]of Object.entries(components))checkComponent(name,reference,base+'.json');
}
for(const route of pages){
 const base=path.join(root,route);
 for(const ext of ['.js','.json','.wxml'])if(!fs.existsSync(base+ext))issue(appFile,`Registered page file missing: ${route}${ext}`);
 if(!fs.existsSync(base+'.wxss'))warn(appFile,`Page ${route} uses global styles only; no local WXSS`);
 checkView(base,componentsFor(base+'.json'));
}
for(const file of sourceFiles.filter(file=>file.endsWith('.wxml'))){counts.wxml++;parseWxml(file);}
for(const file of sourceFiles.filter(file=>file.endsWith('.wxss'))){
 counts.wxss++;const text=read(file);
 for(const match of text.matchAll(/@import\s+(['"])([^'"]+)\1\s*;/g))checkExists(match[2],file,'WXSS import');
}
const project=json.get(path.join(root,'project.config.json'))||{};
const rules=project.packOptions&&project.packOptions.ignore||[];
function ignored(rel){return rules.some(rule=>{const value=String(rule.value||'').replace(/^\/+|\/+$/g,'');return rule.type==='folder'?(rel===value||rel.startsWith(value+'/')):rule.type==='file'?rel===value:rule.type==='suffix'?rel.endsWith(value):rule.type==='prefix'?rel.startsWith(value):false;});}
const included=allFiles.filter(file=>!ignored(relative(file)));
const includedSet=new Set(included);
const includedBytes=included.reduce((sum,file)=>sum+fs.statSync(file).size,0);
for(const route of pages)for(const ext of ['.js','.json','.wxml']){const file=path.join(root,route+ext);if(fs.existsSync(file)&&!includedSet.has(file))issue(appFile,`Required registered page excluded by pack rules: ${route}${ext}`);}
if(includedBytes>2*1024*1024)warn(path.join(root,'project.config.json'),`Raw included files total ${includedBytes} bytes, over 2 MiB. This is a source estimate; verify final main-package size in WeChat DevTools.`);
const tooling=included.filter(file=>/^(?:tests|scripts|docs)\//.test(relative(file)));
if(tooling.length)warn(path.join(root,'project.config.json'),`${tooling.length} test/script/doc files are currently included by pack rules; exclude development-only tooling.`);
const report={status:issues.length?'failed':'passed',counts,package:{includedFiles:included.length,rawIncludedBytes:includedBytes,rawIncludedMiB:Number((includedBytes/1024/1024).toFixed(3)),limitNote:'Uncompiled source estimate only, not a WeChat package-size measurement'},issues,warnings,limits:['Does not run WeChat compiler or renderer, real device, backend, or real ad/settlement.','Dynamic images, route expressions, event names, runtime data and native SDK semantics require runtime validation.','wxParse injected handlers are accepted only for pages that invoke wxParse and only when the assignment exists in the adapter; all other imported-template handlers are checked.','All page module evaluation uses offline wx/request stubs; no lifecycle or network calls execute.']};
const output=process.argv.find(arg=>arg.startsWith('--json='));if(output)fs.writeFileSync(path.resolve(root,output.slice(7)),JSON.stringify(report,null,2)+'\n');
console.log(`Source checks ${report.status}: ${counts.pages} registered pages, ${counts.pageLoads} page modules, ${counts.js} JS, ${counts.json} JSON, ${counts.handlerReferences} event references.`);
console.log(`Pack estimate: ${included.length} files, ${includedBytes} raw bytes (${report.package.rawIncludedMiB} MiB).`);
for(const item of issues)console.error(`ERROR ${item.file}${item.line?':'+item.line:''}: ${item.message}`);
for(const item of warnings)console.warn(`NOTE ${item.file}: ${item.message}`);
process.exitCode=issues.length?1:0;
