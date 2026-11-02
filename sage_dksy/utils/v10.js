var app=getApp();
function api(name,data,done,fail){app.secureRequest({url:app.util.url('entry/wxapp/'+name)+'m=sage_dksy',method:'POST',data:data||{},timeout:15000,success:function(r){var b=r&&r.data||{};if(typeof done==='function')done(b);},fail:function(){if(fail)fail();else wx.showToast({title:'网络连接失败',icon:'none'});}});}
function track(type,kind,id,source){if(!id)return;api('v10track',{event:type,kind:kind,id:id,source:source||''},function(){});}
function share(kind,id,title,image,channel){var prefix=kind==='prize'?'/sage_dksy/pages/prize/prize_show':kind==='trial'?'/sage_dksy/pages/trial/trial_show':'/sage_dksy/pages/v10/public';var q='id='+encodeURIComponent(id)+'&source='+(channel==='timeline'?'timeline':'friend');return {title:title||'元享好礼',imageUrl:image||'',path:prefix+'?'+q,query:q};}
function poster(kind,id){wx.navigateTo({url:'/sage_dksy/pages/v10/poster?kind='+kind+'&id='+Number(id)});}

// WeChat share imageUrl needs an accessible absolute image URL or local temp file.
function shareCover(url){
  var u=String(url||'').trim();
  if(!u)return '';
  if(/^https:\/\//i.test(u)||/^wxfile:\/\//i.test(u)||/^\/sage_dksy\//.test(u))return u;
  if(/^http:\/\//i.test(u))return '';
  var site='';
  try{site=(app.siteInfo&&app.siteInfo.siteroot||'').match(/^https:\/\/[^/]+/i)[0];}catch(_){return '';}
  var pathname=u.replace(/^\/+/, '');
  if(/^images\//i.test(pathname))pathname='attachment/'+pathname;
  if(/^attachment\/images\//i.test(pathname))return site+'/'+pathname;
  return '';
}
module.exports={api:api,track:track,share:share,poster:poster,shareCover:shareCover};
