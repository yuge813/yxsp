/* 元享 V12.23.5 · 微信原生收货地址（审核通过后启用）
 * 仅在用户主动点击时调用 wx.chooseAddress，成功后写入原有本地地址簿。
 * 不触及金币、广告、后端订单或账本结算。
 */
var NATIVE_TAG = 'YX_V12235_WECHAT_CHOOSE_ADDRESS';
function trim(x) { return String(x == null ? '' : x).trim(); }
function normalize(res) {
  res = res || {};
  var region = [trim(res.provinceName), trim(res.cityName), trim(res.countyName)];
  var detail = trim(res.detailInfoNew || res.detailInfo);
  // 部分微信版本把省市区放进 detailInfoNew；去掉完整前缀以免地址重复。
  var prefix = region.join('');
  var collapsed = detail.replace(/\s+/g, '');
  if(prefix && collapsed.indexOf(prefix) === 0) detail = collapsed.slice(prefix.length).trim();
  if(!detail && res.streetName) detail = trim(res.streetName);
  var street = trim(res.streetName);
  if(street && detail.indexOf(street) === -1) detail = street + detail;
  return {name: trim(res.userName),phone:trim(res.telNumber).replace(/\s+/g,''),region:region,detail:detail};
}
function validOrder(v) {
  return v && v.name.length >= 2 && /^1[3-9]\d{9}$/.test(v.phone) &&
    v.region.length === 3 && v.region.every(function(s){return !!s;}) && v.detail.length >= 5;
}
function manualFallback(message, backToList) {
  wx.showModal({
    title:'微信地址暂不可用',
    content:message || '可以继续手动填写收货地址。',
    confirmText:'手动填写',cancelText:'取消',
    success:function(r){ if(r.confirm) backToList(); }
  });
}
function chooseForOrder(page, book, returnToOrder) {
  var uid=book.accountId(page && page.data && page.data.openid);
  if(!uid){wx.showToast({title:'请先完成账号登录',icon:'none'});return;}
  try {wx.setStorageSync('openid', uid);}catch(e){}
  var openManual=function(){ wx.navigateTo({url:'/sage_dksy/pages/address/list'}); };
  if(typeof wx.chooseAddress !== 'function'){
    manualFallback('当前微信版本不支持收货地址选择，请手动填写。',openManual);return;
  }
  // 必须在用户 bindtap/catchtap 同步调用，不能先异步请求登录或授权。
  try {
    wx.chooseAddress({
      success:function(res){
        var v=normalize(res);
        if(!validOrder(v)){
          manualFallback('微信收货地址缺少有效手机号、省市区或详细地址，请手动补全。',openManual);return;
        }
        v.isDefault=!book.getSelected(uid);
        var saved=book.upsert(v,uid);
        if(!saved.ok){wx.showToast({title:saved.reason||'地址保存失败',icon:'none'});return;}
        if(returnToOrder){ wx.navigateBack({delta:1}); }
        else if(page && typeof page.yx29RefreshAddress==='function') page.yx29RefreshAddress();
        else if(page && typeof page.refresh==='function') page.refresh();
      },
      fail:function(err){
        var msg=trim(err && err.errMsg).toLowerCase();
        if(/cancel/.test(msg))return; // 用户取消：不报错、不更改地址
        var explain=/(scope|privacy|permission|auth|deny)/.test(msg)
          ? '微信地址权限未就绪，请确认平台审核及隐私保护指引，或手动填写。'
          : '暂无法打开微信收货地址，可手动填写。';
        manualFallback(explain,openManual);
      }
    });
  }catch(ex){manualFallback('当前设备无法打开微信收货地址，请手动填写。',openManual);}
}
function chooseForTrial(page) {
  if(typeof wx.chooseAddress!=='function'){
    wx.showToast({title:'请手动填写收货地址',icon:'none'});return;
  }
  try{
    wx.chooseAddress({
      success:function(res){
        var v=normalize(res);
        var a=(v.region.join(' ')+' '+v.detail).trim();
        if(!v.name || !v.phone || !v.detail || v.region.some(function(s){return !s;})){
          wx.showToast({title:'地址不完整，请手动补全',icon:'none'});return;
        }
        page.setData({yx35Name:v.name,yx35Tel:v.phone,yx35Address:a});
        wx.showToast({title:'已填入微信地址',icon:'success'});
      },
      fail:function(err){
        if(/cancel/i.test(trim(err&&err.errMsg)))return;
        wx.showToast({title:'请选择手动填写',icon:'none'});
      }
    });
  }catch(ex){wx.showToast({title:'请选择手动填写',icon:'none'});}
}
module.exports={chooseForOrder:chooseForOrder,chooseForTrial:chooseForTrial,normalize:normalize};
