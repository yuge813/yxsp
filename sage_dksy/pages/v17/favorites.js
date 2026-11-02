const read=require('../../utils/v12read.js');
Page({
  data:{items:[],page:1,more:true,loading:false,error:'',loaded:false},
  onLoad(){this._alive=true;},
  onShow(){this.reload();},
  onUnload(){this._alive=false;this._seq=(this._seq||0)+1;},
  onPullDownRefresh(){this.reload();},
  onReachBottom(){this.load(false);},
  reload(){return this.load(true);},
  loadMore(){return this.load(false);},
  load(reset){
    if(this._loading||(!reset&&!this.data.more))return Promise.resolve();
    const page=reset?1:this.data.page,seq=(this._seq||0)+1;this._seq=seq;this._loading=true;this.setData({loading:true,error:''});
    return read.call('v12favorites',{page}).then(r=>{
      if(this._alive===false||this._seq!==seq)return;
      if(!r||!Array.isArray(r.items))throw new Error('invalid_response');
      const rows=r.items.map(item=>Object.assign({},item,{imageFailed:false}));
      this.setData({items:reset?rows:this.data.items.concat(rows),page:page+1,more:!!r.has_more,loading:false,error:'',loaded:true});
    }).catch(()=>{if(this._alive!==false&&this._seq===seq)this.setData({loading:false,error:'收藏暂时没有加载出来，请重试'});}).finally(()=>{if(this._seq===seq){this._loading=false;wx.stopPullDownRefresh();}});
  },
  imageError(e){const id=Number(e.currentTarget.dataset.id);this.setData({items:this.data.items.map(item=>Number(item.id)===id?Object.assign({},item,{imageFailed:true}):item)});},
  open(e){const id=Number(e.currentTarget.dataset.id)||0;if(id)wx.navigateTo({url:'/sage_dksy/pages/v12/detail?id='+id});},
  retry(){this.reload();},
  goRead(){wx.navigateTo({url:'/sage_dksy/pages/v12/list'});}
});
