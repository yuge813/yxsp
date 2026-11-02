/* YX_V12229_ADDRESS_EDIT: Manual region picker; no chooseAddress permission required. */
var book=require('../../utils/v12229_address.js');
Page({
  data:{id:'',name:'',phone:'',region:[],regionDisplay:'',detail:'',isDefault:false,saving:false,title:'新增收货地址'},
  onLoad:function(query){
    var id=(query&&query.id)||'';
    if(!id)return;
    var item=book.byId(id);
    if(!item){wx.showToast({title:'地址不存在',icon:'none'});return;}
    this.setData({id:id,name:item.name,phone:item.phone,region:item.region,regionDisplay:item.region.join(' '),detail:item.detail,isDefault:!!item.isDefault,title:'编辑收货地址'});
    wx.setNavigationBarTitle({title:'编辑收货地址'});
  },
  onName:function(e){this.setData({name:e.detail.value||''});},
  onPhone:function(e){this.setData({phone:e.detail.value||''});},
  onDetail:function(e){this.setData({detail:e.detail.value||''});},
  onRegion:function(e){var region=(e.detail&&e.detail.value)||[];this.setData({region:region,regionDisplay:region.join(' ')});},
  onDefault:function(e){this.setData({isDefault:!!e.detail.value});},
  onSave:function(){
    if(this.data.saving)return;
    var name=String(this.data.name||'').trim().replace(/[,，\r\n]/g,' '),phone=String(this.data.phone||'').replace(/\s+/g,''),region=this.data.region||[],detail=String(this.data.detail||'').trim().replace(/[,，\r\n]/g,' ');
    if(name.length<2){wx.showToast({title:'请填写收货人姓名',icon:'none'});return;}
    if(!/^1[3-9]\d{9}$/.test(phone)){wx.showToast({title:'请输入正确的11位手机号',icon:'none'});return;}
    if(region.length<3||region.some(function(x){return !x;})){wx.showToast({title:'请选择省、市、区',icon:'none'});return;}
    if(detail.length<5){wx.showToast({title:'请填写街道及门牌号',icon:'none'});return;}
    this.setData({saving:true});
    var saved=book.upsert({id:this.data.id,name:name,phone:phone,region:region,detail:detail,isDefault:this.data.isDefault});
    this.setData({saving:false});
    if(!saved.ok){wx.showToast({title:saved.reason||'保存失败',icon:'none'});return;}
    wx.showToast({title:'地址已保存',icon:'success',duration:900});
    // Arrived here from detail -> address list -> editor: return directly to detail with the new selection.
    var stack=getCurrentPages();
    var previous=stack[stack.length-2],before=stack[stack.length-3];
    var fromOrder=previous&&previous.route==='sage_dksy/pages/address/list'&&before&&(/sage_dksy\/pages\/(prize|index)\/prize_show/.test(before.route));
    wx.navigateBack({delta:fromOrder?2:1});
  }
});
