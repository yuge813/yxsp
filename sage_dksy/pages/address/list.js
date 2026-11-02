/* YX_V12229_ADDRESS_SELECT */
var book=require('../../utils/v12229_address.js');
var nativeAddress=require('../../utils/v12235_choose_address.js'); /* YX_V12235_WECHAT_CHOOSE_ADDRESS */
Page({
  data:{items:[],hasAddresses:false,selectedId:'',accountReady:false},
  onShow:function(){this.refresh();},
  refresh:function(){
    var user=book.accountId();
    if(!user){this.setData({accountReady:false});return;}
    var state=book.load(user);
    var items=state.items.map(function(x){return Object.assign({},x,{viewAddress:book.formatView(x),viewPhone:book.phoneMask(x.phone)});});
    this.setData({items:items,hasAddresses:items.length>0,selectedId:state.selectedId,accountReady:true});
  },
  goAccount:function(){wx.redirectTo({url:'/sage_dksy/pages/user/index'});},
  onSelect:function(e){
    var id=e.currentTarget.dataset.id, result=book.select(id);
    if(!result.ok){wx.showToast({title:result.reason,icon:'none'});return;}
    wx.navigateBack({delta:1});
  },
  onWechatAddress:function(){nativeAddress.chooseForOrder(this,book,true);},
  onAdd:function(){wx.navigateTo({url:'/sage_dksy/pages/address/edit'});},
  onEdit:function(e){wx.navigateTo({url:'/sage_dksy/pages/address/edit?id='+encodeURIComponent(e.currentTarget.dataset.id)});},
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
