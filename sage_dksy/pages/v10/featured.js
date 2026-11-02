'use strict';
const service=require('../../utils/v10.js');
Page({
 data:{loading:true,error:'',closed:false,title:'本周精选',items:[],shareOn:false,posterOn:false},
 onLoad(opt){this._alive=true;this._request=0;this.source=opt&&opt.source||'';this.refresh();},onUnload(){this._alive=false;this._request++;},
 refresh(){const seq=++this._request;this.setData({loading:true,error:''});service.api('v10config',{},c=>{if(!this._alive)return;this.setData({shareOn:!!c.share_on,posterOn:!!c.posters_on});if(c.share_on)wx.showShareMenu({menus:['shareAppMessage','shareTimeline']});else wx.hideShareMenu();},()=>{});service.api('v10featured',{},r=>{if(!this._alive||seq!==this._request)return;if(!r||!Array.isArray(r.items)){this.setData({loading:false,error:'精选内容暂时没有加载出来'});return;}this.setData({loading:false,closed:!!r.closed,title:r.title||'本周精选',items:r.items});},()=>{if(this._alive&&seq===this._request)this.setData({loading:false,error:'精选内容暂时没有加载出来'});});},
 onPullDownRefresh(){this.refresh();wx.stopPullDownRefresh();},
 imageError(e){const index=Number(e.currentTarget.dataset.index);if(index>=0&&index<this.data.items.length)this.setData({['items['+index+']._imageFailed']:true});},
 open(e){const x=e.currentTarget.dataset,id=Number(x.id);if(!id)return;if(!x.active)wx.showToast({title:'活动状态请以详情页为准',icon:'none'});wx.navigateTo({url:(x.kind==='prize'?'/sage_dksy/pages/prize/prize_show':'/sage_dksy/pages/trial/trial_show')+'?id='+id+'&source=featured'});},
 cardShare(e){const x=e.currentTarget.dataset;if(Number(x.id)>0)service.poster(x.kind,Number(x.id));},
 onShareAppMessage(e){const d=e&&e.target&&e.target.dataset||{},item=this.data.items.find(x=>x.kind===d.kind&&Number(x.id)===Number(d.id));if(item&&this.data.shareOn){service.track('share_entry',item.kind,item.id,'friend');return {title:item.share_title||item.title,path:(item.kind==='prize'?'/sage_dksy/pages/prize/prize_show':'/sage_dksy/pages/trial/trial_show')+'?id='+item.id+'&source=friend',imageUrl:service.shareCover(item.share_cover||item.image)};}service.track('share_entry','featured',1,'friend');return {title:this.data.title,path:'/sage_dksy/pages/v10/featured?source=friend'};},
 onShareTimeline(){service.track('share_entry','featured',1,'timeline');return {title:this.data.title,query:'source=timeline'};}
});
