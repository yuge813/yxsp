const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
function option(name,fallback){const args=process.argv.slice(2),key='--'+name;const inline=args.find(a=>a.startsWith(key+'='));if(inline)return inline.slice(key.length+1);const i=args.indexOf(key);return i>=0?args[i+1]:fallback;}
const PREVIEW_SET=option('set','core');if(!['core','benefits'].includes(PREVIEW_SET))throw new Error('Choose --set core or benefits');
const OUT=path.resolve(option('output',PREVIEW_SET==='benefits'?'/workspace/scratch/yuanxiang_red_benefits_preview':'/workspace/scratch/yuanxiang_red_release_preview'));fs.mkdirSync(OUT,{recursive:true});
const astPath=path.join(OUT,'wxml-ast.json');
if(!fs.existsSync(astPath))throw new Error('Parse current WXML first: python3 design/preview/parse_wxml.py > '+astPath);
const ast=JSON.parse(fs.readFileSync(astPath,'utf8'));
const {loadPage}=require('../../tests/helpers/load-page.cjs');
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures.json'),'utf8'));
const errors=[];const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ev(expr,data){try{return Function('scope','with(scope){return ('+expr+')}')(new Proxy(data,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:undefined}));}catch(e){errors.push(expr+': '+e.message);return undefined;}}
function value(raw,data){raw=String(raw??'');const exact=raw.match(/^\{\{((?:(?!\}\})[\s\S])*)\}\}$/);if(exact)return ev(exact[1],data);return raw.replace(/\{\{([\s\S]*?)\}\}/g,(_,expr)=>{const v=ev(expr,data);return v==null?'':String(v);});}
function asset(url){if(!url)return '';if(url.startsWith('data:'))return url;if(url.startsWith('http'))return '';let p=path.resolve(ROOT,url.replace(/^\//,''));if(!p.startsWith(ROOT)||!fs.existsSync(p))return '';return 'data:'+({'.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml'}[path.extname(p)]||'application/octet-stream')+';base64,'+fs.readFileSync(p).toString('base64');}
function children(list,data,base){let branch=false,matched=false;return list.map(node=>{if(typeof node==='string')return esc(value(node,data));const a=node.attrs||{};
 if('wx:if'in a){branch=true;matched=!!value(a['wx:if'],data);return matched?render(node,data,base):'';}
 if('wx:elif'in a){if(!branch||matched)return '';matched=!!value(a['wx:elif'],data);return matched?render(node,data,base):'';}
 if('wx:else'in a){const yes=branch&&!matched;matched=true;return yes?render(node,data,base):'';}
 if(node.tag!=='wxs')branch=false;
 return render(node,data,base);
}).join('');}
function render(node,data,base,iterated=false){if(typeof node==='string')return esc(value(node,data));const t=node.tag,a=node.attrs||{};
 if('wx:for'in a&&!iterated){const arr=value(a['wx:for'],data)||[];return Array.from(arr).map((item,index)=>render(node,{...data,[a['wx:for-item']||'item']:item,[a['wx:for-index']||'index']:index},base,true)).join('');}
 if(iterated&&'wx:if'in a&&!value(a['wx:if'],data))return '';
 if(t==='include'){const src=String(value(a.src,data)||''),key=src.startsWith('/')?src.slice(1):path.posix.join(path.posix.dirname(base),src);return ast[key]?children(ast[key].children,data,key):'';}
 if(['import','wxs','ad','ad-custom','yx22-ad','yx22-popup','template'].includes(t))return '';
 if(t==='yx-icon'){const name=value(a.name,data)||'gift',tone=value(a.tone,data)||'ink',size=Number(value(a.size,data)||44)*390/750;return `<yx-icon class="yx-icon-host" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;flex-shrink:0"><img style="width:100%;height:100%" src="${asset('/sage_dksy/resource/ui/'+name+'-'+tone+'.png')}"/></yx-icon>`;}
 if(t==='yx-state'){const key='sage_dksy/components/yx-state/index.wxml',props={type:'empty',title:'',description:'',action:''};for(const k of Object.keys(props))if(k in a)props[k]=value(a[k],data);return ast[key]?children(ast[key].children,props,key):'';}
 const tag={root:'div',view:'div',text:'span',navigator:'a','scroll-view':'div',image:'img','swiper-item':'div',swiper:'div',block:'fragment','rich-text':'div'}[t]||t;
 if(tag==='fragment')return children(node.children,data,base);
 let attr='';for(let [k,v]of Object.entries(a)){if(k.startsWith('wx:')||k.startsWith('bind')||k.startsWith('catch')||k==='mode'||k==='url'||k.startsWith('data-')||k==='open-type'||k==='hover-class')continue;
  if(['class','style','src','placeholder','value','type','aria-label'].includes(k)){v=value(v,data);if(k==='src')v=asset(String(v||''));if(k==='style')v=String(v).replace(/([\d.]+)rpx/g,(_,n)=>(+n*390/750)+'px');attr+=' '+k+'="'+esc(v)+'"';}
  if(k==='disabled'&&value(v,data))attr+=' disabled';
 }
 if(t==='image'){const mode=value(a.mode,data)||'scaleToFill';attr+=' style="object-fit:'+(['aspectFill','widthFix'].includes(mode)?'cover':'contain')+'"';}
 if(t==='swiper-item')attr+=' class="preview-swiper-item"';
 if(t==='scroll-view'&&value(a['scroll-x'],data))attr+=' data-preview-scroll-x="true"';
 if(t==='navigator')attr+=' href="#"';
 return '<'+tag+attr+'>'+(['img','input'].includes(tag)?'':children(node.children,data,base)+'</'+tag+'>');
}
function css(name,seen=new Set()){if(seen.has(name))return '';seen.add(name);const full=path.join(ROOT,name);if(!fs.existsSync(full))return '';return fs.readFileSync(full,'utf8').replace(/@import\s+["']([^"']+)["'];/g,(_,s)=>css(path.posix.join(path.posix.dirname(name),s),seen)).replace(/([\d.]+)rpx/g,(_,n)=>(+n*390/750)+'px').replace(/(^|[}\s])page(?=[\s,{.])/g,'$1.mini-page').replace(/(?<![-\w])(view|text|image|navigator|scroll-view|swiper-item|swiper)(?![-\w])/g,t=>({view:'div',text:'span',image:'img',navigator:'a','scroll-view':'div','swiper-item':'div',swiper:'div'}[t]));}
// Demonstration photo crops are isolated to this offline reviewer, never app source.
const sheet=fs.readFileSync(path.join(__dirname,'fixtures/products.png')).toString('base64');
function photo(x,y){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} 768 512"><image href="data:image/png;base64,${sheet}" width="1536" height="1024"/></svg>`;return 'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');}
const products=[{prize_id:901,prize_title:'随行真空保温杯',prize_integral:1800,prize_num:12,prize_picurl:photo(0,0),_displayPrice:'1,800',_canRedeem:true,_soldOut:false},{prize_id:902,prize_title:'轻盈头戴式耳机',prize_integral:2400,prize_num:8,prize_picurl:photo(768,0),_displayPrice:'2,400',_canRedeem:true,_soldOut:false},{prize_id:903,prize_title:'日常陶瓷马克杯',prize_integral:3200,prize_num:7,prize_picurl:photo(768,512),_displayPrice:'3,200',_canRedeem:false,_soldOut:false}];
const trials=[{pro_id:991,pro_title:'简约恒温电热水壶',pro_picurl:photo(0,512),pro_num:20,isyes:'1',end_time_day:'11.10 18:00',apply_num:0}];
const ready={loaded:true,loading:false,pageError:'',error:'',userinfo:{num:2680,nickname:'演示用户'},setinfo:{integral_title:'金币'},num:2680,balance:2680,balanceText:'2,680',adset:{},v3Ready:false,v3Unit:'',prize:products,homeGoods:products,contentLoading:false,goodsError:''};
const signCards=[5,10,25,25,35,50,88].map((amount,index)=>({day:index+1,amount,done:index<2,active:index===2,state:index<2?'done':index===2?'today':'future'}));
const task={loaded:true,enabled:true,available:true,remaining:3,coins:2,state:'ready',label:'可以参与',status:'可参与',hint:'完整观看后按当前规则领取，提前关闭不发放本次奖励',button:'自愿观看',unit:'adunit-preview1234'};
const earn={...ready,thisurl:'sage_dksy/pages/v14/tasks/index',home:task,read:task,rewardViewMode:'tasks',watching:false,signLoading:false,signAvailable:true,signed:false,signReward:25,signStreak:2};
const signData={...ready,statusReady:true,configReady:true,todaySigned:false,justSigned:false,recordsVisible:false,lastReward:null,busy:false,streak:2,currentDay:3,todayReward:25,days:signCards,nextDayNumber:null,nextDayReward:null};
const productData={...ready,prize_show:{...products[0],prize_type:0,prize_pics:[products[0].prize_picurl]},stockReady:true,priceReady:true,accountReady:true,shortfall:0,balanceAfter:880,selectedAddress:{name:'演示收货人',viewPhone:'138****8000',viewAddress:'演示地址，仅用于浏览器布局检查'},confirmVisible:false,orderSuccess:false,submitting:false,orderUnknown:false};
const coreScreens=[
 {id:'home',title:'首页',route:'index/index',data:{...ready,thisurl:'sage_dksy/pages/index/index',signReceipt:null,homeTrial:trials[0],trialImageFailed:false,signReady:true,signError:'',today_qian:0,signNum:2,nextSignReward:25,signCards,todayTask:task,readingTask:task,signing:false,todayTaskBusy:false}},
 {id:'tasks',title:'赚金币',route:'v14/tasks/index',data:earn},
 {id:'gifts',title:'金币商城',route:'prize/index',data:{...ready,thisurl:'sage_dksy/pages/prize/index',featuredPrize:products[0],filteredPrize:products,filter:'all',hasMore:false,loadingMore:false}},
 {id:'trial',title:'商品试用',route:'trial/trial',data:{...ready,thisurl:'sage_dksy/pages/trial/trial',trial:trials,filteredTrial:trials,activeTab:0,hasMore:false}},
 {id:'mine',title:'我的',route:'user/index',data:{...ready,thisurl:'sage_dksy/pages/user/index',avatarFailed:false}},
 {id:'sign',title:'每日签到',route:'v14/sign/index',data:signData},
 {id:'product',title:'商品详情',route:'prize/prize_show',data:productData},
 {id:'invite',title:'邀请好友',route:'v11/promote',data:{...ready,view:'hub',avatar:'',nickname:'演示用户',metricsReady:true,total:3,qrReady:false,qrLocalPath:'',connecting:false,profileError:'',qrStage:'',guideOpen:false}},
 {id:'offer',title:'广告奖励',route:'v14/tasks/index',data:{...earn,rewardViewMode:'offer'}},
 {id:'paid',title:'奖励到账',route:'v14/tasks/index',data:{...earn,rewardViewMode:'paid',balance:2682,rewardCoins:2,rewardMessage:''}},
 {id:'unpaid',title:'观看未完成',route:'v14/tasks/index',data:{...earn,rewardViewMode:'unpaid',rewardCoins:null,rewardMessage:''}},
 {id:'cool',title:'广告奖励冷却中',route:'v14/tasks/index',data:{...earn,rewardViewMode:'cool',home:{...task,state:'cool',available:false,remaining:2,status:'冷却中 · 02:36',button:'02:36'}}},
 {id:'sign-success',title:'签到成功',route:'v14/sign/index',data:{...signData,justSigned:true,todaySigned:true,lastReward:25,balance:2705,streak:3,nextDayNumber:4,nextDayReward:25}},
 {id:'redeem-confirm',title:'兑换确认',route:'prize/prize_show',data:{...productData,confirmVisible:true}}
];
// Fixtures describe response shapes only. They never invoke a lifecycle or make requests.
const readArticles=fixtures.articles.map(a=>({...a,body:'这是一段仅供浏览器排版检查的演示正文。阅读内容与广告奖励分别呈现，用户可以自由阅读。\n\n给日常留一点时间，也给好内容一点耐心。文字在这里用于观察字号、行距与换行，不属于线上正式文章。'}));
const reading={...ready,categories:[{slug:'recommend',name:'推荐'},{slug:'life',name:'生活'},{slug:'culture',name:'文化'}],category:'recommend',items:readArticles,filteredItems:readArticles,searchText:'',hasMore:false,reward:{enabled:1,coins:2,remaining:3,ad_unit_id:'adunit-preview1234'},rewardView:{state:'ready',text:'自愿完整观看',sub:'每次 +2 金币',remaining:3,disabled:false},rewardResult:null};
const challengeDays=Array.from({length:7},(_,i)=>({index:i+1,date:'11.'+String(i+1).padStart(2,'0'),done:i<2,today:i===2}));
const growth={...ready,busy:false,message:'',growth:{known:true,joined:true,doneCount:2,progress:28,startDay:'11.01',endDay:'11.07',canStart:false,days:challengeDays.map(d=>({...d,state:d.done?'done':d.today?'today':'pending'})),milestones:[{day:3,amount:30,enabled:true,claimed:false,canClaim:false,label:'待达成'},{day:7,amount:100,enabled:true,claimed:false,canClaim:false,label:'待达成'}]},challenge:{joined:1,done_count:2,days:challengeDays,start_day:'11.01',end_day:'11.07',reward_enabled:true,day3_enabled:true,day7_enabled:true,three_points:30,seven_points:100,claimed3:false,claimed7:false,can_claim3:false,can_claim7:false,can_start:false},friend:{paired:false,peer_days:0},wish:{...products[0],_cost:1800},prizes:products.map(p=>({...p,_cost:p.prize_integral})),activities:trials,inviteCode:'',incomingInvite:'',wishPercent:100,wishRemaining:0,missingWishImage:false,signRewards:signCards};
const directFriends=[{member_mask:'用户 0***21',nickname:'演示好友一',registered:'2026-11-02 09:30',bound:'2026-11-02 09:30'},{member_mask:'用户 0***86',nickname:'演示好友二',registered:'2026-11-01 18:20',bound:'2026-11-01 18:20'}];
function rulesData(category){const f=loadPage('sage_dksy/pages/v14/rewards/index.js');if(typeof f.page.chooseCategory==='function')f.page.chooseCategory({currentTarget:{dataset:{category}}});return {...f.page.data};}
const benefitsScreens=[
 coreScreens.find(s=>s.id==='home'),coreScreens.find(s=>s.id==='tasks'),
 {id:'read-list',title:'阅读文章 · 广告激励',route:'v12/list',data:reading},
 {id:'growth',title:'7天成长礼遇',route:'growth/index',data:growth},
 {...coreScreens.find(s=>s.id==='invite'),title:'一级推广',data:{...coreScreens.find(s=>s.id==='invite').data,total:2,today:1,campaignReady:true,inviter:'暂无邀请人',rewardInfo:{approved:false,stages:[],cap:null,earned:null}}},
 {id:'read-detail',title:'文章详情 · 自愿激励',route:'v12/detail',data:{...reading,id:901,article:readArticles[0],favorite:0,favoriteBusy:false,fontSize:34}},
 {id:'friends',title:'我的一级好友',route:'v132grow/index',data:{...ready,direct:2,today:1,items:directFriends.map(p=>({...p,key:p.member_mask})),campaignReady:true,hasMore:false,message:'',rewardInfo:{approved:false,stages:[],cap:null,earned:null}}},
 coreScreens.find(s=>s.id==='mine'),
 {id:'rules',title:'帮助与规则',route:'v14/rewards/index',data:rulesData('all')},
 {id:'rules-read',title:'阅读激励说明',route:'v14/rewards/index',data:rulesData('read')},
 {id:'rules-growth',title:'7天成长说明',route:'v14/rewards/index',data:rulesData('growth')},
 {id:'rules-invite',title:'一级推广说明',route:'v14/rewards/index',data:rulesData('invite')}
];
const screens=PREVIEW_SET==='benefits'?benefitsScreens:coreScreens;
for(const screen of screens){const f=loadPage('sage_dksy/pages/'+screen.route+'.js');screen.data={...f.page.data,...screen.data};}
const browserBase=`*{box-sizing:border-box}html,body{margin:0;padding:0;width:390px;height:844px;background:#FFF6F5;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans CJK SC",sans-serif}body{overflow:hidden}.native-status{height:30px;padding:9px 21px 0;display:flex;justify-content:space-between;font:600 12px Arial;color:#FFFFFF;background:#D70C38}.native-title{height:49px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600;background:#D70C38;color:white;position:relative}.native-capsule{position:absolute;right:10px;top:8px;width:84px;height:29px;display:flex;align-items:center;justify-content:space-around;border:1px solid #FFFFFF55;border-radius:20px;font-size:17px}.mini-page{height:765px;overflow-y:auto;scrollbar-width:none}.mini-page::-webkit-scrollbar{display:none}.preview-footer{position:fixed;z-index:110;bottom:0;left:0;right:0;height:7px;background:#FFFEFA}.preview-swiper-item:not(:first-child){display:none}a{text-decoration:none;color:inherit}.club-nav{position:fixed;bottom:0;padding-bottom:13px;height:80px}.club-nav-spacer{height:89px}yx22-ad:empty{display:none}.product-footer{bottom:0}.yx-icon-host{line-height:0}.preview-watermark{position:fixed;z-index:9999;bottom:2px;right:4px;font-size:8px;line-height:1.2;color:#806574;background:#FFFEFAE6;padding:1px 3px;border-radius:3px;pointer-events:none}button{font-family:inherit;border:0;appearance:none}input{border:0;outline:none;background:transparent;font-family:inherit;font-size:inherit;padding:0;min-width:0;max-width:100%}scroll-view{display:block}[data-preview-scroll-x]{overflow-x:auto;white-space:nowrap;scrollbar-width:none}`;
for(const screen of screens){const key='sage_dksy/pages/'+screen.route+'.wxml';const config=JSON.parse(fs.readFileSync(path.join(ROOT,'sage_dksy/pages/'+screen.route+'.json'),'utf8'));const nativeTitle=config.navigationBarTitleText||screen.title;let html=children(ast[key].children,screen.data,key);let styles=css('app.wxss')+css('sage_dksy/pages/'+screen.route+'.wxss')+css('sage_dksy/components/yx-state/index.wxss');let document='<!DOCTYPE html><html lang="zh-CN"><meta charset="UTF-8"><title>'+screen.title+' · 浏览器布局预览</title><style>'+styles+browserBase+'</style><body><div class="native-status"><span>9:41</span><span>▮▮▮　▰</span></div><div class="native-title">'+nativeTitle+'<div class="native-capsule"><span>•••</span><span>│</span><span>◉</span></div></div><div class="mini-page">'+html+'</div><div class="preview-watermark">浏览器预览 · 演示数据</div></body></html>';fs.writeFileSync(path.join(OUT,screen.id+'.html'),document);screen.document=document;}
const frames=screens.map((s,i)=>'<div class="preview-card"><h2>'+String(i+1).padStart(2,'0')+' / '+s.title+'</h2><iframe title="'+s.title+'" data-screen="'+s.id+'" src="'+s.id+'.html"></iframe></div>').join('');
const overview='<!DOCTYPE html><html lang="zh-CN"><meta charset="UTF-8"><title>元享 · 实际代码布局预览</title><style>body{margin:0;background:#FBEFF1;color:#27212C;font-family:"Noto Sans CJK SC",sans-serif;padding:38px;width:2182px}h1{font-size:27px;margin:0 0 12px}p{font-size:14px;line-height:1.8;margin:0 0 30px}.preview-grid{display:grid;grid-template-columns:repeat(5,390px);gap:28px}.preview-card h2{font-size:16px;margin:0 0 14px;font-weight:500}.preview-card iframe{width:390px;height:844px;border:0;border-radius:22px;box-shadow:0 8px 30px #B21D4417;background:#FFF6F5}footer{margin-top:28px;font-size:12px;line-height:1.8}</style><body><h1>元享 · 红金新版实际代码预览</h1><p>'+fixtures.notice+'<br>红金新版 · 五个主入口；当前WXML/WXSS离线渲染。商品照片为独立演示素材，不写入线上业务。</p><div class="preview-grid">'+frames+'</div><footer>浏览器预览只检验布局与可读性，原生广告、微信胶囊与设备安全区需要微信开发者工具及真机验收。</footer></body></html>';
fs.writeFileSync(path.join(OUT,'index.html'),overview);fs.writeFileSync(path.join(OUT,'render-warnings.json'),JSON.stringify([...new Set(errors)],null,2));fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({notice:fixtures.notice,previewSet:PREVIEW_SET,overviewLimit:5,screens:screens.map(({id,title,route})=>({id,title,route})),warnings:[...new Set(errors)]},null,2));console.log('Generated '+screens.length+' actual-code previews. Expression warnings: '+[...new Set(errors)].length);
