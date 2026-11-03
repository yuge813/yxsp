'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const referral = require('../sage_dksy/pages/v132grow/referral.js');
const {loadPage} = require('./helpers/load-page.cjs');

function fixture(file) {
  const pending = [];
  const f = loadPage('sage_dksy/pages/' + file, {modules: {'sage_dksy/utils/v11.js': {
    api(name, data, success, fail) { pending.push({name, data, success, fail}); },
    clock: referral.clock,
    env() { return 'trial'; },
    toast() {}
  }}});
  return {...f, pending};
}

test('first-level counts and dates preserve unknown values instead of fabricating zero or epoch dates', () => {
  for (const value of [undefined, null, '', ' ', false, {}, [], Infinity, -1]) assert.equal(referral.count(value), null);
  assert.equal(referral.count('12'), 12);
  assert.equal(referral.count(0), 0);
  for (const value of [undefined, null, '', false, {}, Infinity, 0, -1, 1e20]) assert.equal(referral.clock(value), '时间待同步');
  assert.match(referral.clock(1700000000), /^2023-11-15/);
  const rows = referral.people([null, {}, {member_mask: 'A***1', nickname: '真实好友', registered_at: 1700000000, bound_at: 'bad'}], 2);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].key, 'friend-2-0');
  assert.equal(rows[1].member_mask, 'A***1');
  assert.equal(rows[1].bound, '时间待同步');
});

test('referral rewards display only a published approved enabled campaign and finite positive stages', () => {
  const campaign = {approved: true, enabled: true, public_visible: true, cap: 25,
    stages: [{label: '实际活动条件', coins: 5}, {label: '异常金额', coins: Infinity}, {label: '无效', coins: false}, {label: '', coins: 10}, null]};
  let normalized = referral.campaign({published_referral_campaign: campaign});
  assert.equal(normalized.approved, true);
  assert.deepEqual(normalized.stages, [{label: '实际活动条件', coins: 5}]);
  assert.equal(normalized.cap, 25);
  for (const flag of ['approved', 'enabled', 'public_visible']) {
    normalized = referral.campaign({published_referral_campaign: {...campaign, [flag]: false}});
    assert.equal(normalized.approved, false);
    assert.equal(normalized.stages.length, 0);
    assert.equal(normalized.cap, null);
  }
  assert.equal(referral.campaign({published_referral_campaign: {...campaign, cap: null}}).cap, null);
  assert.equal(referral.campaign({}).approved, false);
});

test('first-level friend page uses actual totals and server binding times without campaign guesses', () => {
  const f = fixture('v132grow/index.js');
  f.page.onLoad();
  assert.equal(f.pending[0].name, 'v11promote');
  assert.equal(f.pending[0].data.page, 1);
  f.pending[0].success({total: 9, today: 2, items: [{member_mask: 'B***2', nickname: '好友', registered_at: 1700000000, bound_at: 1700003600}]});
  assert.equal(f.page.data.direct, 9);
  assert.equal(f.page.data.today, 2);
  assert.equal(f.page.data.items[0].bound, '2023-11-15 07:13');
  assert.equal(f.page.data.rewardInfo.approved, false);
  assert.equal(f.page.data.loaded, true);
});

test('first-level pagination failure retains existing friends and permits retry of the same page', () => {
  const f = fixture('v132grow/index.js');
  f.page.onLoad();
  f.pending[0].success({total: 16, today: 0, items: Array.from({length: 15}, (_, i) => ({member_mask: 'M' + i, registered_at: 1700000000}))});
  f.page.loadMore();
  assert.equal(f.pending[1].data.page, 2);
  f.pending[1].fail();
  assert.equal(f.page.data.items.length, 15);
  assert.equal(f.page.data.page, 2);
  assert.equal(f.page.data.hasMore, true);
  f.page.loadMore();
  f.pending[2].success({items: [{member_mask: 'M15', bound_at: 1700000000}]});
  assert.equal(f.page.data.items.length, 16);
  assert.equal(f.page.data.hasMore, false);
});

test('promotion hub refreshes first-level metrics and hides a revoked campaign', () => {
  const f = fixture('v11/promote.js');
  f.page._alive = true;
  f.page._identityKey = 'owner';
  f.page.setData({rewardInfo: {approved: true, stages: [{label: 'previous', coins: 8}], cap: 8}});
  f.page.refreshMetrics();
  f.pending[0].success({total: 4, today: null, items: []});
  assert.equal(f.page.data.total, 4);
  assert.equal(f.page.data.today, null);
  assert.equal(f.page.data.campaignReady, true);
  assert.equal(f.page.data.rewardInfo.approved, false);
});

test('promotion and first-level records expose the same category-specific rule page', () => {
  const hub = fixture('v11/promote.js');
  hub.page.goReferralRules();
  const friends = fixture('v132grow/index.js');
  friends.page.goRules();
  for (const f of [hub, friends]) assert.equal(f.calls.find(call => call.name === 'navigateTo').args[0].url, '/sage_dksy/pages/v14/rewards/index?category=invite');
});
