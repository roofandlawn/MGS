'use strict';
const assert = require('node:assert/strict');
const Review = require('../area-alarm-review.js');
const alarm = (channels, id = 'panel-1') => ({
  id, type: 'Area alarm', location: 'Level 3', equipment: {
    panelZoneId: 'ZVB-3', sensorChannels: channels
  }
});
const testRecords = [
  { id: 'o2-test', type: 'Area alarm functional test', system: 'Oxygen' },
  { id: 'air-test', type: 'Alarm functional test', system: 'Medical air' },
  { id: 'combined', type: 'Area alarm functional test', system: 'Oxygen / Medical air' },
  { id: 'unknown', type: 'Area alarm functional test', system: 'Source' },
  { id: 'pressure', type: 'Pressure test', system: 'Oxygen' }
];
const clean = alarm([
  { sensorService: 'Oxygen', testIds: ['o2-test', 'combined'] },
  { sensorService: 'Medical air', testIds: ['air-test'] }
]);
assert.equal(Review.reviewPanel({ type: 'Master alarm', id: 'master' }, testRecords), null);
assert.equal(Review.reviewPanel(clean, testRecords).flags.length, 0,
  'combined test is compatible with an explicitly identified single-service sensor');
const mismatch = alarm([{ channelLabel: 'O2-1', sensorService: 'Oxygen', testIds: ['air-test'] }]);
assert.deepEqual(Review.reviewPanel(mismatch, testRecords).flags.map(f => f.kind),
  ['gas-mismatch']);
const missing = alarm([{ sensorService: 'Oxygen', testIds: ['deleted-test'] }]);
assert.deepEqual(Review.reviewPanel(missing, testRecords).flags.map(f => f.kind),
  ['missing-test']);
const noLink = alarm([{ sensorService: 'Medical vacuum', testIds: [] }]);
assert.deepEqual(Review.reviewPanel(noLink, testRecords).flags.map(f => f.kind),
  ['no-test-link']);
const unidentified = alarm([{ sensorService: 'Oxygen / Medical air', testIds: ['combined'] }]);
assert.deepEqual(Review.reviewPanel(unidentified, testRecords).flags.map(f => f.kind),
  ['unidentified-service'], 'combined sensor channels are not accepted as identified');
const obscure = alarm([{ sensorService: 'air', testIds: ['unknown'] }]);
assert.deepEqual(Review.reviewPanel(obscure, testRecords).flags.map(f => f.kind),
  ['unidentified-service']);
const testUnknown = alarm([{ sensorService: 'Oxygen', testIds: ['unknown'] }]);
assert.deepEqual(Review.reviewPanel(testUnknown, testRecords).flags.map(f => f.kind),
  ['test-service-unconfirmed']);
const notAnAlarmTest = alarm([{ sensorService: 'Oxygen', testIds: ['pressure'] }]);
assert.deepEqual(Review.reviewPanel(notAnAlarmTest, testRecords).flags.map(f => f.kind),
  ['missing-test']);
assert.deepEqual(Review.reviewPanel({ id: 'p', type: 'Area alarm' }, testRecords).flags.map(f => f.kind),
  ['no-equipment']);
assert.deepEqual(Review.reviewPanel(alarm([]), testRecords).flags.map(f => f.kind),
  ['unidentified-service']);
const rollup = Review.summarize([clean, mismatch, missing, { id: 'm', type: 'Master alarm' }], testRecords);
assert.equal(rollup.areaPanels, 3);
assert.equal(rollup.reviewPanels, 2);
assert.equal(rollup.reviewFlags, 2);
const dangerous = alarm([{ sensorService: 'Oxygen', channelLabel: '<img src=x>',
  testIds: ['air-test'] }], '"><svg onload=evil()>');
dangerous.location = '<script>alert("x")</script>';
const markup = Review.summaryMarkup([dangerous], testRecords);
assert.ok(!markup.includes('<script>') && !markup.includes('<img') && !markup.includes('<svg'));
assert.match(markup, /&lt;script&gt;/);
assert.match(markup, /&lt;img src=x&gt;/);
assert.match(markup, /data-review-target="/);
assert.match(Review.badgeMarkup(mismatch, testRecords), /Needs review \(1\)/);
assert.equal(Review.badgeMarkup(clean, testRecords), '');
console.log('Area alarm Needs Review summary checks passed.');
