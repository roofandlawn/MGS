const optionEl = document.querySelector('#sourceOptions');
const diagramEl = document.querySelector('#oxygenDiagram');
const detailEl = document.querySelector('#oxygenDetail');

const sourceOptions = [
  {
    id: 'primary-secondary',
    name: 'Primary + Secondary Headers',
    label: 'Supply architecture',
    nfpa: ['5.1.3.5.10.3', '5.1.3.5.10.4'],
    purpose: 'A Category 1 gas-cylinder manifold uses two headers arranged so either can serve the system.',
    fieldFocus: 'Think in terms of continuity of supply. One header serves as primary while the other is available to take over; the manifold is not just a collection of cylinders connected to a common pipe.'
  },
  {
    id: 'automatic-changeover',
    name: 'Automatic Changeover',
    label: 'Continuity of supply',
    nfpa: ['5.1.3.5.10.5'],
    purpose: 'The manifold control arrangement automatically transfers supply from the primary header to the secondary header when the primary is depleted.',
    fieldFocus: 'For the 6010 installer, understand the relationship and required function. Detailed regulator adjustment, rebuilding, or manufacturer-specific setup is outside this app scope.'
  },
  {
    id: 'status-alarm',
    name: 'Source Status + Master Alarm',
    label: 'Changeover awareness',
    nfpa: ['5.1.3.5.10.6', '5.1.9.2'],
    purpose: 'The source provides a local visible operating-status signal and communicates the changeover condition to required master alarm panels.',
    fieldFocus: 'This is the bridge between source equipment and the alarm architecture. A source changeover is not only a mechanical event; facility staff must receive the required indication.'
  }
];

const components = [
  {
    id: 'headers',
    name: 'Cylinder Headers',
    label: 'Primary / secondary banks',
    nfpa: ['5.1.3.5.9', '5.1.3.5.10.4'],
    purpose: 'Each header provides the connection path between its cylinder bank and the manifold controls.',
    fieldFocus: 'Know the header as an assembly: cylinder connection points, lead connections, filtration, shutoff, pressure indication, backflow prevention, and intermediate pressure control are part of the source architecture.'
  },
  {
    id: 'header-regulation',
    name: 'Header Pressure Regulation',
    label: 'Intermediate pressure',
    nfpa: ['5.1.3.5.9', '5.1.3.5.10.4'],
    purpose: 'Header regulation reduces cylinder pressure to an intermediate level used by the manifold control arrangement.',
    fieldFocus: 'The field-reference goal is to recognize where this pressure-control stage sits and how it relates to downstream line-pressure regulation—not to teach regulator service.'
  },
  {
    id: 'changeover',
    name: 'Automatic Changeover',
    label: 'Supply transfer',
    nfpa: ['5.1.3.5.10.5'],
    purpose: 'The manifold automatically transfers supply responsibility from the primary header to the secondary header as the primary is depleted.',
    fieldFocus: 'If a source is operating on the secondary header, trace both the mechanical supply path and the source-status/master-alarm indication rather than viewing those as unrelated systems.'
  },
  {
    id: 'line-regulation',
    name: 'Final Line Pressure Controls',
    label: 'Pipeline pressure control',
    nfpa: ['5.1.3.5.5', '5.1.3.5.10.4'],
    purpose: 'Final line pressure controls establish the pressure delivered from the source assembly toward the facility distribution system.',
    fieldFocus: 'Recognize this as the downstream pressure-control stage before the source valve. Manufacturer-specific adjustment and service belong to qualified source-equipment procedures.'
  },
  {
    id: 'relief',
    name: 'Relief Protection',
    label: 'Overpressure protection',
    nfpa: ['5.1.3.5.6', '5.1.3.5.10.4'],
    purpose: 'Relief protection limits the consequences of a regulator or pressure-control failure within the source assembly.',
    fieldFocus: 'Understand which portion of the source is protected and that relief discharge/venting is part of the source design. Do not treat a relief valve as a normal operating control.'
  },
  {
    id: 'local-signal',
    name: 'Local Status Signal',
    label: 'Source condition',
    nfpa: ['5.1.3.5.8', '5.1.3.5.10.6'],
    purpose: 'A visible source signal identifies operating status and supports the required changeover indication.',
    fieldFocus: 'Use this component to connect source-equipment status to the master-alarm module. The app should help the user trace where the signal starts and where it must be displayed.'
  },
  {
    id: 'source-valve',
    name: 'Source Valve',
    label: 'Distribution boundary',
    nfpa: ['5.1.4.2'],
    purpose: 'The source valve is the isolation boundary between the central supply source and the downstream facility distribution piping.',
    fieldFocus: 'This is where the source module hands off to the System Path view. Downstream of this point, think main line, risers, branches, zones, alarms, and terminal units.'
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
      <button type="button" class="oxygen-node ${selectedType === 'component' && selectedId === component.id ? 'active' : ''}" data-oxygen-id="${component.id}">
        <small>${escapeHtml(component.label)}</small>
        <strong>${escapeHtml(component.name)}</strong>
        <span>${escapeHtml(component.nfpa.map(section => `§${section}`).join(' · '))}</span>
      </button>`;
    const arrow = index < components.length - 1 ? '<span class="oxygen-arrow" aria-hidden="true">→</span>' : '';
    return `<div class="oxygen-step">${node}${arrow}</div>`;
  }).join('');

  diagramEl.querySelectorAll('[data-oxygen-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedType = 'component';
      selectedId = button.dataset.oxygenId;
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

  detailEl.innerHTML = `
    <div class="reference-detail-head">
      <div><p class="eyebrow">${selectedType === 'option' ? 'Oxygen manifold concept' : 'Oxygen manifold component'}</p><h2>${escapeHtml(item.name)}</h2></div>
      <span class="verified-badge">2024 map</span>
    </div>
    <section class="reference-section">
      <h3>What it does</h3>
      <p>${escapeHtml(item.purpose)}</p>
    </section>
    <section class="reference-section field-focus">
      <h3>Field focus</h3>
      <p>${escapeHtml(item.fieldFocus)}</p>
      ${item.id === 'source-valve' ? '<p><a class="primary nav-button" href="system-path.html">Continue into facility distribution →</a></p>' : ''}
    </section>
    <section class="reference-section">
      <h3>NFPA 99-2024 map</h3>
      <div class="section-list">${item.nfpa.map(section => `<div><strong>§ ${escapeHtml(section)}</strong><span>Reference location only — consult the adopted licensed code for the full requirement.</span></div>`).join('')}</div>
    </section>
    <div class="field-note"><strong>Scope:</strong> This view teaches source architecture and alarm relationships. It intentionally does not teach cylinder handling, regulator rebuilding, pipe preparation, brazing, or manufacturer-specific source-equipment service.</div>
  `;
}

renderOptions();
renderDiagram();
renderDetail();
