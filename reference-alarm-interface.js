/* Educational manufacturer-document selector; NO field-ready wiring instructions. */
(function alarmInterfaceModule(window) {
  'use strict';

  const docs = Object.freeze({
    unknown: {
      label: 'Unknown model',
      heading: 'No model identified',
      note: 'Start by reading the installed alarm nameplate and matching the actual sensor or transducer part number. Do not assume a wiring system from wire colors.',
      url: null
    },
    tai: {
      label: 'TotalAlert Infinity',
      heading: 'BeaconMedaes TotalAlert Infinity — documentation starting point',
      note: 'The manufacturer provides separate TotalAlert Infinity and Area Alarm documentation. Match the exact installed model, sensor assembly, and manual revision before interpreting any connections.',
      url: 'https://www.beaconmedaes.com/en-us/nfpa-documentation/tai-notification-system-documentation'
    },
    mega3: {
      label: 'MEGA3',
      heading: 'BeaconMedaes MEGA3 — documentation starting point',
      note: 'The manufacturer lists MEGA3 Area Alarm electrical and operations documents. Confirm the exact panel and gas-specific sensor part numbers; another MEGA3 configuration may differ.',
      url: 'https://www.beaconmedaes.com/en-us/nfpa-documentation/mega3-alarm-documentation'
    }
  });

  const evidence = Object.freeze([
    'Photograph or record the panel nameplate: manufacturer, exact model, part number and revision.',
    'Identify each sensor or transducer by part number, gas or vacuum service, and approved panel compatibility.',
    'Obtain the manufacturer installation/electrical drawing and manual revision matching that equipment.',
    'Match each sensor to the approved area/zone and alarm point schedule; confirm the applicable project edition and AHJ requirements.',
    'Have the responsible qualified installer confirm terminals, signal type, polarity, wiring method and power requirements from the actual drawings.',
    'Record the installation checks and arrange required testing and independent medical-gas verification.'
  ]);

  function model(id) { return docs[id] || docs.unknown; }
  function mount(host) {
    if (!host) return false;
    const buttons = Object.entries(docs).map(([id, item]) =>
      '<button type="button" class="alarm-model-button" data-alarm-model="' + id +
      '" aria-pressed="false">' + item.label + '</button>'
    ).join('');
    host.innerHTML =
      '<section class="alarm-interface" aria-label="Manufacturer area alarm connection documentation">' +
      '<h4>Area alarm: manufacturer connection documentation</h4>' +
      '<p>Choose a panel family to locate the correct manufacturer documents. This is a document-finding aid, not a wiring diagram.</p>' +
      '<div class="alarm-model-buttons" role="group" aria-label="Area alarm model family">' + buttons + '</div>' +
      '<div class="alarm-model-detail" data-alarm-selected aria-live="polite"></div>' +
      '<h5>Evidence required before field connection</h5>' +
      '<ol class="alarm-evidence">' + evidence.map(item => '<li>' + item + '</li>').join('') + '</ol>' +
      '<p class="alarm-no-wiring">No terminal numbers, wire-color mappings, polarity assumptions, sensor pairing, or connection approval are provided here. A model-family selection does not establish compatibility, approval, or completed verification.</p>' +
      '</section>';
    const choices = [...host.querySelectorAll('[data-alarm-model]')];
    const detail = host.querySelector('[data-alarm-selected]');
    function show(id) {
      const item = model(id);
      choices.forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.alarmModel === id)));
      detail.textContent = '';
      const heading = document.createElement('strong');
      heading.textContent = item.heading;
      const note = document.createElement('p');
      note.textContent = item.note;
      detail.append(heading, note);
      if (item.url) {
        const link = document.createElement('a');
        link.textContent = 'Open official BeaconMedaes documentation';
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        detail.append(link);
      }
    }
    choices.forEach(button =>
      button.addEventListener('click', () => show(button.dataset.alarmModel)));
    show('unknown');
    return true;
  }
  window.MGSAlarmInterface = Object.freeze({
    models: Object.freeze(Object.keys(docs)), model, evidence, mount
  });
})(window);
