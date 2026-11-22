/* Foreman-facing review flags for documented area alarm records.
   Advisory only: not an NFPA 99 inspection, acceptance or ASSE 6030 verification. */
(function (root) {
  'use strict';
  const E = root.MGSAreaAlarmEquipment ||
    (typeof module !== 'undefined' && module.exports ? require('./area-alarm-equipment.js') : null);

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }


  // Foreman correction notes are an append-only documentation log, never a
  // compliance decision. The issue remains flagged until the linked records change.
  const CORRECTION_STATUSES = Object.freeze({
    'awaiting-recheck': 'Correction recorded — awaiting recheck',
    'rechecked': 'Rechecked — issue still flagged'
  });

  function correctionFor(record, key) {
    const source = record?.corrections || record?.reviewCorrections || {};
    const events = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : null;
    return Array.isArray(events) ? events.filter(item => item && typeof item === 'object') : [];
  }

  function saveCorrection(alarm, key, input, time = new Date().toISOString()) {
    const issueKey = String(key || '');
    const name = String(input?.foreman || '').trim().slice(0, 120);
    const note = String(input?.note || '').trim().slice(0, 600);
    const status = String(input?.status || '');
    if (!issueKey || issueKey.length > 240 || !name || !note || !Object.prototype.hasOwnProperty.call(CORRECTION_STATUSES, status))
      throw new Error('Enter foreman, correction note and a valid recheck status.');
    if (!/^\d{4}-\d{2}-\d{2}T/.test(String(time)))
      throw new Error('A valid timestamp is required.');
    const old = alarm?.reviewCorrections && typeof alarm.reviewCorrections === 'object'
      && !Array.isArray(alarm.reviewCorrections) ? alarm.reviewCorrections : {};
    const history = correctionFor(alarm, issueKey);
    if (history.length >= 100) throw new Error('Correction history limit reached for this issue.');
    const event = {
      at: String(time), foreman: name, note, status,
      issue: String(input?.issue || '').trim().slice(0, 400)
    };
    return { ...old, [issueKey]: [...history, event] };
  }

  function correctionHistory(record, key) {
    const events = correctionFor(record, key);
    if (!events.length) return '';
    return '<div class="alarm-correction-history"><strong>Foreman correction / recheck log (' +
      events.length + ')</strong><ul>' + events.map(item => {
        const label = CORRECTION_STATUSES[item.status] || 'Status not recognized';
        const stamp = /^\d{4}-\d{2}-\d{2}T/.test(String(item.at || ''))
          ? String(item.at).replace('T', ' ').slice(0, 16) + ' UTC' : 'Date not recorded';
        return '<li><strong>' + escapeHtml(label) + '</strong> — ' +
          escapeHtml(item.foreman) + ', ' + escapeHtml(stamp) +
          ': ' + escapeHtml(item.note) + '</li>';
      }).join('') + '</ul></div>';
  }

  // Group underlying issue kinds for fast field review; do not change source records.
  const FILTERS = Object.freeze([
    { id: 'all', label: 'All review issues', kinds: null },
    { id: 'gas-mismatch', label: 'Gas-service mismatches', kinds: ['gas-mismatch'] },
    { id: 'missing-tests', label: 'Missing or unlinked tests', kinds: ['no-test-link', 'missing-test'] },
    { id: 'unidentified-channels', label: 'Unidentified sensor channels', kinds: ['unidentified-service'] },
    { id: 'unconfirmed-test-service', label: 'Unconfirmed test service', kinds: ['test-service-unconfirmed'] },
    { id: 'missing-equipment', label: 'Missing panel equipment', kinds: ['no-equipment'] }
  ]);

  function normalizeFilter(value) {
    return FILTERS.some(option => option.id === value) ? value : 'all';
  }

  function matchingReview(summary, filter = 'all') {
    const option = FILTERS.find(item => item.id === normalizeFilter(filter));
    const panels = summary.panels
      .map(panel => ({
        ...panel,
        flags: option.kinds ? panel.flags.filter(flag => option.kinds.includes(flag.kind)) : panel.flags
      }))
      .filter(panel => panel.flags.length);
    return {
      filter: option.id, label: option.label, panels,
      reviewPanels: panels.length,
      reviewFlags: panels.reduce((count, panel) => count + panel.flags.length, 0)
    };
  }

  function reviewPanel(alarm, tests = []) {
    if (!alarm || alarm.type !== 'Area alarm') return null;
    const flags = [];
    const add = (kind, detail, key) => flags.push({ kind, detail, key });
    const panel = {
      id: String(alarm.id ?? ''),
      location: String(alarm.location || 'Location not entered'),
      zone: '',
      corrections: alarm.reviewCorrections && typeof alarm.reviewCorrections === 'object' ? alarm.reviewCorrections : {},
      flags
    };
    if (!alarm.equipment || typeof alarm.equipment !== 'object') {
      add('no-equipment', 'Panel equipment and sensor channels have not been documented.', 'panel:no-equipment');
      return panel;
    }

    const record = E.normalize(alarm.equipment);
    panel.zone = record.panelZoneId;
    if (!record.sensorChannels.length) {
      add('unidentified-service', 'No sensor channels have been identified for this panel.', 'panel:no-channels');
      return panel;
    }

    const candidates = new Map(E.alarmTestCandidates(tests)
      .map(test => [String(test.id), test]));
    record.sensorChannels.forEach((channel, index) => {
      const channelKey = 'channel:' + channel.id;
      const label = 'Channel ' + (index + 1) +
        (channel.channelLabel ? ' (' + channel.channelLabel + ')' : '');
      const recognized = E.recognizedServices(channel.sensorService);

      // A channel must represent exactly one explicitly recognized service.
      if (recognized.length !== 1) {
        add('unidentified-service', label +
          ': identify one gas service from the approved point schedule.', channelKey + ':unidentified-service');
      }

      if (!channel.testIds.length) {
        add('no-test-link', label + ': no alarm functional-test record linked.', channelKey + ':no-test-link');
        return;
      }

      channel.testIds.forEach(id => {
        const test = candidates.get(id);
        if (!test) {
          add('missing-test', label + ': a previously linked alarm test record is missing.', channelKey + ':missing-test:' + id);
          return;
        }
        // Avoid duplicating the already displayed unidentified-channel warning.
        if (recognized.length !== 1) return;
        const result = E.serviceLinkAssessment(channel.sensorService, test.system);
        if (result.state === 'mismatch') add('gas-mismatch', label + ': ' + result.message, channelKey + ':gas-mismatch:' + id);
        if (result.state === 'unconfirmed')
          add('test-service-unconfirmed', label + ': ' + result.message, channelKey + ':test-service-unconfirmed:' + id);
      });
    });
    return panel;
  }

  function summarize(alarms, tests = []) {
    const panels = (Array.isArray(alarms) ? alarms : [])
      .map(alarm => reviewPanel(alarm, tests)).filter(Boolean);
    return {
      areaPanels: panels.length,
      reviewPanels: panels.filter(panel => panel.flags.length).length,
      reviewFlags: panels.reduce((count, panel) => count + panel.flags.length, 0),
      panels
    };
  }

  function badgeMarkup(alarm, tests = []) {
    const panel = reviewPanel(alarm, tests);
    if (!panel || !panel.flags.length) return '';
    return '<span class="alarm-review-badge">Needs review (' +
      panel.flags.length + ')</span>';
  }

  function summaryMarkup(alarms, tests = [], filter = 'all') {
    const summary = summarize(alarms, tests);
    if (!summary.areaPanels) {
      return '<div class="alarm-review-summary"><strong>Area alarm review</strong>' +
        '<p>No area alarm panels are recorded for this project.</p></div>';
    }

    const matching = matchingReview(summary, filter);
    const options = FILTERS.map(option =>
      '<option value="' + option.id + '"' +
        (option.id === matching.filter ? ' selected' : '') + '>' +
        escapeHtml(option.label) + '</option>').join('');
    const selector = '<div class="alarm-review-filter"><label for="alarmReviewFilter">' +
      'Filter review issues</label><select id="alarmReviewFilter" aria-controls="alarmReviewResults">' +
      options + '</select></div>';
    const lines = matching.panels.slice(0, 12).map(panel => {
      const label = [panel.zone, panel.location].filter(Boolean).join(' — ');
      const action = panel.id
        ? '<button type="button" class="alarm-review-jump" data-review-target="' +
          escapeHtml(panel.id) + '">' + escapeHtml(label) + '</button>'
        : '<strong>' + escapeHtml(label) + '</strong>';
      return '<li class="alarm-review-panel">' + action +
        '<span>' + panel.flags.length + ' item(s) in selected category</span>' +
        '<ul>' + panel.flags.map(flag =>
          '<li>' + escapeHtml(flag.detail) + correctionHistory(panel, flag.key) +
          '<button type="button" class="alarm-review-edit" data-review-panel="' +
          escapeHtml(panel.id) + '" data-review-key="' + escapeHtml(flag.key) +
          '">Record correction / recheck</button></li>').join('') +
        '</ul></li>';
    }).join('');
    const countText = matching.filter === 'all'
      ? summary.reviewFlags + ' review flag(s): unidentified channels, missing or unlinked tests, and gas-service discrepancies.'
      : 'Showing ' + matching.reviewPanels + ' of ' + summary.reviewPanels +
        ' flagged panels (' + matching.reviewFlags + ' matching issue(s)) for ' +
        matching.label + '.';
    const none = matching.filter === 'all'
      ? 'No review flags detected in recorded panel/channel/test links. This does not establish verification or compliance.'
      : 'No panels match this review category. Other review issues may still exist.';
    return '<div class="alarm-review-summary" aria-live="polite">' +
      '<strong>Needs Review: ' + summary.reviewPanels + ' of ' +
      summary.areaPanels + ' area alarm panels</strong>' +
      selector +
      '<div id="alarmReviewResults"><p>' + escapeHtml(countText) +
      ' Documentation prompts only, not pass/fail or independent verification.</p>' +
      (matching.panels.length ? '<ul class="alarm-review-list">' + lines + '</ul>' +
        (matching.panels.length > 12
          ? '<p>Showing the first 12 of ' + matching.panels.length + ' matching panels.</p>' : '')
        : '<p>' + none + '</p>') + '</div></div>';
  }


  // Read-only turnover summary. Always uses all issues, never the dashboard filter.
  // Show every flagged panel: a printed closeout report must not silently truncate.
  function reportMarkup(alarms, tests = []) {
    const summary = summarize(alarms, tests);
    const heading = '<section class="report-alarm-review">' +
      '<h3>Area alarm documentation — Needs Review</h3>';
    const caution = '<p class="report-alarm-review-note">Documentation prompts only. ' +
      'A missing flag does not establish NFPA 99 compliance, test acceptance, or ' +
      'independent ASSE 6030 verification.</p>';

    if (!summary.areaPanels) {
      return heading + '<p>No area alarm panels recorded for this project.</p>' +
        caution + '</section>';
    }

    const total = '<p><strong>' + summary.reviewPanels + ' of ' +
      summary.areaPanels + ' area alarm panels need review</strong> (' +
      summary.reviewFlags + ' unresolved documentation item(s)).</p>';
    if (!summary.reviewFlags) {
      return heading + total +
        '<p>No review flags detected in the recorded panel/channel/test links.</p>' +
        caution + '</section>';
    }

    const categories = FILTERS.filter(option => option.id !== 'all').map(option => {
      const category = matchingReview(summary, option.id);
      return '<tr><th scope="row">' + escapeHtml(option.label) + '</th>' +
        '<td>' + category.reviewPanels + '</td><td>' +
        category.reviewFlags + '</td></tr>';
    }).join('');
    const breakdown = '<table class="report-alarm-review-categories">' +
      '<thead><tr><th scope="col">Issue category</th>' +
      '<th scope="col">Panels</th><th scope="col">Items</th></tr></thead>' +
      '<tbody>' + categories + '</tbody></table>';

    const panels = summary.panels.filter(panel => panel.flags.length).map(panel => {
      const label = [panel.zone, panel.location].filter(Boolean).join(' — ');
      const details = panel.flags.map(flag =>
        '<li>' + escapeHtml(flag.detail) + correctionHistory(panel, flag.key) + '</li>').join('');
      return '<li class="report-alarm-review-panel"><strong>' +
        escapeHtml(label) + '</strong> (' + panel.flags.length +
        ' item(s))<ul>' + details + '</ul></li>';
    }).join('');
    return heading + total + breakdown +
      '<h4>Open items by panel</h4><ol class="report-alarm-review-panels">' +
      panels + '</ol>' + caution + '</section>';
  }


  // Previously recorded documentation flags that are no longer detected in
  // the current panel/channel/test links. This is NOT a verification or proof
  // that corrective work was performed: deleted/edited records can clear flags.
  // Logs remain attached to existing area alarm records and are read-only here.
  function resolvedIssues(alarms, tests = []) {
    const result = [];
    (Array.isArray(alarms) ? alarms : []).forEach(alarm => {
      const panel = reviewPanel(alarm, tests);
      if (!panel) return;
      const source = alarm.reviewCorrections || alarm.corrections;
      if (!source || typeof source !== 'object' || Array.isArray(source)) return;
      const activeKeys = new Set(panel.flags.map(flag => flag.key));
      Object.keys(source).forEach(key => {
        if (activeKeys.has(key)) return;
        const entries = correctionFor(alarm, key);
        if (!entries.length) return;
        const firstDescription = entries.find(entry =>
          typeof entry.issue === 'string' && entry.issue.trim());
        result.push({
          panelId: panel.id,
          location: [panel.zone, panel.location].filter(Boolean).join(' — '),
          key,
          issue: firstDescription ? firstDescription.issue : 'Previously flagged documentation issue',
          record: alarm
        });
      });
    });
    return result;
  }

  function resolvedMarkup(alarms, tests = []) {
    const items = resolvedIssues(alarms, tests);
    if (!items.length) return '';
    const rows = items.map(item => '<li><strong>' + escapeHtml(item.location) +
      '</strong><p>' + escapeHtml(item.issue) + '</p>' +
      correctionHistory(item.record, item.key) + '</li>').join('');
    return '<details class="alarm-resolved-history"><summary>Resolved Issues History (' +
      items.length + ' no longer flagged)</summary>' +
      '<p>Previously flagged documentation items not detected in the current records. ' +
      'A record edit or deletion may remove a flag; this is not proof of correction, ' +
      'accepted testing, or independent ASSE 6030 verification.</p><ol>' +
      rows + '</ol></details>';
  }

  function resolvedReportMarkup(alarms, tests = []) {
    const items = resolvedIssues(alarms, tests);
    if (!items.length) return '';
    const rows = items.map(item => '<li class="report-alarm-resolved-item"><strong>' +
      escapeHtml(item.location) + '</strong><p>' + escapeHtml(item.issue) +
      '</p>' + correctionHistory(item.record, item.key) + '</li>').join('');
    return '<section class="report-alarm-resolved">' +
      '<h3>Area alarm — Resolved Issues History (documentation only)</h3>' +
      '<p>Previously flagged items no longer detected in the current records. ' +
      'Their disappearance may reflect record edits or deletions, not completed corrective work. ' +
      'This history is not accepted testing, NFPA 99 compliance, or independent ASSE 6030 verification.</p>' +
      '<ol>' + rows + '</ol></section>';
  }

  const api = Object.freeze({ reviewPanel, summarize, matchingReview, normalizeFilter, summaryMarkup, badgeMarkup, reportMarkup, saveCorrection, correctionFor, resolvedIssues, resolvedMarkup, resolvedReportMarkup, CORRECTION_STATUSES, FILTERS });
  root.MGSAreaAlarmReview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
