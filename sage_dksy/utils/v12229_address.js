/* YX_V12229_ADDRESS_BOOK: Device-local addresses scoped to the logged-in WeEngine/WeChat account.
 * Does not request chooseAddress or extra private APIs; only sends selected address to existing order endpoint.
 */
var KEY = 'yx_v12229_delivery_addresses_';
function accountId(explicit) {
  var id = explicit || '';
  if (!id) { try { id = wx.getStorageSync('openid'); } catch (e) {} }
  return typeof id === 'string' && id.length >= 8 && id.length <= 256 ? id : '';
}
function empty() { return {items: [], selectedId: ''}; }
function load(explicit) {
  var id = accountId(explicit);
  if (!id) return empty();
  try {
    var raw = wx.getStorageSync(KEY + id);
    if (!raw || !Array.isArray(raw.items)) return empty();
    return {items: raw.items.filter(function(x){ return x && x.id && x.name && x.phone && Array.isArray(x.region) && x.detail; }).slice(0, 20), selectedId: String(raw.selectedId || '')};
  } catch (e) { return empty(); }
}
function persist(state, explicit) {
  var id = accountId(explicit);
  if (!id) return {ok:false, reason:'请先完成账号登录'};
  try { wx.setStorageSync(KEY + id, state); return {ok:true}; }
  catch (e) { return {ok:false, reason:'保存失败，请检查手机存储空间'}; }
}
function getSelected(explicit) {
  var state = load(explicit), items = state.items;
  for (var i=0;i<items.length;i++) if(items[i].id===state.selectedId) return items[i];
  for (var j=0;j<items.length;j++) if(items[j].isDefault) return items[j];
  return null;
}
function byId(id, explicit) {
  var items=load(explicit).items;
  for(var i=0;i<items.length;i++) if(items[i].id===id) return items[i];
  return null;
}
function upsert(item, explicit) {
  var state=load(explicit), found=false, idx=-1;
  if(item.id) for(var i=0;i<state.items.length;i++) if(state.items[i].id===item.id){idx=i;found=true;break;}
  if(!found && state.items.length>=20) return {ok:false, reason:'最多保存20个地址'};
  var record={id:found?item.id:('yx'+Date.now()+'_'+Math.floor(Math.random()*100000)),name:item.name,phone:item.phone,region:item.region.slice(0,3),detail:item.detail,isDefault:!!item.isDefault};
  if(record.isDefault) state.items.forEach(function(x){x.isDefault=false;});
  if(found) state.items[idx]=record; else state.items.unshift(record);
  if(state.items.length===1) record.isDefault=true;
  state.selectedId=record.id;
  var result=persist(state,explicit);
  if(result.ok) result.record=record;
  return result;
}
function select(id, explicit) {
  var state=load(explicit);
  if(!state.items.some(function(x){return x.id===id;}))return {ok:false,reason:'地址已不存在，请重新选择'};
  state.selectedId=id;
  return persist(state,explicit);
}
function remove(id,explicit) {
  var state=load(explicit), old=state.items.length;
  state.items=state.items.filter(function(x){return x.id!==id;});
  if(state.items.length===old)return {ok:false,reason:'地址不存在'};
  if(state.selectedId===id)state.selectedId=(state.items[0]&&state.items[0].id)||'';
  if(state.items.length && !state.items.some(function(x){return x.isDefault;}))state.items[0].isDefault=true;
  return persist(state,explicit);
}
function formatOrder(record) {
  if(!record) return '';
  var safe=function(x){return String(x||'').replace(/[,，\r\n]/g,' ').trim();};
  return [safe(record.name),safe(record.phone),safe((record.region||[]).join(' '))+' '+safe(record.detail)].join(',');
}
function formatView(record) {return record ? (record.region||[]).join(' ')+' '+(record.detail||'') : '';}
function phoneMask(phone){return String(phone||'').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');}
module.exports={accountId:accountId,load:load,getSelected:getSelected,byId:byId,upsert:upsert,select:select,remove:remove,formatOrder:formatOrder,formatView:formatView,phoneMask:phoneMask};
