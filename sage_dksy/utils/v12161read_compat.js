/* 元享 V12.16.1 阅读列表兼容层。仅适配列表搜索，不修改广告、奖励、分享或任务状态。 */
'use strict';
function filtered(items, keyword) {
  var q=String(keyword||'').trim().toLowerCase();
  if(!q) return Array.isArray(items)?items:[];
  return (Array.isArray(items)?items:[]).filter(function(item){
    return (String(item.title||'')+' '+String(item.summary||'')).toLowerCase().indexOf(q)!==-1;
  });
}
function enhance(page) {
  if (!page || typeof page!=='object'||!page.data) return page;
  // 不覆盖本来已经有的搜索实现。
  var ready=typeof page.onSearch==='function' && typeof page.filterItems==='function' &&
    Object.prototype.hasOwnProperty.call(page.data,'filteredItems');
  if(ready) return page;
  if(!Object.prototype.hasOwnProperty.call(page.data,'searchText')) page.data.searchText='';
  if(!Object.prototype.hasOwnProperty.call(page.data,'filteredItems')) page.data.filteredItems=filtered(page.data.items, page.data.searchText);
  if(!page.filterItems) page.filterItems=function(items){return filtered(items,this.data.searchText);};
  var oldLoad=page.onLoad;
  page.onLoad=function(){
    if(!this.__yx_v12161_list_search && typeof this.setData==='function') {
      this.__yx_v12161_list_search=true;
      var original=this.setData;
      this.setData=function(patch){
        if(patch && typeof patch==='object'){
          var hasItems=Object.prototype.hasOwnProperty.call(patch,'items');
          var hasSearch=Object.prototype.hasOwnProperty.call(patch,'searchText');
          var hasFiltered=Object.prototype.hasOwnProperty.call(patch,'filteredItems');
          if((hasItems || hasSearch) && !hasFiltered){
            var items=hasItems?patch.items:this.data.items;
            var term=hasSearch?patch.searchText:this.data.searchText;
            patch=Object.assign({},patch,{filteredItems:filtered(items,term)});
          }
        }
        var args=Array.prototype.slice.call(arguments);args[0]=patch;
        return original.apply(this,args);
      };
    }
    return typeof oldLoad==='function'?oldLoad.apply(this,arguments):undefined;
  };
  if(!page.onSearch) page.onSearch=function(e){
    var term=e&&e.detail?String(e.detail.value||''):'';
    this.setData({searchText:term,filteredItems:filtered(this.data.items,term)});
  };
  return page;
}
module.exports={enhance:enhance};
