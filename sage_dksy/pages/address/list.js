/* YX_V12229_ADDRESS_SELECT */
var book=require('../../utils/v12229_address.js');
var nativeAddress=require('../../utils/v12235_choose_address.js'); /* YX_V12235_WECHAT_CHOOSE_ADDRESS */
Page({
  data:{items:[],hasAddresses:false,selectedId:'',accountReady:false,selectMode:false,pendingSelectionId:''},
  onLoad:function(q){var mode=!!(q&&q.mode==='select');this.setData({selectMode:mode});wx.setNavigationBarTitle({title:mode?'选择地址':'收货地址'});},
  onShow:function(){if(this._resetPendingAfterEdit){this._resetPendingAfterEdit=false;this.setData({pendingSelectionId:''});}this.refresh();},
  refresh:function(){
    var user=book.accountId();
    if(!user){this.setData({accountReady:false});return;}
    var state=book.load(user);
    var items=state.items.map(function(x){return Object.assign({},x,{viewAddress:book.formatView(x),viewPhone:book.phoneMask(x.phone)});});
    var pending=this.data.pendingSelectionId;if(!items.some(function(x){return x.id===pending;}))pending=state.selectedId||(book.getSelected(user)||{}).id||'';this.setData({items:items,hasAddresses:items.length>0,selectedId:state.selectedId,pendingSelectionId:pending,accountReady:true});
  },
  goAccount:function(){wx.redirectTo({url:'/sage_dksy/pages/user/index'});},
  onSelect:function(e){if(!this.data.selectMode)return;var id=String(e.currentTarget.dataset.id||'');if(this.data.items.some(function(x){return String(x.id)===id;}))this.setData({pendingSelectionId:id});},
  onUse:function(){if(!this.data.selectMode||!this.data.pendingSelectionId)return;var result=book.select(this.data.pendingSelectionId);if(!result.ok){wx.showToast({title:result.reason,icon:'none'});return;}var stack=getCurrentPages();if(stack.length>1)wx.navigateBack({delta:1});else wx.redirectTo({url:'/sage_dksy/pages/prize/index'});},
  onSetDefault:function(e){var item=book.byId(String(e.currentTarget.dataset.id||''));if(!item)return;var result=book.upsert(Object.assign({},item,{isDefault:true}));if(!result.ok){wx.showToast({title:result.reason||'暂未设置成功',icon:'none'});return;}this.refresh();},
  yx29RefreshAddress:function(){this.setData({pendingSelectionId:''});this.refresh();},
  onWechatAddress:function(){nativeAddress.chooseForOrder(this,book,false);},
  onAdd:function(){this._resetPendingAfterEdit=true;wx.navigateTo({url:'/sage_dksy/pages/address/edit'});},
  onEdit:function(e){this._resetPendingAfterEdit=true;wx.navigateTo({url:'/sage_dksy/pages/address/edit?id='+encodeURIComponent(e.currentTarget.dataset.id)});},
  onDelete:function(e){
    var self=this,id=e.currentTarget.dataset.id;
    wx.showModal({title:'删除收货地址',content:'删除后无法恢复，确定删除吗？',success:function(r){
      if(!r.confirm)return;
      var result=book.remove(id);
      if(!result.ok)wx.showToast({title:result.reason,icon:'none'});
      self.refresh();
    }});
  }
});
