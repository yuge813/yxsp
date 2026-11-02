const ops=require('../../utils/v1222ops.js');
function debug(reason,details){
 if(reason==='frequency_limited'||reason==='no_notice_for_scene')return; // YX_V12238: normal rate limit, not an error
 try{
  if(typeof wx.getAccountInfoSync!=='function')return;
  const info=wx.getAccountInfoSync();
  if(!info||!info.miniProgram||info.miniProgram.envVersion==='release')return;
  console.info('[元享公告]',Object.assign({reason:reason},details||{}));
 }catch(_){}
}
function cleanTitle(value){
 const raw=String(value||'').trim();
 return raw.replace(/^(?:公告|通知)\s*[：:]\s*/,'').trim()||raw||'站内公告';
}
function lineCount(value,columns){
 return String(value||'').split(/\r?\n/).reduce((count,line)=>{
  const units=line.replace(/[^\x00-\xff]/g,'aa').length/2;
  return count+Math.max(1,Math.ceil(units/columns));
 },0);
}
function presentation(notice,imageFailed){
 const n=notice||{},title=cleanTitle(n.title),rawBody=String(n.body||'').trim();
 const normalized=value=>cleanTitle(value).replace(/\s+/g,' ').trim();
 const body=rawBody&&normalized(rawBody)!==normalized(n.title)?rawBody:'';
 let info={};
 try{if(typeof wx.getWindowInfo==='function')info=wx.getWindowInfo()||{};}catch(_){}
 if(!(Number(info.windowWidth)>0&&Number(info.windowHeight)>0)){
  try{if(typeof wx.getSystemInfoSync==='function')info=wx.getSystemInfoSync()||info;}catch(_){}
 }
 const rawWidth=Number(info.windowWidth),rawHeight=Number(info.windowHeight);
 const width=Number.isFinite(rawWidth)&&rawWidth>0?rawWidth:375;
 const height=Number.isFinite(rawHeight)&&rawHeight>0?rawHeight:667;
 const unit=width/750,available=Math.max(1,height-176*unit);
 const compact=available/unit<640;
 const heroHeight=Math.max(0,Math.floor(Math.min((compact?82:96)*unit,available*.34)));
 const footerHeight=Math.max(1,Math.floor(Math.min((compact?126:142)*unit,available*.24)));
 const footerPad=Math.max(0,Math.floor(Math.min((compact?12:25)*unit,footerHeight*.2)));
 const desired=(68+lineCount(title,13)*60+(body?26+lineCount(body,18)*56:0)+(n.image_url&&!imageFailed?334:0))*unit;
 const contentHeight=Math.max(1,Math.floor(Math.min(desired,Math.max(1,available-heroHeight-footerHeight))));
 return {displayTitle:title,displayBody:body,heroHeight,footerHeight,footerPad,
  buttonHeight:Math.max(1,footerHeight-2*footerPad),contentHeight,compact:compact,imageFailed:!!imageFailed};
}
Component({
 properties:{
  scene:{type:String,value:'home'},
  ready:{type:Boolean,value:true,observer(value){
   if(!this.yx22Alive)return;
   if(value)this.loadContent(true);else this.close();
  }}
 },
 data:{visible:false,notice:null,action:'',displayTitle:'',displayBody:'',heroHeight:116,footerHeight:71,footerPad:12,buttonHeight:47,contentHeight:60,compact:false,imageFailed:false},
 lifetimes:{
  attached(){this.yx22Alive=true;this.yx22PageVisible=true;this.yx22Seq=0;this.loadContent(true);},
  detached(){this.yx22Alive=false;this.yx22PageVisible=false;this.cancelLoad();}
 },
 pageLifetimes:{
  show(){this.yx22PageVisible=true;this.loadContent(true);},
  hide(){this.yx22PageVisible=false;this.close();},
  resize(){this.refreshLayout();}
 },
 methods:{
  refreshLayout(){if(this.yx22Alive&&this.data.visible&&this.data.notice)this.setData(presentation(this.data.notice,this.data.imageFailed));},
  coverError(){if(this.yx22Alive&&this.data.notice)this.setData(presentation(this.data.notice,true));},
  clearWait(){if(this.yx22Timer){clearTimeout(this.yx22Timer);this.yx22Timer=null;}},
  cancelLoad(){this.yx22Seq=(this.yx22Seq||0)+1;this.clearWait();},
  canShow(seq){return this.yx22Alive&&this.yx22PageVisible&&this.properties.ready&&this.yx22Seq===seq;},
  loadContent(force){
   if(!this.yx22Alive||!this.yx22PageVisible||!this.properties.ready||this.data.visible)return;
   this.cancelLoad();const seq=this.yx22Seq;
   ops.fetch(!!force).then(data=>{
    if(!this.canShow(seq)||this.data.visible)return;
    if(Number(data.error)!==0){debug('config_unavailable',{code:Number(data.error)||1,detail:data.reason||''});return;}
    const matches=ops.scopeNotices(data,this.properties.scene);
    const n=matches.filter(ops.eligible)[0];
    if(!n){debug(matches.length?'frequency_limited':'no_notice_for_scene',{scene:this.properties.scene,count:matches.length});return;}
    this.yx22Timer=setTimeout(()=>{
     this.yx22Timer=null;
     if(!this.canShow(seq)||this.data.visible||!ops.eligible(n))return;
     const link=ops.safeLink(n,data.allowed_hosts||[]);
     this.setData(Object.assign({visible:true,notice:n,action:link},presentation(n,false)),()=>{
      if(!this.canShow(seq)||!this.data.visible||!this.data.notice||this.data.notice.id!==n.id)return;
      ops.record(n);debug('shown',{scene:this.properties.scene});
     });
    },1000);
   }).catch(()=>{if(this.canShow(seq))debug('request_failed');});
  },
  noop(){},
  close(){this.cancelLoad();if(this.yx22Alive)this.setData({visible:false,notice:null,action:''});},
  action(){const url=this.data.action;this.close();if(!url)return;
   const tabs=['/sage_dksy/pages/index/index','/sage_dksy/pages/v14/tasks/index','/sage_dksy/pages/prize/index','/sage_dksy/pages/user/index'];
   if(tabs.indexOf(url)>=0)wx.reLaunch({url});
   else wx.navigateTo({url,fail(){wx.showToast({title:'页面暂不可用',icon:'none'});}});
  }
 }
});
