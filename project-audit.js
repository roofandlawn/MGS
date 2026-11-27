/* Project-local area alarm audit history.
   Retains field correction notes after an alarm record is removed.
   Browser storage is mutable and not a tamper-evident or server-backed audit log. */
(function (root) {
  'use strict';
  const Review = root.MGSAreaAlarmReview ||
    (typeof module !== 'undefined' && module.exports ? require('./area-alarm-review.js') : null);

  const str = (value, limit = 600) => String(value ?? '').trim().slice(0, limit);
  const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const eventsFor = project => Array.isArray(project?.auditLog)
    ? project.auditLog.filter(e => e && typeof e === 'object') : [];

  function panelContext(alarm) {
    return {
      alarmId: str(alarm?.id, 120),
      alarmType: str(alarm?.type, 80),
      location: str(alarm?.location, 200),
      zoneId: str(alarm?.equipment?.panelZoneId, 120)
    };
  }

  function correctionEvent(alarm, issueKey, entry, origin = 'field-note') {
    if (!entry || !entry.at || !issueKey) throw new Error('A dated correction and issue key are required.');
    return {
      kind: 'area-alarm-correction',
      origin, ...panelContext(alarm),
      at: str(entry.at, 40), issueKey: str(issueKey, 240),
      issue: str(entry.issue, 400), foreman: str(entry.foreman, 120),
      note: str(entry.note, 600), status: str(entry.status, 40)
    };
  }

  function sameCorrection(a, b) {
    return a?.kind === 'area-alarm-correction' && b?.kind === 'area-alarm-correction' &&
      ['alarmId', 'issueKey', 'at', 'foreman', 'note', 'status'].every(key => a[key] === b[key]);
  }

  // Returns a new array. The caller changes the project only after the
  // alarm-specific correction helper successfully validates the field note.
  function recordCorrection(project, alarm, issueKey, entry) {
    const next = correctionEvent(alarm, issueKey, entry);
    return [...eventsFor(project), next];
  }

  // On deletion, backfill legacy alarm-attached notes that were never mirrored
  // into the project log, then record the deletion. Never discard prior entries.
  function archiveAlarmDeletion(project, alarm, tests = [], at = new Date().toISOString()) {
    if (!alarm?.id) throw new Error('Cannot archive deletion without an alarm record ID.');
    const log = [...eventsFor(project)];
    const corrections = alarm.reviewCorrections || alarm.corrections || {};
    if (corrections && typeof corrections === 'object' && !Array.isArray(corrections)) {
      Object.entries(corrections).forEach(([key, entries]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach(entry => {
          if (!entry || !entry.at) return;
          const archived = correctionEvent(alarm, key, entry, 'legacy-archive');
          if (!log.some(event => sameCorrection(event, archived))) log.push(archived);
        });
      });
    }
    const flags = Review?.reviewPanel?.(alarm, tests)?.flags || [];
    log.push({
      kind: 'alarm-record-deleted', ...panelContext(alarm), at: str(at, 40),
      activeIssuesAtDeletion: flags.map(flag => str(flag.detail, 400)),
      actor: 'Not recorded'
    });
    return log;
  }

  function eventTitle(event) {
    return event.kind === 'alarm-record-deleted' ? 'Alarm record deleted' :
      event.kind === 'area-alarm-correction' ? 'Correction / recheck note' : 'Unknown audit event';
  }
  function eventTime(event) {
    const raw = str(event.at, 40);
    return /^\d{4}-\d{2}-\d{2}T/.test(raw)
      ? raw.replace('T', ' ').slice(0, 16) + ' UTC' : 'Date not recorded';
  }
  function eventItem(event, report = false) {
    const location = [str(event.zoneId, 120), str(event.location, 200)]
      .filter(Boolean).join(' — ') || 'Location not recorded';
    const details = event.kind === 'area-alarm-correction'
      ? '<p><strong>Issue:</strong> ' + escapeHtml(event.issue || event.issueKey) +
        '<br><strong>Field note:</strong> ' + escapeHtml(event.note) +
        '<br><strong>Recorded by:</strong> ' + escapeHtml(event.foreman || 'Not recorded') +
        '<br><strong>Recheck state:</strong> ' + escapeHtml(Review?.CORRECTION_STATUSES?.[event.status] || 'Unrecognized') + '</p>'
      : '<p>Alarm record removed from this project. Person deleting was not recorded.' +
        ((Array.isArray(event.activeIssuesAtDeletion) && event.activeIssuesAtDeletion.length)
          ? '<br><strong>Open documentation flags at deletion:</strong> ' +
            event.activeIssuesAtDeletion.map(escapeHtml).join('; ') : '') + '</p>';
    return '<li' + (report ? ' class="report-project-audit-item"' : '') + '><strong>' +
      escapeHtml(eventTitle(event)) + '</strong> — ' + escapeHtml(location) +
      '<br><small>' + escapeHtml(eventTime(event)) + ' · ' + escapeHtml(event.alarmType || 'Alarm') +
      ' · Record ' + escapeHtml(event.alarmId || '?') + '</small>' + details + '</li>';
  }
  const disclaimer = 'This is a project-local documentation history stored in this browser. ' +
    'It can be edited or erased with device data; it is not a permanent, tamper-proof audit trail, ' +
    'accepted testing, or independent ASSE 6030 verification.';

  function historyMarkup(project) {
    const events = eventsFor(project);
    if (!events.length) return '';
    const recent = [...events].reverse().slice(0, 25);
    return '<details class="project-audit-history"><summary>Project Audit History (' +
      events.length + ' entries)</summary><p>' + disclaimer + '</p>' +
      (events.length > recent.length ? '<p>Showing latest 25 entries. Print the report for all entries.</p>' : '') +
      '<ol>' + recent.map(event => eventItem(event)).join('') + '</ol></details>';
  }

  function reportMarkup(project) {
    const events = eventsFor(project);
    if (!events.length) return '';
    return '<section class="report-project-audit"><h3>Project audit history — area alarm records</h3><p>' +
      disclaimer + '</p><ol>' + events.map(event => eventItem(event, true)).join('') +
      '</ol></section>';
  }

  const api = Object.freeze({ eventsFor, recordCorrection, archiveAlarmDeletion, historyMarkup, reportMarkup });
  root.MGSProjectAudit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
