const optionEl = document.querySelector('#sourceOptions');
const diagramEl = document.querySelector('#nitrousDiagram');
const detailEl = document.querySelector('#nitrousDetail');

const sourceOptions = [
  {
    id: 'source-architecture',
    name: 'Cylinder Manifold Source',
    label: 'Source architecture',
    nfpa: ['5.1.3.5', '5.1.3.5.10'],
    purpose: 'Nitrous oxide can be supplied from a central gas-cylinder manifold using primary and secondary headers, pressure controls, automatic changeover, and source-status signaling.',
    fieldFocus: 'For a new tech or 6010 installer, first recognize the whole source path. Do not think of the manifold as only cylinder connections; the controls, relief protection, status indication, and source isolation are part of the source relationship.'
  },
  {
    id: 'service-identity',
    name: 'N₂O Service Identity',
    label: 'Identification',
    nfpa: ['5.1.11'],
    purpose: 'Nitrous oxide has a distinct service abbreviation, color designation, and standard operating-pressure range in the NFPA 99 identification table.',
    fieldFocus: 'Use identification as a cross-check throughout the path: source labeling, piping labels, valves, alarms, and outlets should all point to the same N₂O service. A color alone is never a substitute for complete system identification.'
  },
  {
    id: 'alarm-relationship',
    name: 'Source Status + Master Alarm',
    label: 'Changeover awareness',
    nfpa: ['5.1.3.5.8', '5.1.3.5.10.6', '5.1.9.2'],
    purpose: 'The source provides local operating-status indication and communicates required source conditions into the facility master-alarm architecture.',
    fieldFocus: 'When the manifold changes supply status, trace both sides of the event: what the source equipment is doing and what indication reaches the required master alarm locations.'
  },
  {
    id: 'verification',
    name: 'Verification Checkpoints',
    label: 'After installation',
    nfpa: ['5.1.12.4.10', '5.1.12.4.11'],
    purpose: 'Nitrous oxide outlets and gas identity are part of the verifier testing sequence after installation or qualifying system work.',
    fieldFocus: 'The app should help the installer know what must be ready for the verifier: the correct service path, identified outlets, stable operating condition, and access to the test points and records required by the project. NFPA 99-2024 lists nitrous oxide USP at not less than 99 percent N₂O in the gas-concentration table.'
  }
];

const components = [
  {
    id: 'source-location',
    name: 'Source Location',
    label: 'Manifold room / enclosure',
    nfpa: ['5.1.3.3.1', '5.1.3.3.2', '5.1.3.5.10.1', '5.1.3.5.10.2'],
    purpose: 'The manifold begins in a dedicated source location or enclosure that is part of the medical-gas source design.',
    fieldFocus: 'Recognize source-location requirements as part of the system, not as an afterthought. Verify the project layout and listed equipment requirements before installing or modifying source piping.'
  },
  {
    id: 'headers',
    name: 'Primary + Secondary Headers',
    label: 'Cylinder banks',
    nfpa: ['5.1.3.5.9', '5.1.3.5.10.3', '5.1.3.5.10.4'],
    purpose: 'The two headers provide alternate supply paths so either bank can serve the downstream manifold controls.',
    fieldFocus: 'Think of each header as an assembly with its cylinder connections, isolation, pressure indication, backflow protection, filtration, and pressure-control relationship.'
  },
  {
    id: 'changeover',
    name: 'Automatic Changeover',
    label: 'Supply transfer',
    nfpa: ['5.1.3.5.10.5'],
    purpose: 'The manifold automatically transfers supply responsibility from the primary header to the secondary header as the primary supply is depleted.',
    fieldFocus: 'The installer should understand the intended operating sequence and alarm relationship. Manufacturer-specific adjustment, rebuilding, and regulator service remain outside this app scope.'
  },
  {
    id: 'line-regulation',
    name: 'Final Line Pressure Controls',
    label: 'Pipeline pressure control',
    nfpa: ['5.1.3.5.5', '5.1.3.5.10.4'],
    purpose: 'Final line pressure controls establish the pressure delivered from the source assembly toward the N₂O distribution piping.',
    fieldFocus: 'Recognize the downstream pressure-control stage and its relationship to the source valve. NFPA 99-2024 Table 5.1.11 identifies the standard N₂O service range as 50–55 psi gauge.'
  },
  {
    id: 'relief',
    name: 'Relief Protection',
    label: 'Overpressure protection',
    nfpa: ['5.1.3.5.6', '5.1.3.5.10.4'],
    purpose: 'Relief protection limits the consequences of a regulator or pressure-control failure inside the source assembly.',
    fieldFocus: 'Know which portion of the source is protected and where relief discharge belongs in the source design. A relief valve is protection, not a normal pressure-control device.'
  },
  {
    id: 'local-signal',
    name: 'Local Status Signal',
    label: 'Source condition',
    nfpa: ['5.1.3.5.8', '5.1.3.5.10.6'],
    purpose: 'A visible local signal identifies source operating status and supports the required changeover indication.',
    fieldFocus: 'Use this point to connect the source equipment to the alarm architecture. The local status display and the remote master-alarm indication are related but are not the same device.'
  },
  {
    id: 'source-valve',
    name: 'Source Valve',
    label: 'Distribution boundary',
    nfpa: ['5.1.4.2'],
    purpose: 'The source valve is the isolation boundary between the nitrous oxide central supply source and the downstream facility distribution system.',
    fieldFocus: 'From here, continue the N₂O path through main, riser, service, and zone isolation; area-alarm monitoring where required; and the gas-specific station outlets.'
  }
];

