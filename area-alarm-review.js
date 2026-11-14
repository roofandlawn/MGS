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

  function reviewPanel(alarm, tests = []) {
    if (!alarm || alarm.type !== 'Area alarm') return null;
    const flags = [];
    const add = (kind, detail) => flags.push({ kind, detail });
    const panel = {
      id: String(alarm.id ?? ''),
      location: String(alarm.location || 'Location not entered'),
      zone: '',
      flags
    };
    if (!alarm.equipment || typeof alarm.equipment !== 'object') {
      add('no-equipment', 'Panel equipment and sensor channels have not been documented.');
      return panel;
    }

    const record = E.normalize(alarm.equipment);
    panel.zone = record.panelZoneId;
    if (!record.sensorChannels.length) {
      add('unidentified-service', 'No sensor channels have been identified for this panel.');
      return panel;
    }

    const candidates = new Map(E.alarmTestCandidates(tests)
      .map(test => [String(test.id), test]));
    record.sensorChannels.forEach((channel, index) => {
      const label = 'Channel ' + (index + 1) +
        (channel.channelLabel ? ' (' + channel.channelLabel + ')' : '');
      const recognized = E.recognizedServices(channel.sensorService);

      // A channel must represent exactly one explicitly recognized service.
      if (recognized.length !== 1) {
        add('unidentified-service', label +
          ': identify one gas service from the approved point schedule.');
      }

      if (!channel.testIds.length) {
        add('no-test-link', label + ': no alarm functional-test record linked.');
        return;
      }

      channel.testIds.forEach(id => {
        const test = candidates.get(id);
        if (!test) {
          add('missing-test', label + ': a previously linked alarm test record is missing.');
          return;
        }
        // Avoid duplicating the already displayed unidentified-channel warning.
        if (recognized.length !== 1) return;
        const result = E.serviceLinkAssessment(channel.sensorService, test.system);
        if (result.state === 'mismatch') add('gas-mismatch', label + ': ' + result.message);
        if (result.state === 'unconfirmed')
          add('test-service-unconfirmed', label + ': ' + result.message);
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

  function summaryMarkup(alarms, tests = []) {
    const summary = summarize(alarms, tests);
    if (!summary.areaPanels) {
      return '<div class="alarm-review-summary"><strong>Area alarm review</strong>' +
        '<p>No area alarm panels are recorded for this project.</p></div>';
    }
    const flagged = summary.panels.filter(panel => panel.flags.length);
    const lines = flagged.slice(0, 12).map(panel => {
      const label = [panel.zone, panel.location].filter(Boolean).join(' — ');
      const action = panel.id
        ? '<button type="button" class="alarm-review-jump" data-review-target="' +
          escapeHtml(panel.id) + '">' + escapeHtml(label) + '</button>'
        : '<strong>' + escapeHtml(label) + '</strong>';
      return '<li class="alarm-review-panel">' + action +
        '<span>' + panel.flags.length + ' item(s) to review</span>' +
        '<ul>' + panel.flags.map(flag =>
          '<li>' + escapeHtml(flag.detail) + '</li>').join('') +
        '</ul></li>';
    }).join('');
    return '<div class="alarm-review-summary" aria-live="polite">' +
      '<strong>Needs Review: ' + summary.reviewPanels + ' of ' +
      summary.areaPanels + ' area alarm panels</strong>' +
      '<p>' + summary.reviewFlags + ' review flag(s): unidentified channels, missing or unlinked tests, and gas-service discrepancies. These are documentation prompts, not pass/fail or independent verification.</p>' +
      (flagged.length ? '<ul class="alarm-review-list">' + lines + '</ul>' +
        (flagged.length > 12 ? '<p>Showing the first 12 flagged panels.</p>' : '')
        : '<p>No review flags detected in recorded panel/channel/test links. This does not establish verification or compliance.</p>') +
      '</div>';
  }

  const api = Object.freeze({ reviewPanel, summarize, summaryMarkup, badgeMarkup });
  root.MGSAreaAlarmReview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
