// Presentation of the original first-level referral API. No binding or reward mutation.
function count(value) {
  if (value === undefined || value === null || typeof value === 'boolean' || typeof value === 'object' || String(value).trim() === '') return null;
  var n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}
function clock(value) {
  if (value === undefined || value === null || typeof value === 'boolean' || typeof value === 'object' || String(value).trim() === '') return '时间待同步';
  var n = Number(value), time = (n + 8 * 3600) * 1000;
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(time)) return '时间待同步';
  try { return new Date(time).toISOString().slice(0, 16).replace('T', ' '); } catch (_) { return '时间待同步'; }
}
function people(rows, page) {
  return (Array.isArray(rows) ? rows : []).filter(function (row) { return row && typeof row === 'object' && !Array.isArray(row); }).map(function (row, index) {
    var mask = typeof row.member_mask === 'string' ? row.member_mask : '';
    return {key: mask || 'friend-' + (page || 1) + '-' + index, member_mask: mask, nickname: typeof row.nickname === 'string' ? row.nickname : '', registered: clock(row.registered_at), bound: clock(row.bound_at)};
  });
}
function campaign(reply) {
  var c = reply && reply.published_referral_campaign;
  var published = !!(c && c.approved === true && c.enabled === true && c.public_visible === true);
  var stages = published && Array.isArray(c.stages) ? c.stages.filter(function (stage) {
    var amount = stage && count(stage.coins);
    return amount !== null && amount > 0 && typeof stage.label === 'string' && stage.label.trim();
  }).map(function (stage) { return {label: stage.label.trim(), coins: count(stage.coins)}; }) : [];
  return {approved: published && stages.length > 0, stages: stages, cap: published ? count(c.cap) : null};
}
module.exports = {count: count, clock: clock, people: people, campaign: campaign};
