// V12.16 Navigation-only registry. No advertising or finance operations.
const PREFIX='/sage_dksy/pages/';
const FEATURES=[
 {id:'sign',name:'每日签到',icon:'签',group:'金币成长',path:'v14/sign/index',aliases:'签到 打卡'},
 {id:'growth',name:'成长计划',icon:'长',group:'金币成长',path:'growth/index',aliases:'7天 成长'},
 {id:'coins',name:'金币明细',icon:'币',group:'金币成长',path:'user/integral',aliases:'金币 收支 余额'},
 {id:'prize',name:'金币兑换',icon:'礼',group:'好礼福利',path:'prize/index',aliases:'好礼 商品 兑换'},
 {id:'trial',name:'商品试用',icon:'试',group:'好礼福利',path:'trial/trial',aliases:'免费试用'},
 {id:'featured',name:'本周精选',icon:'荐',group:'好礼福利',path:'v10/featured',aliases:'商品专题 精选'},
 {id:'orders',name:'兑换记录',icon:'单',group:'好礼福利',path:'user/order',aliases:'订单 物流'},
 {id:'trialorders',name:'试用记录',icon:'录',group:'好礼福利',path:'user/trial_list',aliases:'申请记录'},
 // 晒单仅从具体订单进入，不能直接进入需要 order_id 的编辑页。
 {id:'read',name:'阅读文章',icon:'阅',group:'内容生活',path:'v12/list',aliases:'阅读 历史 文化 文章'},
 // 公开作品详情要求 id，因此不创建无参数的功能入口。
 {id:'promote',name:'邀请好友',icon:'邀',group:'推广服务',path:'v11/promote',aliases:'邀请 直推 推广码 海报 记录'},
 {id:'poster',name:'邀请海报',icon:'码',group:'推广服务',path:'v11/promote',aliases:'分享 邀请二维码'},
 {id:'favorites',name:'我的收藏',icon:'藏',group:'内容生活',path:'v17/favorites',aliases:'已收藏 文章 书签'},
 {id:'settings',name:'隐私与设置',icon:'设',group:'账户服务',path:'v17/settings',aliases:'权限 隐私 授权'},
 {id:'profile',name:'个人资料',icon:'我',group:'账户服务',path:'user/user/index',aliases:'昵称 头像'},
 {id:'address',name:'地址管理',icon:'址',group:'账户服务',path:'address/list',aliases:'收货地址', optional:false},
];
const GROUPS=['金币成长','好礼福利','内容生活','推广服务','账户服务'];
const DEFAULT=['read','prize','trial','growth','promote','orders'];
const ICONS={sign:'check',growth:'leaf',coins:'coin',prize:'gift',trial:'gift',featured:'gift',orders:'order',trialorders:'order',read:'book',promote:'friend',poster:'share',profile:'user',favorites:'heart',settings:'settings',address:'location'};
FEATURES.forEach(function(f){f.iconSrc='/sage_dksy/resource/ui/'+(ICONS[f.id]||'grid')+'-ink.png';});
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
 const url=PREFIX+f.path; if(['index/index','v14/tasks/index','prize/index','user/index'].indexOf(f.path)>=0){wx.redirectTo({url});}else{wx.navigateTo({url});}}
function search(s){const q=String(s||'').trim().toLowerCase();if(!q)return enabled();return enabled().filter(f=>(f.name+' '+f.aliases).toLowerCase().indexOf(q)>=0);}
module.exports={features:enabled,groups:GROUPS,defaultIds:DEFAULT,common,setCommon,recent,visit,go,find,search};
