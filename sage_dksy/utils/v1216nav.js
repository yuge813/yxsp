// V12.16 Navigation-only registry. No advertising or finance operations.
const PREFIX='/sage_dksy/pages/';
const FEATURES=[
 {id:'sign',name:'每日签到',icon:'签',group:'赚金币',path:'v14/sign/index',aliases:'签到 打卡 奖励'},
 {id:'video',name:'看广告赚金币',icon:'播',group:'赚金币',path:'v14/tasks/index',aliases:'广告 视频 任务'},
 {id:'coins',name:'我的金币',icon:'币',group:'赚金币',path:'user/integral?view=wallet',aliases:'金币 收支 余额 明细'},
 {id:'prize',name:'金币兑换',icon:'礼',group:'兑换好礼',path:'prize/index',aliases:'好礼 商品 商城 兑换'},
 {id:'orders',name:'兑换记录',icon:'单',group:'兑换好礼',path:'user/order',aliases:'订单 物流'},
 {id:'trial',name:'商品试用',icon:'试',group:'商品试用',path:'trial/trial',aliases:'免费 试用 申请'},
 {id:'trialorders',name:'试用记录',icon:'录',group:'商品试用',path:'user/trial_list',aliases:'报名 中选 申请记录'},
 {id:'promote',name:'邀请好友',icon:'邀',group:'推广好友',path:'v11/promote',aliases:'分享 邀请 推广 专属码'},
 {id:'poster',name:'专属邀请海报',icon:'码',group:'推广好友',path:'v11/promote?mode=poster',aliases:'海报 二维码'},
 {id:'friends',name:'我的好友',icon:'友',group:'推广好友',path:'v132grow/index',aliases:'邀请记录 好友'},
 {id:'profile',name:'个人资料',icon:'我',group:'账户服务',path:'user/user/index',aliases:'头像 昵称'},
 {id:'address',name:'收货地址',icon:'址',group:'账户服务',path:'address/list',aliases:'收货 地址 管理'},
 {id:'reminder',name:'签到提醒',icon:'铃',group:'账户服务',path:'v14/reminders/index',aliases:'提醒 订阅'},
 {id:'help',name:'帮助与规则',icon:'问',group:'账户服务',path:'v14/rewards/index',aliases:'帮助 规则 客服'},
 {id:'settings',name:'设置与隐私',icon:'设',group:'账户服务',path:'v17/settings',aliases:'权限 设置 隐私'}
];
const GROUPS=['赚金币','兑换好礼','商品试用','推广好友','账户服务'];
const DEFAULT=['sign','video','prize','trial','promote','orders'];
const ICONS={sign:'check',video:'play',coins:'coin',prize:'gift',orders:'order',trial:'bag',trialorders:'package',promote:'friend',poster:'share',friends:'friend',profile:'user',address:'location',reminder:'bell',help:'help',settings:'settings'};
FEATURES.forEach(function(f){f.iconSrc='/sage_dksy/resource/ui/'+(ICONS[f.id]||'grid')+'-brand.png';});
function find(id){return FEATURES.find(f=>f.id===id)||null;}
function enabled(){return FEATURES.filter(f=>!f.optional);}
function account(){try{return String(wx.getStorageSync('openid')||'');}catch(e){return '';}}
function key(s){const a=account();return a?'yx_v1216_'+s+'_'+a:null;}
function read(s,def){const k=key(s);if(!k)return def;try{return wx.getStorageSync(k)||def;}catch(e){return def;}}
function save(s,val){const k=key(s);if(k)try{wx.setStorageSync(k,val);}catch(e){}}
function common(){return DEFAULT.map(find).filter(Boolean);}
function setCommon(ids){return false;} // 固定运营布局；不再开放用户自定义
function recent(){return read('recent',[]).filter(id=>find(id)).slice(0,6).map(find);}
function visit(id){if(!find(id))return;const prev=read('recent',[]);save('recent',[id].concat(prev.filter(x=>x!==id)).slice(0,6));}
function go(id){const f=find(id);if(!f)return wx.showToast({title:'功能暂未开放',icon:'none'});visit(id);
 const url=PREFIX+f.path; if(['index/index','v14/tasks/index','prize/index','trial/trial','user/index'].indexOf(f.path)>=0){wx.redirectTo({url});}else{wx.navigateTo({url});}}
function search(s){const q=String(s||'').trim().toLowerCase();if(!q)return enabled();return enabled().filter(f=>(f.name+' '+f.aliases).toLowerCase().indexOf(q)>=0);}
module.exports={features:enabled,groups:GROUPS,defaultIds:DEFAULT,common,setCommon,recent,visit,go,find,search};
