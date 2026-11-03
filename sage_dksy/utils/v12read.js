'use strict';
// V12.10.6 status-only controller. Native ads belong ONLY to pages/v12/ad.
const v11 = require('./v11.js');
function call(name,data){return new Promise((resolve,reject)=>v11.api(name,data||{},resolve,reject));}
function notice(m){wx.showToast({title:String(m||'操作失败').slice(0,28),icon:'none'});}
function settled(value){return !!value&&(value.paid===true||value.paid===1||value.paid==='1'||value.status==='settled');}
function rewardAmount(value){if(typeof value!=='number'&&typeof value!=='string')return null;if(String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
function formatTime(sec){sec=Math.max(0,Math.ceil(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function makeReward(page) {
  let closed=true, timer=null, later=null, verifying=null, lastRefresh=0, activeUser='', serverOffset=0, reqSeq=0;
  function setView(state,text,sub,n) {
    if (closed) return;
    page.setData({rewardView:{state,text,sub,remaining:Number(n||0),disabled:state!=='ready'}});
  }
  function sync() {
    if (closed) return;
    const d=page.data.reward||{};
    const next=Math.max(0, Number(d.next_at||0)-Math.floor(Date.now()/1000)-serverOffset);
    if (d.pending_task) {
      const pending=d.pending_status==='pending_verification';
      setView('pending', pending?'奖励核验中':'视频状态同步中', pending?'等待后台确认':'请稍后刷新', d.remaining); return;
    }
    if (!d.logged_in) {setView('disabled','请先登录','',0);return;}
    if (!d.reward_enabled) {setView('disabled','暂未开放','',0);return;}
    if (String(d.mode||'manual_verified')==='manual_verified') {setView('blocked','奖励待开启','后台核验模式',d.remaining);return;}
    const mode=String(d.mode||'');
    if (/^native_auto_\d{10}$/.test(mode) && (Number(d.coins||0)<1||Number(d.coins||0)>2||Number(d.daily_limit||0)>10||Number(d.cooldown_sec||600)<600)) {
      setView('blocked','奖励配置异常','请联系管理员',d.remaining);return;
    }
    if (Number(d.remaining||0)<=0) {setView('limit','今日已领完','',0);return;}
    if (Number(d.budget_blocked)===1) {setView('blocked','今日预算已满','次数独立，金币预算共用',d.remaining);return;}
    if (next>0) {setView('cool','冷却中',formatTime(next),d.remaining);return;}
    setView('ready','看视频','领'+Number(d.coins||0)+'金币',d.remaining);
  }
  function notify(state,coins,taskId) {
    if(closed||typeof page.onRewardResult!=='function')return;
    try{page.onRewardResult({state,coins,taskId,message:state==='paid'?'奖励已由服务端确认到账':'本次未获得金币'});}catch(_){/* A display callback cannot affect ledger verification. */}
  }
  function checkPending(id) {
    if (closed || verifying===id) return;
    verifying=id;
    call('v12task',{task_id:id}).then((r)=>{
      if (closed || verifying!==id) return;
      if (settled(r)) {const coins=rewardAmount(r.coins);notice(coins===null?'奖励已结算，请核对金币明细':'金币已到账 +'+coins);notify('paid',coins,id);refresh();}
      else if (r && ['closed_unpaid','expired','expired_unverified'].indexOf(r.status)>=0) {notify('unpaid',null,id);refresh();}
    }).catch((e)=>console.warn('[元享阅读] 状态核验暂不可用',e)).then(()=>{if (verifying===id) verifying=null;});
  }
  function refresh() {
    if (closed) return Promise.resolve(null);
    const seq=++reqSeq;lastRefresh=Date.now();
    return call('v12status',{channel:'read'}).then((r)=>{
      if (closed || seq!==reqSeq) return null;
      if (!r || r.error) throw new Error(r&&r.msg||'无法获取视频奖励状态');
      const identity=String(r.user_ref||'guest');
      if (activeUser && identity!==activeUser) verifying=null;
      activeUser=identity;
      serverOffset=Number(r.now||Math.floor(Date.now()/1000))-Math.floor(Date.now()/1000);
      page.setData({reward:r});sync();
      // The reserved state may still be a close signal in flight; do not cache it indefinitely.
      if (r.pending_task && r.pending_status==='pending_verification') checkPending(r.pending_task);
      return r;
    }).catch((e)=>{
      if (closed || seq!==reqSeq) return null;
      console.warn('[元享阅读] 读取奖励状态失败',e);
      page.setData({reward:{},rewardView:{state:'disabled',text:'状态更新失败',sub:'请下拉刷新',remaining:0,disabled:true}});
      return null;
    });
  }
  function click() {
    const v=page.data.rewardView||{}, d=page.data.reward||{};
    if (closed || v.state!=='ready' || v.disabled) return;
    const unit=String(d.ad_unit_id||'');
    if (!/^adunit-[A-Za-z0-9]{8,80}$/.test(unit)) {notice('广告位尚未准备好');return;}
    wx.navigateTo({url:'/sage_dksy/pages/v12/ad?unit='+encodeURIComponent(unit)});
  }
  function start() {
    closed=false;reqSeq++;
    setView('loading','状态同步中','',0);
    refresh();
    if (timer) clearInterval(timer);
    timer=setInterval(()=>{
      if (closed) return;
      sync();
      const d=page.data.reward||{};
      if (Date.now()-lastRefresh>=15000 && (d.pending_task || !d.reward_enabled)) refresh();
    },1000);
    // Re-entering from ad page: re-check after the close signal reaches the server.
    if (later) clearTimeout(later);
    later=setTimeout(()=>{later=null;if(!closed)refresh();},3000);
  }
  function stop() {
    closed=true;reqSeq++;
    if (timer) clearInterval(timer);timer=null;
    if (later) clearTimeout(later);later=null;
    verifying=null;
  }
  return {start,stop,refresh,click};
}
module.exports={call,notice,makeReward,formatTime};
