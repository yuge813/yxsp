const ops=require('../../utils/v1222ops.js');
Page({data:{url:'',error:''},onLoad(q){let url='';try{url=decodeURIComponent(q&&q.u||'');}catch(_){}
 ops.fetch().then(cfg=>{const match=/^https:\/\/([^/:?#]+)(?:[/?#]|$)/i.exec(url);if(!match||!(cfg.allowed_hosts||[]).includes(match[1].toLowerCase()))return this.setData({error:'此网页暂不支持打开，请返回元享继续浏览'});this.setData({url});}).catch(()=>this.setData({error:'网页信息暂时没有加载出来，请稍后重试'}));},back(){wx.navigateBack({delta:1,fail(){wx.reLaunch({url:'/sage_dksy/pages/index/index'});}});}});
