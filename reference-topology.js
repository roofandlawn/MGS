/* MGS medical-gas relationship explorer: educational non-anesthetizing topology only. */
(function topologyModule(window) {
  'use strict';
  // Teaching models: non-anesthetizing Category 1 examples only.
  // They are topology illustrations, not permitted designs or field schematics.
  const node = (id, x, y, w, lines, kind, note) =>
    ({ id, x, y, w, h: 62, lines, kind, note });
  const diagrams = Object.freeze({
    single: {
      label: 'One room',
      heading: 'Individual room — one illustrated zone',
      summary: 'A single zone valve feeds a patient area. The sensor is represented on the patient side of the valve, with a separate signal connection to the area alarm.',
      warning: 'Concept only. Room classification, gas service, valve location, alarm sensing and approved drawings determine the real arrangement.',
      sequence: 'Supply branch → zone valve → downstream alarm sensor → Room A outlets. Sensor signal → area alarm.',
      nodes: [
        node('feed', 24, 210, 140, ['Supply', 'branch'], 'supply', 'Upstream distribution serving the depicted zone.'),
        node('valve', 215, 210, 132, ['Zone valve', 'box'], 'valve', 'The depicted zone isolation point. Confirm the actual area served on approved plans.'),
        node('sensor', 405, 210, 136, ['Area alarm', 'sensor'], 'sensor', 'Illustrative pressure/vacuum sensing point on the patient/use side of the zone valve.'),
        node('outlets', 635, 210, 140, ['Room A', 'outlets / inlets'], 'outlet', 'Illustrated terminal devices downstream of the zone valve.'),
        node('alarm', 401, 34, 146, ['Area alarm', 'display'], 'alarm', 'Displays monitored conditions from sensor input. Signal line is not a medical gas pipe.')
      ],
      links: [
        { kind: 'pipe', d: 'M164 241 H215' },
        { kind: 'pipe', d: 'M347 241 H405' },
        { kind: 'pipe', d: 'M541 241 H635' },
        { kind: 'signal', d: 'M473 210 V96' }
      ]
    },
    shared: {
      label: 'Two rooms / one zone',
      heading: 'Shared zone — two illustrated rooms',
      summary: 'One upstream zone valve and its patient-side sensor precede a downstream split toward two rooms. This explains a shared-zone branch, not whether a particular pair of rooms may share that zone.',
      warning: 'A shared zone is NOT automatically permitted for any two rooms. Verify the actual room classifications, grouping restrictions, adopted edition and approved plans before field application.',
      sequence: 'Supply branch → zone valve → downstream alarm sensor → split → Room A outlets and Room B outlets. Sensor signal → area alarm.',
      nodes: [
        node('feed', 24, 210, 140, ['Supply', 'branch'], 'supply', 'Illustrative common supply feeding this example zone.'),
        node('valve', 211, 210, 132, ['Zone valve', 'box'], 'valve', 'One isolation point is shown as a hypothetical shared zone. Not evidence this room grouping is permitted.'),
        node('sensor', 396, 210, 136, ['Area alarm', 'sensor'], 'sensor', 'Illustrative downstream sensor before the branch to two rooms.'),
        node('room-a', 643, 140, 140, ['Room A', 'outlets / inlets'], 'outlet', 'First depicted room on a common downstream zone.'),
        node('room-b', 643, 300, 140, ['Room B', 'outlets / inlets'], 'outlet', 'Second depicted room on a common downstream zone.'),
        node('alarm', 388, 34, 152, ['Area alarm', 'display'], 'alarm', 'Illustrated signal endpoint, not a wiring termination drawing.')
      ],
      links: [
        { kind: 'pipe', d: 'M164 241 H211' },
        { kind: 'pipe', d: 'M343 241 H396' },
        { kind: 'pipe', d: 'M532 241 H593 V171 H643' },
        { kind: 'pipe', d: 'M593 241 V331 H643' },
        { kind: 'signal', d: 'M464 210 V96' }
      ]
    },
    separate: {
      label: 'Two separate zones',
      heading: 'Common supply — two independently illustrated zones',
      summary: 'The common upstream supply splits before two zone valve boxes. Each zone has its own illustrated downstream sensor and separate signal to the area alarm display.',
      warning: 'This depicts distinct sensing paths, not sensor quantity, room boundaries, alarm panel capacity, wire routing or an approved installation.',
      sequence: 'Supply → branch split → Zone A valve → Sensor A → Room A. Split → Zone B valve → Sensor B → Room B. Both sensor signals feed separate illustrated alarm inputs.',
      nodes: [
        node('feed', 20, 217, 131, ['Supply', 'branch'], 'supply', 'One common upstream supply branches into two illustrated zones.'),
        node('valve-a', 225, 145, 130, ['Zone A', 'valve box'], 'valve', 'Isolates the illustrated Zone A.'),
        node('sensor-a', 412, 145, 132, ['Sensor A', '(patient side)'], 'sensor', 'Illustrative sensor downstream of the Zone A valve.'),
        node('room-a', 648, 145, 135, ['Room A', 'outlets / inlets'], 'outlet', 'Terminals in Zone A.'),
        node('valve-b', 225, 307, 130, ['Zone B', 'valve box'], 'valve', 'Isolates the illustrated Zone B.'),
        node('sensor-b', 412, 307, 132, ['Sensor B', '(patient side)'], 'sensor', 'Illustrative sensor downstream of the Zone B valve.'),
        node('room-b', 648, 307, 135, ['Room B', 'outlets / inlets'], 'outlet', 'Terminals in Zone B.'),
        node('alarm', 629, 24, 154, ['Area alarm', 'inputs A + B'], 'alarm', 'Two conceptual monitoring inputs, not a manufacturer wiring diagram.')
      ],
      links: [
        { kind: 'pipe', d: 'M151 248 H188 V176 H225' },
        { kind: 'pipe', d: 'M188 248 V338 H225' },
        { kind: 'pipe', d: 'M355 176 H412' },
        { kind: 'pipe', d: 'M544 176 H648' },
        { kind: 'pipe', d: 'M355 338 H412' },
        { kind: 'pipe', d: 'M544 338 H648' },
        { kind: 'signal', d: 'M478 145 V55 H629' },
        { kind: 'signal', d: 'M478 307 H607 V77 H629' }
      ]
    }
  });

  const xml = value => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#39;");

  function allowed(guide) {
    return guide?.state === 'public-source-summary'
      && (guide.edition === '2018' || guide.edition === '2024');
  }
  function describe(modeId) {
    return diagrams[modeId] || null;
  }
  function svgFor(modeId) {
    const mode = describe(modeId);
    if (!mode) return '';
    const links = mode.links.map(link =>
      `<path class="topology-line topology-${link.kind}" data-topology-link="${link.kind}" d="${xml(link.d)}" />`
    ).join('');
    const nodes = mode.nodes.map(n => {
      const center = n.x + n.w / 2;
      const labelY = n.y + 25;
      const labels = n.lines.map((line,i) =>
        `<text x="${center}" y="${labelY + i*17}" text-anchor="middle">${xml(line)}</text>`
      ).join('');
      return `<g class="topology-node topology-${n.kind}" data-topology-node="${xml(n.id)}"
          role="button" tabindex="0" aria-label="${xml(n.lines.join(' ') + ': ' + n.note)}">
        <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" />
        ${labels}
      </g>`;
    }).join('');
    return `<svg class="topology-svg" viewBox="0 0 800 405"
        xmlns="http://www.w3.org/2000/svg" role="group"
        aria-label="${xml(mode.heading)}. Solid lines represent conceptual gas piping; dashed lines represent sensor signals.">
      <title>${xml(mode.heading)}</title>${links}${nodes}</svg>`;
  }
  function mount(host, guide) {
    if (!host) return false;
    if (!allowed(guide)) {
      host.textContent = '';
      return false;
    }
    const choices = Object.entries(diagrams).map(([id, mode]) =>
      `<button type="button" class="topology-mode" data-topology-mode="${id}"
         aria-pressed="false">${xml(mode.label)}</button>`
    ).join('');
    host.innerHTML = `<div class="topology-panel">
      <h4>Interactive relationship drawing — non-anesthetizing Category 1 concepts</h4>
      <p class="topology-intro">Choose an example, then select any drawing component to learn its role.
      Solid line = conceptual piping. Dashed line = monitoring signal.</p>
      <div class="topology-modes" role="group" aria-label="Choose relationship drawing">${choices}</div>
      <div class="topology-viewport" tabindex="0" aria-label="Scrollable relationship drawing" data-topology-view></div>
      <p class="topology-summary" data-topology-summary></p>
      <p class="topology-node-note" aria-live="polite" data-topology-explain></p>
      <p class="topology-warning" data-topology-warning></p>
      <p class="topology-sequence" data-topology-sequence></p>
      <p class="topology-disclaimer">Illustration only, not an approved installation, wiring diagram or verification test.
      Anesthetizing locations require separate edition-specific review. Confirm the adopted licensed
      NFPA 99 edition, AHJ amendments and project drawings.</p>
    </div>`;
    const buttons = [...host.querySelectorAll('[data-topology-mode]')];
    const canvas = host.querySelector('[data-topology-view]');
    const explanation = host.querySelector('[data-topology-explain]');
    function selectNode(id, mode) {
      const item = mode.nodes.find(n => n.id === id);
      if (!item) return;
      canvas.querySelectorAll('[data-topology-node]').forEach(n =>
        n.classList.toggle('is-selected', n.getAttribute('data-topology-node') === id));
      explanation.textContent = item.lines.join(' ') + ': ' + item.note;
    }
    function show(modeId) {
      const mode = describe(modeId);
      if (!mode) return;
      buttons.forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.topologyMode === modeId)));
      canvas.innerHTML = svgFor(modeId);
      host.querySelector('[data-topology-summary]').textContent = mode.summary;
      host.querySelector('[data-topology-warning]').textContent = mode.warning;
      host.querySelector('[data-topology-sequence]').textContent = 'Text-only path: ' + mode.sequence;
      canvas.querySelectorAll('[data-topology-node]').forEach(el => {
        el.addEventListener('click', () => selectNode(el.getAttribute('data-topology-node'), mode));
        el.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectNode(el.getAttribute('data-topology-node'), mode);
          }
        });
      });
      const firstValve = mode.nodes.find(n => n.kind === 'valve');
      if (firstValve) selectNode(firstValve.id, mode);
    }
    buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.topologyMode)));
    show('single');
    return true;
  }
  window.MGSTopologyDiagrams = Object.freeze({
    modes: Object.freeze(Object.keys(diagrams)), allowed, describe, svgFor, mount
  });
})(window);
