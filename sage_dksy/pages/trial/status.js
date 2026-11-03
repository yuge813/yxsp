// Presentation derives only from explicit server text and the existing completion gate.
// A missing/unknown status never means that a participant lost or was selected.
function outcome(record) {
  record = record || {};
  var text = typeof record.status_text === 'string' ? record.status_text.trim() : '';
  if (Number(record.can_complete) === 1) return 'selected';
  if (/未中选|未中奖|未获选|未被选中/.test(text)) return 'unselected';
  if (/收货资料已提交|资料已提交|收货信息已提交|已完善收货资料|已提交收货资料/.test(text)) return 'submitted';
  if (/已中选|中选成功|已中奖|已获选/.test(text)) return 'selected';
  if (/等待.*结果|等候.*结果|待公布|待开奖|等待开奖|待审核|审核中|待结果|已报名|报名成功|申请成功|申请已提交|已提交申请/.test(text)) return 'pending';
  return 'unknown';
}
function decorate(record) { return Object.assign({}, record, {_outcome:outcome(record)}); }
module.exports = {outcome:outcome,decorate:decorate};
