'use strict';
const reader = require('../../utils/v12read.js');
const invite = require('../../utils/v11.js');
const rewardUI=require('./red-reader-reward.js');
function search(items, term) {
  const q=String(term||'').trim().toLowerCase();
  return (Array.isArray(items)?items:[]).filter(item=>!q||(String(item.title||'')+' '+String(item.summary||'')).toLowerCase().includes(q));
}
function normalize(item) {return Object.assign({},item,{hasImage:!!item.cover_url});}
Page({
 data:{categories:[{slug:'recommend',name:'推荐'}],category:'recommend',items:[],filteredItems:[],searchText:'',page:1,loading:false,error:'',hasMore:true,shareCode:'',rewardResult:null,reward:{},rewardView:{state:'loading',text:'正在同步奖励状态',sub:'',remaining:0,disabled:true}},
 onLoad(q){this._alive=true;this._request=0;this.rewardControl=reader.makeReward(this);if(q&&q.from)invite.registerVisit(q.from,'home',0,q.source||'friend',()=>{});invite.api('v11whoami',{},r=>{if(this._alive)this.setData({shareCode:r.code||''});},()=>{});},
 onShow(){if(this.rewardControl)this.rewardControl.start();if(!this.data.items.length&&!this.data.loading)this.load(true);},
 onHide(){if(this.rewardControl)this.rewardControl.stop();if(this._yxRewardAd)this._yxRewardAd.leave();},
 onUnload(){this._alive=false;this._request++;if(this.rewardControl)this.rewardControl.stop();if(this._yxRewardAd){this._yxRewardAd.destroy();this._yxRewardAd=null;}},
 load(reset){reset=reset===true;if(!reset&&(this.data.loading||!this.data.hasMore))return Promise.resolve();const seq=++this._request,page=reset?1:this.data.page,category=this.data.category;
  this.setData({loading:true,error:''});
  return reader.call('v12feed',{category,page}).then(body=>{
   if(!this._alive||seq!==this._request)return;
   if(!body||!Array.isArray(body.items))throw new Error('invalid feed');
   const incoming=body.items.map(normalize),seen={};const items=(reset?incoming:this.data.items.concat(incoming)).filter(item=>{const id=String(item.id);if(seen[id])return false;seen[id]=true;return true;});
   const categories=[{slug:'recommend',name:'推荐'}];(Array.isArray(body.categories)?body.categories:[]).forEach(item=>{if(item&&item.slug&&item.name&&!categories.some(x=>x.slug===item.slug))categories.push(item);});
   this.setData({categories,items,filteredItems:search(items,this.data.searchText),page:page+1,hasMore:body.has_more===true||Number(body.has_more)===1,loading:false});
  }).catch(()=>{if(this._alive&&seq===this._request)this.setData({loading:false,error:'内容暂时没有加载出来，请重试'});});
 },
 retry(){return this.load(this.data.items.length===0);},
 switchCat(e){const category=String(e.currentTarget.dataset.cat||'');if(!category||category===this.data.category)return;this.setData({category,items:[],filteredItems:[],page:1,hasMore:true});return this.load(true);},
 onSearch(e){const searchText=String(e&&e.detail&&e.detail.value||'');this.setData({searchText,filteredItems:search(this.data.items,searchText)});},
 clearSearch(){this.setData({searchText:'',filteredItems:this.data.items});},
 imgError(e){const id=String(e.currentTarget.dataset.id);const items=this.data.items.map(item=>String(item.id)===id?Object.assign({},item,{hasImage:false}):item);this.setData({items,filteredItems:search(items,this.data.searchText)});},
 detail(e){const id=Number(e.currentTarget.dataset.id);if(id>0)wx.navigateTo({url:'/sage_dksy/pages/v12/detail?id='+id});},
 onReachBottom(){return this.load(false);},
 onPullDownRefresh(){return this.load(true).then(()=>{wx.stopPullDownRefresh();});},
 onRewardResult:rewardUI.onRewardResult,
 dismissReward:rewardUI.dismissReward,
 refreshReward(){if(this.rewardControl)return this.rewardControl.refresh();},
 watch(){if(!this._alive)return;const data=this.data.reward||{},view=this.data.rewardView||{};if(view.disabled||view.state!=='ready')return;const unit=String(data.ad_unit_id||'');if(!/^adunit-[A-Za-z0-9]{8,80}$/.test(unit)){wx.showToast({title:'视频暂未准备好，请稍后重试',icon:'none'});return;}this.setData({rewardResult:null});if(!this._yxRewardAd)this._yxRewardAd=require('../../utils/v12234_reward_inline.js').create(this,'read');this._yxRewardAd.play(unit);},
 onShareAppMessage(){reader.call('v12metric',{event:'share_trigger'}).catch(()=>{});return {title:'元享阅读 · 每天读点好内容',path:'/sage_dksy/pages/v12/list'+(this.data.shareCode?'?from='+this.data.shareCode:'')};},
 onShareTimeline(){reader.call('v12metric',{event:'share_trigger'}).catch(()=>{});return {title:'元享阅读',query:this.data.shareCode?'from='+this.data.shareCode+'&source=timeline':''};}
});
