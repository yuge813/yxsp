'use strict';
const reader=require('../../utils/v12read.js');
const invite=require('../../utils/v11.js');
Page({
 data:{id:0,article:null,loading:true,error:'',favorite:0,favoriteBusy:false,fontSize:34,shareCode:'',reward:{},rewardView:{state:'loading',text:'正在同步奖励状态',sub:'',remaining:0,disabled:true}},
 onLoad(q){this._alive=true;this._request=0;this.setData({id:Number(q&&q.id)||0});this.rewardControl=reader.makeReward(this);this.load();if(q&&q.from)invite.registerVisit(q.from,'article',this.data.id,q.source||'friend',()=>{});invite.api('v11whoami',{},r=>{if(this._alive)this.setData({shareCode:r.code||''});},()=>{});},
 onShow(){if(this.rewardControl)this.rewardControl.start();},onHide(){if(this.rewardControl)this.rewardControl.stop();if(this._yxRewardAd)this._yxRewardAd.leave();},
 onUnload(){this._alive=false;this._request++;if(this.rewardControl)this.rewardControl.stop();if(this._yxRewardAd){this._yxRewardAd.destroy();this._yxRewardAd=null;}},
 load(){if(!this.data.id){this.setData({loading:false,error:'这篇文章暂时无法打开'});return Promise.resolve();}const seq=++this._request;this.setData({loading:true,error:''});return reader.call('v12detail',{id:this.data.id}).then(r=>{if(!this._alive||seq!==this._request)return;if(!r||!r.article||typeof r.article!=='object')throw new Error('missing article');this.setData({article:r.article,favorite:Number(r.favorite)===1?1:0,loading:false});}).catch(()=>{if(this._alive&&seq===this._request)this.setData({loading:false,error:'文章暂时没有加载出来，请重试'});});},
 onPullDownRefresh(){return this.load().then(()=>wx.stopPullDownRefresh());},
 imgError(){if(this.data.article)this.setData({'article.cover_url':''});},
 font(e){this.setData({fontSize:Math.max(30,Math.min(46,this.data.fontSize+Number(e.currentTarget.dataset.delta)))});},
 toggleFavorite(){if(this.data.favoriteBusy||!this.data.article)return;this.setData({favoriteBusy:true});reader.call('v12favorite',{id:this.data.id,on:this.data.favorite?0:1}).then(r=>{if(this._alive)this.setData({favorite:Number(r.favorite)===1?1:0,favoriteBusy:false});}).catch(()=>{if(this._alive){this.setData({favoriteBusy:false});wx.showToast({title:'收藏未成功，请重试',icon:'none'});}});},
 refreshReward(){if(this.rewardControl)return this.rewardControl.refresh();},
 watch(){const d=this.data.reward||{},view=this.data.rewardView||{};if(view.disabled||view.state!=='ready')return;const unit=String(d.ad_unit_id||'');if(!/^adunit-[A-Za-z0-9]{8,80}$/.test(unit)){wx.showToast({title:'视频暂未准备好，请稍后重试',icon:'none'});return;}if(!this._yxRewardAd)this._yxRewardAd=require('../../utils/v12234_reward_inline.js').create(this,'read');this._yxRewardAd.play(unit);},
 onShareAppMessage(){const a=this.data.article||{};reader.call('v12metric',{event:'share_trigger',id:this.data.id}).catch(()=>{});return {title:a.title||'元享阅读',path:'/sage_dksy/pages/v12/detail?id='+this.data.id+(this.data.shareCode?'&from='+this.data.shareCode:'')};},
 onShareTimeline(){const a=this.data.article||{};reader.call('v12metric',{event:'share_trigger',id:this.data.id}).catch(()=>{});return {title:a.title||'元享阅读',query:'id='+this.data.id+(this.data.shareCode?'&from='+this.data.shareCode:'')+'&source=timeline'};}
});