let selectedType = 'component';
let selectedId = 'changeover';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function renderOptions() {
  optionEl.innerHTML = sourceOptions.map(option => `
    <button type="button" class="source-option ${selectedType === 'option' && selectedId === option.id ? 'active' : ''}" data-option-id="${option.id}">
      <small>${escapeHtml(option.label)}</small>
      <strong>${escapeHtml(option.name)}</strong>
      <span>${escapeHtml(option.nfpa.map(section => `§${section}`).join(' · '))}</span>
    </button>
  `).join('');

  optionEl.querySelectorAll('[data-option-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedType = 'option';
      selectedId = button.dataset.optionId;
      renderOptions();
      renderDiagram();
      renderDetail();
      if (window.matchMedia('(max-width: 900px)').matches) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderDiagram() {
  diagramEl.innerHTML = components.map((component, index) => {
    const node = `
      <button type="button" class="oxygen-node ${selectedType === 'component' && selectedId === component.id ? 'active' : ''}" data-nitrous-id="${component.id}">
        <small>${escapeHtml(component.label)}</small>
        <strong>${escapeHtml(component.name)}</strong>
        <span>${escapeHtml(component.nfpa.map(section => `§${section}`).join(' · '))}</span>
      </button>`;
    const arrow = index < components.length - 1 ? '<span class="oxygen-arrow" aria-hidden="true">→</span>' : '';
    return `<div class="oxygen-step">${node}${arrow}</div>`;
  }).join('');

  diagramEl.querySelectorAll('[data-nitrous-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedType = 'component';
      selectedId = button.dataset.nitrousId;
      renderOptions();
      renderDiagram();
      renderDetail();
      if (window.matchMedia('(max-width: 900px)').matches) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderDetail() {
  const item = selectedType === 'option'
    ? sourceOptions.find(entry => entry.id === selectedId)
    : components.find(entry => entry.id === selectedId);
  if (!item) return;

  const continueLink = item.id === 'source-valve'
    ? '<p><a class="primary nav-button" href="system-path.html">Continue into the N₂O distribution path →</a></p>'
    : '';

  detailEl.innerHTML = `
    <div class="reference-detail-head">
      <div><p class="eyebrow">${selectedType === 'option' ? 'Nitrous oxide source concept' : 'Nitrous oxide source component'}</p><h2>${escapeHtml(item.name)}</h2></div>
      <span class="verified-badge">2024 map</span>
    </div>
    <section class="reference-section">
      <h3>What it does</h3>
      <p>${escapeHtml(item.purpose)}</p>
    </section>
    <section class="reference-section field-focus">
      <h3>Field focus</h3>
      <p>${escapeHtml(item.fieldFocus)}</p>
      ${continueLink}
    </section>
    <section class="reference-section">
      <h3>NFPA 99-2024 map</h3>
      <div class="section-list">${item.nfpa.map(section => `<div><strong>§ ${escapeHtml(section)}</strong><span>Reference location only — consult the adopted licensed code for the full requirement.</span></div>`).join('')}</div>
    </section>
    <div class="field-note"><strong>Scope:</strong> This page teaches source architecture, service identity, and alarm/testing relationships. It intentionally does not teach cylinder handling, regulator rebuilding, pipe preparation, brazing, or manufacturer-specific source-equipment service.</div>
  `;
}

renderOptions();
renderDiagram();
renderDetail();
