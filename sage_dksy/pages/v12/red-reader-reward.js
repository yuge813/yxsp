'use strict';
// Display-only result adapter. Settlement stays in the native host and server ledger.
function amount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function onRewardResult(result) {
  if (!this._alive || !result || ['paid','unpaid','pending','error'].indexOf(result.state) < 0) return;
  const coins = amount(result.coins);
  const state = result.state === 'paid' && coins === null ? 'pending' : result.state;
  this.setData({rewardResult:{state,coins:state === 'paid' ? coins : null}});
}
function dismissReward() {if(!this._alive)return;this.setData({rewardResult:null});if(this.rewardControl)this.rewardControl.refresh();}
module.exports = {onRewardResult,dismissReward};
