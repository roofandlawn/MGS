'use strict';
const assert = require('node:assert/strict');
const Review = require('../area-alarm-review.js');
const Audit = require('../project-audit.js');

const tests = [{ id: 'air', type: 'Area alarm functional test', system: 'Medical air' }];
const alarm = {
  id: 'L4-panel-12', type: 'Area alarm', location: 'L4 operating rooms',
  equipment: { panelZoneId: 'ZVB-4', sensorChannels: [
    { id: 'O2-1', channelLabel: 'O2', sensorService: 'Oxygen', testIds: ['air'] }
  ] }
};
const issue = Review.reviewPanel(alarm, tests).flags[0];
assert.equal(issue.kind, 'gas-mismatch');
const corrections = Review.saveCorrection(alarm, issue.key, {
  foreman: 'N. Foreman', status: 'awaiting-recheck',
  note: 'Relabeled channel; test link still needs review.', issue: issue.detail
}, '2026-11-23T16:45:00.000Z');
const first = corrections[issue.key][0];
const original = { id: 'job-1', alarms: [alarm], auditLog: [] };
const log = Audit.recordCorrection(original, alarm, issue.key, first);
assert.equal(original.auditLog.length, 0, 'helper must not mutate stored project');
assert.equal(log.length, 1);
assert.equal(log[0].location, 'L4 operating rooms');
assert.equal(log[0].zoneId, 'ZVB-4');
assert.equal(log[0].foreman, 'N. Foreman');
assert.equal(log[0].status, 'awaiting-recheck');
const annotated = { ...alarm, reviewCorrections: corrections };
const before = { ...original, alarms: [annotated], auditLog: log };
const archived = Audit.archiveAlarmDeletion(before, annotated, tests, '2026-11-23T17:00:00.000Z');
assert.equal(archived.length, 2, 'already mirrored notes must not duplicate on deletion');
assert.equal(archived[0].kind, 'area-alarm-correction');
assert.equal(archived[1].kind, 'alarm-record-deleted');
assert.equal(archived[1].activeIssuesAtDeletion.length, 1);
assert.equal(before.auditLog.length, 1, 'deletion archiver must not mutate project');
assert.equal(before.alarms.length, 1);
const after = { ...before, alarms: [], auditLog: archived };
const dashboard = Audit.historyMarkup(after);
assert.match(dashboard, /Project Audit History \(2 entries\)/);
assert.match(dashboard, /N. Foreman/);
assert.match(dashboard, /Alarm record deleted/);
assert.match(dashboard, /tamper-proof audit trail/);
const printed = Audit.reportMarkup(after);
assert.match(printed, /Relabeled channel/);
assert.match(printed, /L4 operating rooms/);
assert.match(printed, /2026-11-23 17:00 UTC/);
assert.match(printed, /independent ASSE 6030 verification/);
assert.equal(Audit.historyMarkup({auditLog: []}), '');
assert.equal(Audit.reportMarkup({}), '');

// Existing older alarm-attached histories are backfilled when the record is deleted.
const old = { ...alarm, reviewCorrections: corrections };
const oldProject = { id: 'older-job', alarms: [old] };
const legacyArchived = Audit.archiveAlarmDeletion(oldProject, old, tests, '2026-11-23T17:01:00Z');
assert.equal(legacyArchived.length, 2);
assert.equal(legacyArchived[0].origin, 'legacy-archive');
assert.equal(legacyArchived[0].note, first.note);
assert.equal(legacyArchived[1].kind, 'alarm-record-deleted');
assert.equal(oldProject.auditLog, undefined);

// Escaped output protects against hostile data in legacy and imported records.
const injected = {
  ...old, location: '<img src=x onerror=alert(1)>',
  reviewCorrections: { [issue.key]: [{ ...first, note: '<script>alert(1)</script>' }] }
};
const escaped = Audit.reportMarkup({ auditLog:
  Audit.archiveAlarmDeletion({ auditLog: [] }, injected, tests, '2026-11-23T17:02:00Z') });
assert.match(escaped, /&lt;script&gt;/);
assert.match(escaped, /&lt;img src=x/);
assert.ok(!escaped.includes('<script>') && !escaped.includes('<img src=x'));
assert.throws(() => Audit.archiveAlarmDeletion({}, { type: 'Area alarm' }), /record ID/);

// Printed output must include all entries, not truncate at the mobile preview limit.
const many = { auditLog: Array.from({ length: 32 }, (_, i) =>
  ({...log[0], note: 'Audit note ' + i})) };
assert.equal((Audit.reportMarkup(many).match(/class="report-project-audit-item"/g) || []).length, 32);
assert.match(Audit.historyMarkup(many), /Showing latest 25 entries/);

console.log('Project-level area alarm audit retention checks passed.');
