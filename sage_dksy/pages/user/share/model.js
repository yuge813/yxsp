var app = getApp();
function number(value){if(value===undefined||value===null||value==='')return null;var n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
function bodyOf(r){var b=r&&r.data;if(typeof b==='string'){try{b=JSON.parse(b);}catch(_){return null;}}return b&&typeof b==='object'?b:null;}
function rowsOf(rows,page){return rows.map(function(item,index){return Object.assign({},item,{_key:String(item.user_id||'member')+'_'+page+'_'+index,_avatarFailed:false,_amount:number(item.integral)});});}
module.exports=function(endpoint){return {
 data:{list:[],openid:'',share_user:null,total_one:null,total_two:null,pages:1,load:true,loading:false,loaded:false,error:''},
 onLoad:function(){this._alive=true;this.reload();},
 onShow:function(){if(this._shown)this.reload();this._shown=true;},
 onUnload:function(){this._alive=false;this._seq=(this._seq||0)+1;},
 onPullDownRefresh:function(){this.reload();},
 onReachBottom:function(){this.loadMore();},
 reload:function(){if(this._busy)return;this._busy=true;this._seq=(this._seq||0)+1;var self=this,seq=this._seq;this.setData({loading:true,error:''});wx.login({success:function(auth){if(self._alive===false||self._seq!==seq)return;if(!auth||!auth.code){self.failed();return;}self.requestPage(1,{code:auth.code},true,seq);},fail:function(){if(self._alive!==false&&self._seq===seq)self.failed();}});},
 requestPage:function(page,identity,replace,seq){var self=this;app.util.request({url:'entry/wxapp/'+endpoint,data:Object.assign({},identity,{pages:page}),cache:'0',success:function(r){if(self._alive===false||self._seq!==seq)return;var b=bodyOf(r),status=Number(r&&r.statusCode)||200;if(status<200||status>=300||!b||!Array.isArray(b.list)||(b.error!==undefined&&Number(b.error)!==0)){self.failed();return;}var rows=rowsOf(b.list,page);self._busy=false;self.setData({list:replace?rows:self.data.list.concat(rows),openid:b.openid||self.data.openid,pages:page,load:rows.length>0,loading:false,loaded:true,error:'',total_one:b.total_one===undefined?self.data.total_one:number(b.total_one),total_two:b.total_two===undefined?self.data.total_two:number(b.total_two)});wx.stopPullDownRefresh();if(replace)self.getShareUser(seq);},fail:function(){if(self._alive!==false&&self._seq===seq)self.failed();}});},
 failed:function(){this._busy=false;this.setData({loading:false,error:'推广记录暂时没有加载出来，请重试'});wx.stopPullDownRefresh();},
 loadMore:function(){if(this._busy||!this.data.load||!this.data.openid)return;this._busy=true;this.setData({loading:true,error:''});this.requestPage(this.data.pages+1,{openid:this.data.openid},false,this._seq);},
 retry:function(){this.reload();},
 getShareUser:function(seq){var self=this;app.util.request({url:'entry/wxapp/shareuser',data:{openid:this.data.openid},cache:'0',success:function(r){if(self._alive===false||self._seq!==seq)return;var b=bodyOf(r);if(b&&b.user!==undefined)self.setData({share_user:b.user&&typeof b.user==='object'?b.user:null});}});},
 avatarError:function(e){var i=Number(e.currentTarget.dataset.index);if(i>=0&&i<this.data.list.length){var patch={};patch['list['+i+']._avatarFailed']=true;this.setData(patch);}},
 inviterAvatarError:function(){this.setData({'share_user._avatarFailed':true});}
};};
