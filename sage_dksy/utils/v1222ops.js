/* YX_POPUP_AUTH_FIX: notices/display config only; reward and ledger code unchanged. */
const app = getApp();
let cached = null, cacheAt = 0, cachedContext = '', loading = null;
function contextKey() {
  try { return String(wx.getStorageSync('openid')||'')+'|'+String(wx.getStorageSync('sage_safe_token')||''); }
  catch (_) { return ''; }
}
function unavailable(reason, code) {
  return {error:Number(code)||1,popup:[],slots:{},allowed_hosts:[],reason:reason};
}
function responseData(res) {
  const status=Number(res && res.statusCode)||0;
  if (status<200 || status>=300) return unavailable('http_error',status);
  let data=res && res.data;
  if (typeof data==='string') {try {data=JSON.parse(data);} catch (_) {return unavailable('invalid_json');}}
  if (!data || typeof data!=='object' || Array.isArray(data) || Number(data.error)!==0) {
    return unavailable('api_error',data && data.error);
  }
  const hasPopup=Array.isArray(data.popup);
  const hasSlots=data.slots && typeof data.slots==='object' && !Array.isArray(data.slots);
  if (!hasPopup && !hasSlots) return unavailable('invalid_config');
  return Object.assign({},data,{
    popup:hasPopup?data.popup:[],slots:hasSlots?data.slots:{},
    allowed_hosts:Array.isArray(data.allowed_hosts)?data.allowed_hosts:[]
  });
}
function fetch(force) {
  const key=contextKey();
  if (!force && cached && cachedContext===key && Date.now()-cacheAt<180000) return Promise.resolve(cached);
  if (loading && loading.context===key) return loading.promise;
  const request={context:key,promise:null};
  const pending=new Promise(resolve=>{
    try {
      app.secureRequest({
        url:app.util.url('entry/wxapp/v1222content')+'m=sage_dksy',
        method:'POST',data:{},timeout:8000,
        success(res){resolve(responseData(res));},
        fail(){resolve(unavailable('network_error'));}
      });
    } catch (_) {resolve(unavailable('request_error'));}
  });
  loading=request;
  request.promise=pending.then(data=>{
    const sameContext=contextKey()===key;
    if (loading===request) {
      loading=null;
      if (sameContext && Number(data.error)===0) {
        cached=data;cacheAt=Date.now();cachedContext=key;
      }
    }
    return sameContext?data:unavailable('auth_changed');
  },()=>{
    if (loading===request) loading=null;
    return unavailable('request_error');
  });
  return request.promise;
}
function scopeNotices(data, scope){
  return (data.popup||[]).filter(n => n && (n.scope===scope || n.scope==='all'));
}
function localDay(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function accountKey(id) {
  let uid='guest';
  try {const u=wx.getStorageSync('openid');if(u && typeof u==='string') uid=u.slice(0,80);} catch(_){}
  return 'yx22_notice_'+uid+'_'+String(id||'').slice(0,50);
}
function eligible(n) {
  if(!n || !n.id || !n.title) return false;
  const key=accountKey(n.id), now=Date.now(), day=localDay();
  try {
    const s=wx.getStorageSync(key)||{};
    const count=s.day===day ? Number(s.count)||0:0;
    if(count>=Math.min(3,Math.max(1,Number(n.daily_limit)||1)))return false;
    if(now-(Number(s.last)||0)<(Math.max(1,Number(n.cooldown_hours)||24)*3600000))return false;
    // One popup globally in a short session, even across several tabs.
    const last=Number(wx.getStorageSync('yx22_popup_session')||0);
    if(now-last<180000)return false;
    return true;
  } catch(_){return false;}
}
function record(n){
  const key=accountKey(n.id),day=localDay(),now=Date.now();
  try{
    const s=wx.getStorageSync(key)||{};
    wx.setStorageSync(key,{day, count: s.day===day?(Number(s.count)||0)+1:1,last:now});
    wx.setStorageSync('yx22_popup_session',now);
  }catch(_){}
}
function safeLink(n, hosts){
 if(!n||!n.target)return '';
 if(n.link_type==='internal') {
   const allowed=[
     '/sage_dksy/pages/index/index','/sage_dksy/pages/v12/list','/sage_dksy/pages/prize/index',
     '/sage_dksy/pages/trial/trial','/sage_dksy/pages/growth/index',
     '/sage_dksy/pages/user/integral','/sage_dksy/pages/user/order',
     '/sage_dksy/pages/v11/promote','/sage_dksy/pages/v11/works',
     '/sage_dksy/pages/v10/public','/sage_dksy/pages/v11/public'
   ];
   return allowed.indexOf(n.target)>=0 ? n.target:'';
 }
 if(n.link_type==='external'){
   const url=n.target;
   if(!/^https:\/\/[a-z0-9.-]+(?:\/|\?|#|$)/i.test(url))return '';
   const host=/^https:\/\/([^/:?#]+)/i.exec(url);
   if(!host||!Array.isArray(hosts)||hosts.indexOf(host[1].toLowerCase())<0)return '';
   return '/sage_dksy/pages/v1222/web?u='+encodeURIComponent(url);
 }
 return '';
}
module.exports={fetch,scopeNotices,eligible,record,safeLink};
