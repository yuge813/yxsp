'use strict';
// Yuanxiang V12.23.4: same-page native rewarded ad host for V12 reading pages.
// One native instance belongs to ONE actual page; no navigateTo bridge for playback.
// Server v12task ledger is the only source of truth for coins.
const v11 = require('./v11.js');
const call = (name, data) => new Promise((resolve, reject) => v11.api(name, data || {}, resolve, reject));
const ID = /^[a-f0-9]{32}$/;
const UNIT = /^adunit-[A-Za-z0-9]{8,80}$/;
const FINISHED = ['closed_unpaid', 'expired', 'expired_unverified'];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const paid = value => !!value && (value.paid === true || Number(value.paid) === 1 || value.status === 'settled');
function rewardAmount(value) {if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object'||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
function desc(e) {
  const raw = String((e && (e.errMsg || e.msg || e.message)) || e || '广告暂不可用');
  const n = Number((e && (e.errCode || e.code)) || 0);
  if (n === 1004) return '暂无可播放广告，请稍后再试';
  if (n === 1002) return '广告位暂不可用';
  if (/you can only invoke show\(|page where|openADCanvas|operateWxDataForAd|system apperror/i.test(raw)) return '广告播放异常，请稍后重试';
  return n ? '广告加载失败（' + n + '）' : raw.slice(0, 28);
}
function create(page, sourceChannel) {
  const c = {
    page, channel:sourceChannel==='home'?'home':'read', alive: true, phase: 'idle', ad: null, unit: '', task: '', started: 0,
    errorSeen: false, lastClose: 0, run: 0, timers: [], onClose: null, onError: null,
    active() {
      if (!this.alive) return false;
      if (typeof getCurrentPages !== 'function') return true;
      const pages = getCurrentPages();
      return !pages || !pages.length || pages[pages.length - 1] === this.page;
    },
    tell(str) {
      if (!this.alive || !str || !this.active()) return;
      try { wx.showToast({title: String(str).slice(0, 30), icon: 'none', duration: 2600}); } catch (_) {}
    },
    notify(state, coins, taskId, message) {
      if (!this.active() || typeof this.page.onRewardResult !== 'function') return;
      try {this.page.onRewardResult({state,coins:rewardAmount(coins),taskId:String(taskId||''),message:String(message||'')});} catch (_) { /* A display callback must never affect settlement. */ }
    },
    refresh() {
      if (!this.active()) return;
      if (this.page.rewardControl && this.page.rewardControl.refresh) {
        this.page.rewardControl.refresh().catch(() => {});
      } else if (typeof this.page.refreshTodayTask === 'function') {
        this.page.refreshTodayTask().catch(() => {});
      }
    },
    later(fn, ms) {
      const t = setTimeout(() => {this.timers = this.timers.filter(x => x !== t); fn();}, ms);
      this.timers.push(t); return t;
    },
    clearTimers() {
      this.timers.forEach(t => clearTimeout(t)); this.timers = [];
    },
    signal(task, signal) { return call('v12signal', {task_id: task, signal}); },
    async closeReserved(task, signal) {
      // If the app request is interrupted, the server must NOT pay this task.
      try { await Promise.race([this.signal(task, signal), wait(2500)]); } catch (_) {}
    },
    bind(unit) {
      if (!this.active()) throw new Error('请回到阅读页重新打开视频');
      if (this.ad && this.unit === unit) return this.ad;
      if (this.ad) throw new Error('广告配置已变化，请重新进入阅读页');
      if (typeof wx.createRewardedVideoAd !== 'function') throw new Error('当前环境不支持激励视频');
      const ad = wx.createRewardedVideoAd({adUnitId: unit, multiton: true});
      if (!ad || typeof ad.show !== 'function') throw new Error('原生激励视频初始化失败');
      this.ad = ad; this.unit = unit;
      this.onClose = res => this.closed(res);
      this.onError = e => this.failed(e);
      ad.onClose(this.onClose);
      ad.onError(this.onError);
      return ad;
    },
    async play(unit) {
      if (!this.active() || this.phase !== 'idle') return;
      if (!UNIT.test(String(unit || ''))) {this.tell('广告位配置异常');return;}
      // SDK native view may still be detaching after an onClose event.
      if (Date.now() - this.lastClose < 2000) {this.tell('广告准备中，请稍后重试');return;}
      this.phase = 'checking'; this.run++; const seq = this.run;
      try {
        const r = await call('v12status', {channel:this.channel});
        if (!this.active() || this.run !== seq) {this.phase = 'idle';return;}
        if (!r || r.logged_in === 0) throw new Error('请先登录');
        if (!r.reward_enabled) throw new Error('视频奖励暂未开放');
        if (String(r.mode || 'manual_verified') === 'manual_verified') throw new Error('奖励暂未开放');
        const mode = String(r.mode || '');
        if (/^native_auto_\d{10}$/.test(mode) && (Number(r.coins || 0) < 1 || Number(r.coins || 0) > 2 || Number(r.daily_limit || 0) > 10 || Number(r.cooldown_sec || 600) < 600)) throw new Error('后台奖励配置异常');
        if (String(r.ad_unit_id || '') !== String(unit)) throw new Error('广告设置已更新，请刷新页面');
        if (r.pending_task) throw new Error('上一笔奖励正在处理，请稍后重试');
        if (Number(r.remaining || 0) <= 0) throw new Error('今日观看次数已用完');
        if (Number(r.budget_blocked)===1) throw new Error('今日金币预算已满');
        if (Number(r.next_at || 0) > Number(r.now || Math.floor(Date.now()/1000))) throw new Error('奖励冷却中');
        const ad = this.bind(unit); // Creates the native instance on the ACTIVE ARTICLE PAGE.
        this.phase = 'starting';
        call('v12metric', {event:'ad_entry_click'}).catch(() => {});
        const x = await call('v12start', {channel:this.channel});
        if (!x || !ID.test(String(x.task_id || ''))) throw new Error('视频任务创建失败');
        const task = String(x.task_id);
        if (!this.active() || this.run !== seq) {
          await this.closeReserved(task, 'closed');this.phase = 'idle';return;
        }
        this.task = task; this.started = Date.now(); this.phase = 'playing'; this.errorSeen = false;
        if (String(x.ad_unit_id || '') !== String(unit)) throw new Error('广告配置已变化');
        const showGuard = this.later(() => {
          if (this.alive && this.phase === 'playing' && this.run === seq) this.failed(new Error('视频打开超时，请重试'));
        }, 20000);
        try {
          try {await Promise.resolve(ad.show());}
          catch (e) {
            const msg = String((e && e.errMsg) || e || '');
            // Never invoke show a second time after a native bridge or page error.
            if (!this.active() || this.run !== seq || this.phase !== 'playing' || this.errorSeen ||
              /openADCanvas|operateWxDataForAd|system apperror|you can only invoke show\(|page where|page-scoped/i.test(msg) ||
              typeof ad.load !== 'function') throw e;
            await Promise.resolve(ad.load());
            if (!this.active() || this.run !== seq || this.phase !== 'playing' || this.errorSeen) throw e;
            await Promise.resolve(ad.show());
          }
        } finally {
          clearTimeout(showGuard); this.timers = this.timers.filter(x => x !== showGuard);
        }
        if (this.active() && this.phase === 'playing' && this.run === seq) {
          this.later(() => {
            if (this.alive && this.phase === 'playing' && this.run === seq) this.failed(new Error('视频未能正常结束，请重新尝试'));
          }, 180000);
          call('v12metric', {event:'ad_show_signal'}).catch(() => {});
        }
      } catch(e) {
        if (!this.alive || this.run !== seq) return;
        if (this.task && (this.phase === 'playing' || this.phase === 'starting')) this.failed(e);
        else if (this.phase === 'checking' || this.phase === 'starting') {
          this.phase = 'idle';this.tell(desc(e));this.notify('error',null,'',desc(e));this.refresh();
        }
      }
    },
    async failed(e) {
      if (!this.alive || (this.phase !== 'playing' && this.phase !== 'starting')) return;
      if (this.errorSeen) return;
      this.errorSeen = true;
      this.clearTimers(); this.lastClose = Date.now();
      const task = this.task; this.task = '';this.phase = 'closing';
      console.warn('[元享阅读] 原生视频播放失败', desc(e));
      if (task) await this.closeReserved(task, 'no_fill');
      if (!this.alive) return;
      this.phase = 'idle';this.tell(desc(e));this.notify('error',null,task,desc(e));this.refresh();
    },
    async closed(res) {
      if (!this.alive || this.phase !== 'playing' || !this.task) return;
      const task = this.task; this.task = '';
      this.clearTimers(); this.lastClose = Date.now();
      this.phase = 'finalizing';
      if (!res || res.isEnded !== true) {
        await this.closeReserved(task, 'closed');
        if (!this.alive) return;
        // Stay on this exact article/list page; do NOT navigateBack into SDK teardown.
        this.phase = 'idle';this.tell('视频未看完，本次未获得金币');this.notify('unpaid',null,task,'视频未完整观看，本次未获得奖励');this.refresh();
        return;
      }
      await this.settle(task);
    },
    async settle(task) {
      let reply = null;
      try {
        const sig = await this.signal(task, 'ended');
        if (!this.active()) return;
        if (paid(sig)) {await this.verify(task);return;}
        if (sig && FINISHED.includes(sig.status)) {this.phase = 'idle';this.tell('本次未获得金币');this.notify('unpaid',null,task,'本次未获得金币');this.refresh();return;}
        // Preserve V12.23.3 server settlement wait, not a client-created reward.
        const remaining = Math.max(0, 16500 - (Date.now() - this.started));
        if (remaining) await wait(remaining);
        if (!this.active()) return;
        reply = await call('v125clientclaim', {task_id:task});
      } catch (e) {
        console.warn('[元享阅读] 奖励结果查询失败', desc(e));
      }
      if (this.active()) await this.verify(task, reply);
    },
    async verify(task, reply) {
      if (!this.active()) return;
      if (reply && reply.message) console.warn('[元享阅读] 结算回复:',String(reply.message));
      for (let i = 0; i < 3 && this.active(); i++) {
        try {
          const r = await call('v12task', {task_id:task});
          if (!this.active()) return;
          if (paid(r)) {
            const coins=rewardAmount(r.coins);this.phase='idle';this.tell(coins===null?'金币已到账，请查看明细':'金币已到账 +'+coins);this.notify('paid',coins,task,'奖励已由服务端确认到账');this.refresh();return;
          }
          if (r && FINISHED.includes(r.status)) {
            this.phase = 'idle';this.tell('本次未获得金币');this.notify('unpaid',null,task,'本次未获得金币');this.refresh();return;
          }
        } catch(e) { console.warn('[元享阅读] 账本状态读取失败', desc(e)); }
        if (i < 2) await wait(1500);
      }
      if (this.active()) {this.phase='idle';this.tell('广告已看完，奖励处理中');this.notify('pending',null,task,'奖励仍在处理中，请稍后查看金币明细');this.refresh();}
    },
    leave() {
      // onHide can run for UI transitions; cancel only when another WeChat page is top.
      if (!this.alive || this.active()) return;
      this.run++;this.clearTimers();
      const task=this.task;this.task='';
      if (task && (this.phase === 'playing' || this.phase === 'starting')) this.closeReserved(task,'closed');
      this.phase='idle';
    },
    destroy() {
      if (!this.alive) return;
      this.alive=false;this.run++;this.clearTimers();
      const task=this.task;this.task='';
      if (task && (this.phase==='playing' || this.phase==='starting')) this.closeReserved(task,'closed');
      this.phase='done';
      if (this.ad) {
        const ad=this.ad;this.ad=null;
        try {if (ad.offClose && this.onClose) ad.offClose(this.onClose);}catch(_){ }
        try {if (ad.offError && this.onError) ad.offError(this.onError);}catch(_){ }
        // Do not synchronously tear down a native view while it is closing.
        setTimeout(() => {try {if (typeof ad.destroy === 'function') ad.destroy();}catch(_){ }}, Math.max(0,1800-(Date.now()-this.lastClose)));
      }
    }
  };
  return c;
}
module.exports = {create};
