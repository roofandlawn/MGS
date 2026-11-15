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
          '<li>' + escapeHtml(flag.detail) + '</li>').join('') +
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

  const api = Object.freeze({ reviewPanel, summarize, matchingReview, normalizeFilter, summaryMarkup, badgeMarkup, FILTERS });
  root.MGSAreaAlarmReview = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
