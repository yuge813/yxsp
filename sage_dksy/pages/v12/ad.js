'use strict';
// V12.15: SDK error recovery, bounded wait and manual return. Preserve native ad flow.
// No client-side signal is sufficient proof to issue production/redeemable coins.
const v11 = require('../../utils/v11.js');
function api(name, data) {return new Promise((resolve, reject) => v11.api(name, data || {}, resolve, reject));}
function errText(e) {
  const raw = String((e && (e.errMsg || e.msg || e.message)) || e || '操作失败');
  const code = Number((e && (e.errCode || e.code)) || 0);
  if (code === 1004) return '暂无可播放广告';
  if (code === 1002) return '广告位暂不可用';
  if (/openADCanvas|开发者工具.*不支持.*API|not supported in devtools/i.test(raw)) return '当前环境无法打开广告，请用手机微信测试';
  if (/you can only invoke show\(/i.test(raw)) return '广告页面异常，请重新进入';
  return code ? '广告加载失败（' + code + '）' : raw.slice(0, 48);
}
const VALID_ID = /^[a-f0-9]{32}$/;
const FINISHED = ['closed_unpaid', 'expired', 'expired_unverified'];
Page({
  data: {working: true, message: '正在准备广告…', canPlay: false, finished: false, settled: false},
  onLoad(q) {
    this._dead = false; this._leaving = false; this._phase = 'idle'; this._busy = false;
    this._task = ''; this._started = 0; this._ad = null;
    this._startGuard = null; this._showGuard = null; this._sessionGuard = null; this._claimTimer = null;
    this._appErrorHandler = null; this._devtools = false;
    this._onCloseHandler = null; this._onErrorHandler = null; this._errorSeen = false;
    this._channel = q && q.channel === 'home' ? 'home' : 'read';
    this._unit = '';
    try {this._unit = decodeURIComponent(String((q && q.unit) || ''));} catch (e) {}
    if (!/^adunit-[A-Za-z0-9]{8,80}$/.test(this._unit)) {this._fatal = '广告位没有正确配置'; return;}
    if (typeof wx.createRewardedVideoAd !== 'function') {this._fatal = '当前环境不支持激励视频'; return;}
    // Simulator support varies by base library; never block it before trying show().
    try {
      const info = typeof wx.getSystemInfoSync === 'function' ? wx.getSystemInfoSync() : {};
      this._devtools = /devtools/i.test(String(info.platform || ''));
    } catch (e) {}
    // Some SDK versions surface openADCanvas as a global app-service error only.
    // Register a scoped listener without swallowing errors or interfering with other pages.
    if (typeof wx.onError === 'function') {
      this._appErrorHandler = (raw) => {
        const message = String(typeof raw === 'string' ? raw : ((raw && (raw.errMsg || raw.message)) || ''));
        if (/openADCanvas/i.test(message) && this._phase === 'playing' && this._task) {
          this._adError({errMsg:message});
        }
      };
      try {wx.onError(this._appErrorHandler);} catch (e) {this._appErrorHandler = null;}
    }
    try {
      this._ad = wx.createRewardedVideoAd({adUnitId: this._unit});
      this._onCloseHandler = (res) => this._closed(res);
      this._onErrorHandler = (e) => this._adError(e);
      this._ad.onClose(this._onCloseHandler); this._ad.onError(this._onErrorHandler);
    } catch(e) {this._fatal = errText(e);}
  },
  onReady() {
    if (this._fatal) {this._exit(this._fatal); return;}
    this._prepare();
  },
  _top() {
    if (this._dead || this._leaving) return false;
    if (typeof getCurrentPages !== 'function') return true;
    const ps = getCurrentPages(); return !ps || !ps.length || ps[ps.length - 1] === this;
  },
  _clearTimers() {
    for (const k of ['_startGuard','_showGuard','_sessionGuard','_claimTimer']) {
      if (this[k]) {clearTimeout(this[k]); this[k] = null;}
    }
  },
  _prepare() {
    api('v12status', {channel:this._channel}).then((r) => {
      if (!this._top()) return;
      if (!r || r.logged_in === 0) throw new Error('请先登录');
      if (!r.reward_enabled) throw new Error('视频奖励尚未开放');
      const mode = String(r.mode || 'manual_verified');
      const coins = Number(r.coins || 0), limit = Number(r.daily_limit || 0);
      if (mode === 'manual_verified') throw new Error('当前是后台核验模式，暂不能自动领奖');
      if (/^native_auto_\d{10}$/.test(mode) && (coins < 1 || coins > 2 || limit > 10 || Number(r.cooldown_sec || 600) < 600)) {
        throw new Error('后台测试奖励设置不符合结算限制');
      }
      if (String(r.ad_unit_id || '') !== this._unit) throw new Error('广告配置已变化，请重新进入');
      if (r.pending_task) throw new Error('上一笔奖励仍在处理中，请稍后刷新');
      if (Number(r.remaining || 0) <= 0) throw new Error('今日观看奖励次数已用完');
      if (Number(r.budget_blocked)===1) throw new Error('今日金币预算已满');
      if (Number(r.next_at || 0) > Number(r.now || Math.floor(Date.now()/1000))) throw new Error('奖励冷却中，请稍后再看');
      this.setData({working: true, message: '正在打开广告…'});
      this._start();
    }).catch((e) => {if (this._top()) this._exit(errText(e));});
  },
  _start() {
    if (!this._top() || this._phase !== 'idle' || this._busy) return;
    this._busy = true; this._errorSeen = false;
    this._startGuard = setTimeout(() => {
      if (this._phase === 'idle' && this._top()) this._exit('视频请求超时，请重试');
    }, 18000);
    api('v12metric', {event: 'ad_entry_click'}).catch(() => {});
    api('v12start', {channel:this._channel}).then((r) => {
      if (this._startGuard) {clearTimeout(this._startGuard); this._startGuard = null;}
      if (!r || !VALID_ID.test(String(r.task_id || ''))) throw new Error('创建视频奖励任务失败');
      const t = String(r.task_id);
      if (!this._top()) {this._signal(t, 'closed'); return;}
      this._task = t; this._started = Date.now(); this._phase = 'playing';
      if (r.ad_unit_id !== this._unit) throw new Error('广告配置已变化');
      // Only guard the opening handshake, not the duration of the video.
      this._showGuard = setTimeout(() => {
        if (this._top() && this._phase === 'playing') this._fail(new Error('广告打开超时'));
      }, 20000);
      return this._ad.show().catch((e) => {
        if (!this._top() || this._phase !== 'playing' || this._errorSeen) throw e;
        const raw = String((e && e.errMsg) || e || '');
        if (/openADCanvas|开发者工具.*不支持|you can only invoke show\(|page where|page-scoped/i.test(raw)) throw e;
        return this._ad.load().then(() => {
          if (!this._top() || this._phase !== 'playing' || this._errorSeen) throw e;
          return this._ad.show();
        });
      });
    }).then(() => {
      if (this._showGuard) {clearTimeout(this._showGuard); this._showGuard = null;}
      if (this._top() && this._phase === 'playing') {
        // show() resolving does not guarantee an onClose() will arrive. A broken
        // devtools native bridge may resolve but never display the ad.
        // Use a generous post-show watchdog; do not cut off normal video playback.
        this._sessionGuard = setTimeout(() => {
          if (this._top() && this._phase === 'playing') this._fail(new Error('广告未能正常结束，请重新尝试'));
        }, this._devtools ? 90000 : 180000);
        api('v12metric', {event:'ad_show_signal'}).catch(() => {});
      }
    }).catch((e) => {
      if (!this._top()) return;
      if (this._phase === 'playing' && this._task) this._fail(e);
      else if (this._phase === 'idle') this._exit(errText(e)); // Ignore late SDK rejections after close/failure.
    });
  },
  _adError(e) {
    this._errorSeen = true; console.warn('[元享阅读] 激励广告错误', e);
    if (this._phase === 'playing' && this._task) this._fail(e);
  },
  _signal(task, kind) {
    return api('v12signal', {task_id:task, signal:kind});
  },
  _fail(e) {
    if (this._phase !== 'playing' || !this._task) return;
    const task = this._task; this._task = ''; this._phase = 'closing'; this._clearTimers();
    console.warn('[元享阅读] 广告失败', e);
    // Acknowledgment before returning prevents a stale reserved task in the status pill.
    Promise.race([this._signal(task,'no_fill').catch(() => null), new Promise((r) => setTimeout(r, 2500))])
      .then(() => this._exit(errText(e)), () => this._exit(errText(e)));
  },
  _closed(result) {
    if (this._phase !== 'playing' || !this._task) return;
    const task = this._task;
    this._task = ''; this._phase = 'finalizing'; this._clearTimers();
    if (!result || result.isEnded !== true) {
      this.setData({working: false, finished: true});
      // Native overlay must close before the notice is shown.
      Promise.race([this._signal(task,'closed').catch(() => null), new Promise((r) => setTimeout(r,2500))])
        .then(() => this._exit('视频未看完，本次未获得金币'), () => this._exit('视频未看完，本次未获得金币'));
      return;
    }
    this.setData({working:true,message:'视频已看完，正在查询奖励…'});
    this._finish(task);
  },
  async _finish(task) {
    let reply = null;
    try {
      const sig = await this._signal(task, 'ended');
      if (!this._top()) return;
      if (sig && (sig.paid || sig.status === 'settled')) {await this._check(task, sig); return;}
      if (sig && FINISHED.indexOf(sig.status) >= 0) {this._exit('任务已结束，本次无金币奖励'); return;}
      // V12.9 test-only settlement checks >=15s since task creation.
      const wait = Math.max(0, 16500 - (Date.now() - this._started));
      if (wait) await new Promise((r) => {this._claimTimer = setTimeout(() => {this._claimTimer = null; r();}, wait);});
      if (!this._top()) return;
      reply = await api('v125clientclaim', {task_id:task});
    } catch (e) {
      console.warn('[元享阅读] 完播结算请求失败', e);
      // An API failure is NOT proof that the server rejected the completion.
    }
    if (!this._top()) return;
    await this._check(task, reply);
  },
  async _check(task, reply) {
    if (!this._top()) return;
    if (reply && reply.message) console.warn('[元享阅读] 自动结算结果:', String(reply.message));
    // Check actual ledger task, not the optimistic client claim response.
    for (let n = 0; n < 3 && this._top(); n++) {
      try {
        const r = await api('v12task', {task_id:task});
        if (!this._top()) return;
        if (r && (r.paid || r.status === 'settled')) {
          this._phase = 'done'; this.setData({working:false,finished:true,settled:true});
          this._exit('金币已到账 +' + Number(r.coins || 0)); return;
        }
        if (r && FINISHED.indexOf(r.status) >= 0) {
          this._exit('任务已结束，本次无金币奖励'); return;
        }
      } catch(e) {console.warn('[元享阅读] 查询服务端任务失败', e);}
      if (n < 2) await new Promise((r) => {this._claimTimer = setTimeout(() => {this._claimTimer = null; r();}, 1500);});
    }
    if (this._top()) {
      this._phase = 'done';
      this._exit('广告已看完，奖励待后台核验');
    }
  },
  _exit(message) {
    if (this._dead || this._leaving) return;
    this._leaving = true; this._phase = 'done'; this._busy = false; this._clearTimers();
    const tip = () => {
      if (message) wx.showToast({title: String(message).slice(0, 30), icon:'none', duration:2800});
    };
    wx.navigateBack({delta:1,success:tip,fail:() => wx.redirectTo({url:'/sage_dksy/pages/v12/list',success:tip})});
  },
  back() {
    if (this._dead || this._leaving) return;
    if (this._phase === 'playing' && this._task) {
      // Give the user an escape hatch when the native SDK never opens its UI.
      // Treat manual return as incomplete, never as a rewarded close.
      const task = this._task; this._task = ''; this._phase = 'closing';
      this._clearTimers(); this.setData({working:false, message:'正在返回阅读…'});
      Promise.race([this._signal(task,'closed').catch(() => null), new Promise((r) => setTimeout(r, 2500))])
        .then(() => this._exit('本次未获得金币'), () => this._exit('本次未获得金币'));
      return;
    }
    if (this._phase === 'finalizing') {this._exit('奖励结算处理中，请稍后查看');return;}
    this._exit('');
  },
  onUnload() {
    this._dead = true; this._clearTimers();
    if (this._phase === 'playing' && this._task) {const task=this._task;this._task='';this._signal(task,'closed').catch(()=>{});}
    this._phase = 'done';
    if (this._appErrorHandler && typeof wx.offError === 'function') {
      try {wx.offError(this._appErrorHandler);} catch(e) {}
      this._appErrorHandler = null;
    }
    if (this._ad) {
      try {if (this._ad.offClose && this._onCloseHandler) this._ad.offClose(this._onCloseHandler);} catch(e) {}
      try {if (this._ad.offError && this._onErrorHandler) this._ad.offError(this._onErrorHandler);} catch(e) {}
      try {if (this._ad.destroy) this._ad.destroy();} catch(e) {}
      this._ad = null;
    }
  }
});
