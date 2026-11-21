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
// Category filtering is a read-only view of the same underlying review flags.
const originalRollup = JSON.stringify(rollup);
assert.equal(Review.normalizeFilter('gas-mismatch'), 'gas-mismatch');
assert.equal(Review.normalizeFilter('<script>'), 'all');
assert.equal(Review.matchingReview(rollup, 'gas-mismatch').reviewPanels, 1);
assert.equal(Review.matchingReview(rollup, 'gas-mismatch').reviewFlags, 1);
assert.equal(Review.matchingReview(rollup, 'missing-tests').reviewPanels, 1);
assert.equal(Review.matchingReview(rollup, 'missing-tests').reviewFlags, 1);
assert.equal(Review.matchingReview(rollup, 'unidentified-channels').reviewPanels, 0);
assert.equal(Review.matchingReview(rollup, 'all').reviewPanels, 2);
assert.deepEqual(Review.matchingReview(
  Review.summarize([unidentified, noLink, testUnknown,
    { id: 'not-equipped', type: 'Area alarm' }], testRecords), 'unidentified-channels'
).panels[0].flags.map(f => f.kind), ['unidentified-service']);
assert.equal(Review.matchingReview(
  Review.summarize([unidentified, noLink, testUnknown,
    { id: 'not-equipped', type: 'Area alarm' }], testRecords), 'unconfirmed-test-service'
).reviewPanels, 1);
assert.equal(Review.matchingReview(
  Review.summarize([unidentified, noLink, testUnknown,
    { id: 'not-equipped', type: 'Area alarm' }], testRecords), 'missing-equipment'
).reviewPanels, 1);
assert.equal(JSON.stringify(rollup), originalRollup, 'Filtering must not mutate review records');
const filteredMarkup = Review.summaryMarkup([mismatch, missing], testRecords, 'missing-tests');
assert.match(filteredMarkup, /id="alarmReviewFilter"/);
assert.match(filteredMarkup, /value="missing-tests" selected/);
assert.match(filteredMarkup, /Showing 1 of 2 flagged panels/);
assert.match(filteredMarkup, /previously linked alarm test record is missing/);
assert.doesNotMatch(filteredMarkup, /Gas-service mismatch:/);
const noMatchesMarkup = Review.summaryMarkup([mismatch], testRecords, 'missing-tests');
assert.match(noMatchesMarkup, /No panels match this review category/);
assert.match(noMatchesMarkup, /Needs Review: 1 of 1/);
assert.match(Review.summaryMarkup([mismatch], testRecords, 'invalid'), /value="all" selected/);
assert.equal(Review.FILTERS.length, 6);
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

// The printed report is an unfiltered, complete, escaped turnover snapshot.
const turnover = Review.reportMarkup([clean, mismatch, missing], testRecords);
assert.match(turnover, /2 of 3 area alarm panels need review/);
assert.match(turnover, /2 unresolved documentation item/);
assert.match(turnover, /Gas-service mismatches/);
assert.match(turnover, /Missing or unlinked tests/);
assert.match(turnover, /Open items by panel/);
assert.match(turnover, /previously linked alarm test record is missing/);
assert.equal((turnover.match(/class="report-alarm-review-panel"/g) || []).length, 2);
assert.doesNotMatch(turnover, /alarmReviewFilter|data-review-target/);
const cleanTurnover = Review.reportMarkup([clean], testRecords);
assert.match(cleanTurnover, /0 of 1 area alarm panels need review/);
assert.match(cleanTurnover, /No review flags detected/);
assert.doesNotMatch(cleanTurnover, /Open items by panel/);
assert.match(Review.reportMarkup([], []), /No area alarm panels recorded/);
const dangerousTurnover = Review.reportMarkup([dangerous], testRecords);
assert.match(dangerousTurnover, /&lt;script&gt;/);
assert.match(dangerousTurnover, /&lt;img src=x&gt;/);
assert.ok(!dangerousTurnover.includes('<script') && !dangerousTurnover.includes('<img'));
const many = Array.from({ length: 14 }, (_, index) =>
  alarm([{ sensorService: 'Oxygen', testIds: ['air-test'] }], 'panel-' + index));
assert.equal((Review.reportMarkup(many, testRecords)
  .match(/class="report-alarm-review-panel"/g) || []).length, 14,
  'Printable turnover must include every flagged panel, not dashboard first-twelve cap');

// Dated foreman updates are append-only and NEVER clear a live documentation flag.
const key = Review.reviewPanel(mismatch, testRecords).flags[0].key;
assert.equal(key, 'channel:channel-1:gas-mismatch:air-test');
assert.equal(Review.correctionFor(mismatch, key).length, 0);
const firstNote = Review.saveCorrection(mismatch, key, {
  foreman: 'Foreman A', note: 'Corrected labels; pending new functional-test link.',
  status: 'awaiting-recheck', issue: 'Oxygen versus medical-air mismatch'
}, '2026-11-21T16:00:00.000Z');
assert.equal(mismatch.reviewCorrections, undefined, 'Pure correction helper must not mutate source');
const annotated = { ...mismatch, reviewCorrections: firstNote };
const secondNote = Review.saveCorrection(annotated, key, {
  foreman: 'Foreman B', note: 'Rechecked: existing test still needs reconciliation.',
  status: 'rechecked', issue: 'Oxygen versus medical-air mismatch'
}, '2026-11-21T16:30:00.000Z');
const withHistory = { ...mismatch, reviewCorrections: secondNote };
assert.equal(Review.correctionFor(withHistory, key).length, 2);
assert.equal(Review.correctionFor(withHistory, key)[0].note,
  'Corrected labels; pending new functional-test link.');
assert.deepEqual(Review.reviewPanel(withHistory, testRecords).flags.map(flag => flag.kind),
  ['gas-mismatch'], 'Foreman recheck cannot clear the live mismatch');
const dashboardWithHistory = Review.summaryMarkup([withHistory], testRecords);
assert.match(dashboardWithHistory, /Record correction \/ recheck/);
assert.match(dashboardWithHistory, /data-review-key="channel:channel-1:gas-mismatch:air-test"/);
assert.match(dashboardWithHistory, /Foreman A/);
assert.match(dashboardWithHistory, /Foreman B/);
assert.match(dashboardWithHistory, /2\)\<\/strong\>/);
const reportWithHistory = Review.reportMarkup([withHistory], testRecords);
assert.match(reportWithHistory, /Rechecked — issue still flagged/);
assert.match(reportWithHistory, /Corrected labels/);
assert.match(reportWithHistory, /2026-11-21 16:30 UTC/);
assert.match(reportWithHistory, /1 unresolved documentation item/);
assert.throws(() => Review.saveCorrection(withHistory, key, {
  foreman: 'A', note: '', status: 'rechecked'
}), /Enter foreman/);
assert.throws(() => Review.saveCorrection(withHistory, key, {
  foreman: 'A', note: 'Something', status: 'verified'
}), /valid recheck status/);
const maliciousNote = Review.saveCorrection(mismatch, key, {
  foreman: '<img src=x>', note: '<script>alert(1)</script>', status: 'rechecked'
}, '2026-11-21T17:00:00Z');
const safeNotes = Review.reportMarkup([
  { ...mismatch, reviewCorrections: maliciousNote }
], testRecords);
assert.match(safeNotes, /&lt;script&gt;/);
assert.match(safeNotes, /&lt;img src=x&gt;/);
assert.ok(!safeNotes.includes('<script>') && !safeNotes.includes('<img src=x>'));

console.log('Area alarm Needs Review summary checks passed.');
