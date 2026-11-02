'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function resolveModule(specifier, from, root=ROOT) {
  const bases = specifier.startsWith('.') ? [path.resolve(path.dirname(from), specifier)]
    : specifier.startsWith('/') ? [path.join(root, specifier)]
    : [path.resolve(path.dirname(from), specifier), path.join(root, specifier)];
  // Older WeChat bundles use bare sibling requires such as require('md5.js').
  for (const base of bases) for (const file of [base, `${base}.js`, path.join(base, 'index.js')]) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  throw new Error(`Unresolved module ${specifier} from ${path.relative(root, from)}`);
}

function makeRuntime(options={}) {
  const root = options.root || ROOT;
  const calls = [];
  const storage = new Map();
  const defaultWx = {
    getStorageSync: key => storage.has(key) ? clone(storage.get(key)) : '',
    setStorageSync: (key, value) => storage.set(key, clone(value)),
    removeStorageSync: key => storage.delete(key),
    getSystemInfoSync: () => ({windowWidth:390,windowHeight:844,pixelRatio:3,statusBarHeight:44,safeArea:{top:44,bottom:810,height:766}}),
    getWindowInfo: () => ({windowWidth:390,windowHeight:844,pixelRatio:3,statusBarHeight:44,safeArea:{top:44,bottom:810,height:766}}),
    getAccountInfoSync: () => ({miniProgram:{envVersion:'develop'}}),
    getMenuButtonBoundingClientRect: () => ({left:291,right:378,top:48,bottom:80,width:87,height:32}),
    canIUse: () => true
  };
  const overrides = options.wx || {};
  const wx = new Proxy({...defaultWx,...overrides}, {
    get(target,key) {
      if (key in target) return target[key];
      if (typeof key !== 'string') return undefined;
      const fn = (...args) => {calls.push({name:key,args});return undefined;};
      target[key] = fn;
      return fn;
    }
  });
  const request = opts => wx.request(opts);
  const app = options.app || {util:{url: value => `https://example.test/${value}?`,request},secureRequest:request,userInfo:{}};
  const definitions = new Map();
  const contexts = new Map();
  const cache = new Map();
  const mocks = options.modules || {};
  let currentEntry='';
  let activePage=null;
  function load(file) {
    file=path.resolve(file);
    if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const context=vm.createContext({
      module,exports:module.exports,wx,console:options.console||{log(){},info(){},warn(){},error(){}},
      getApp:()=>app,
      getCurrentPages:()=>activePage?[activePage]:[{route:currentEntry.replace(/\.js$/,'')}],
      Page: definition=>definitions.set(file,definition),
      Component: definition=>definitions.set(file,definition),
      App: definition=>definitions.set(file,definition),
      setTimeout:fn=>{calls.push({name:'timer',args:[fn]});return calls.length;},clearTimeout(){},
      setInterval:fn=>{calls.push({name:'interval',args:[fn]});return calls.length;},clearInterval(){},
      URL,URLSearchParams,encodeURIComponent,decodeURIComponent,
      require: specifier=>{
        if(Object.prototype.hasOwnProperty.call(mocks,specifier))return mocks[specifier];
        const resolved=resolveModule(specifier,file,root);
        const relative=path.relative(root,resolved).replaceAll(path.sep,'/');
        if(Object.prototype.hasOwnProperty.call(mocks,relative))return mocks[relative];
        return load(resolved);
      }
    });
    contexts.set(file,context);
    new vm.Script(fs.readFileSync(file,'utf8'),{filename:path.relative(root,file)}).runInContext(context,{timeout:5000});
    return module.exports;
  }
  function instantiate(relative) {
    currentEntry=relative.replaceAll(path.sep,'/');
    const file=path.join(root,relative);
    load(file);
    const definition=definitions.get(file);
    if(!definition)throw new Error(`No Page/Component registration in ${relative}`);
    const page={...definition,data:clone(definition.data||{})};
    page.setData=function(patch,callback){
      for(const [key,value] of Object.entries(patch||{})){
        const parts=key.replace(/\[(\d+)\]/g,'.$1').split('.');
        let cursor=this.data;
        for(let i=0;i<parts.length-1;i++){
          if(!cursor[parts[i]]||typeof cursor[parts[i]]!=='object')cursor[parts[i]]=/^\d+$/.test(parts[i+1])?[]:{};
          cursor=cursor[parts[i]];
        }
        cursor[parts.at(-1)]=clone(value);
      }
      if(typeof callback==='function')callback.call(this);
    };
    if(definition.methods)Object.assign(page,definition.methods);
    page.triggerEvent=(name,detail)=>calls.push({name:`event:${name}`,args:[detail]});
    page.route=relative.replace(/\.js$/,'');
    activePage=page;
    return {page,definition,wx,app,calls,storage,evaluate:expression=>new vm.Script(expression).runInContext(contexts.get(file))};
  }
  return {instantiate,load,wx,app,calls,storage,definitions,contexts};
}
const loadPage=(relative,options)=>makeRuntime(options).instantiate(relative);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
module.exports={ROOT,clone,resolveModule,makeRuntime,loadPage,flush};
