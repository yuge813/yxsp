// V3 conservative UX frequency cap for ordinary display ads (not a billing or anti-fraud proof).
// Does not control reward video or WeChat's own ad frequency limits.
var KEY = 'dksy_v3_last_display_ad';
var COOLDOWN_MS = 120000;
function eligible(scene) {
  try {
    var last = wx.getStorageSync(KEY) || {};
    var elapsed = Date.now() - Number(last.at || 0);
    return !last.at || (elapsed >= COOLDOWN_MS && elapsed < 86400000);
  } catch (e) { return false; } // fail closed
}
function loaded(scene) {
  try { wx.setStorageSync(KEY, {scene:scene, at:Date.now()}); } catch(e) {}
}
function available(config, scene) {
  var c = config && config[scene];
  return !!(c && Number(c.on) === 1 && /^adunit-[A-Za-z0-9]{8,64}$/.test(c.unit || '') && eligible(scene));
}
module.exports = {available:available,loaded:loaded};
