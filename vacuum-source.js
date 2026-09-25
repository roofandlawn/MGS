const diagramEl = document.querySelector('#vacuumDiagram');
const detailEl = document.querySelector('#vacuumDetail');

const components = [
  {
    id: 'facility-pipeline',
    name: 'Facility Vacuum Pipeline',
    label: 'Patient / use side',
    nfpa: ['5.1.3.7', '5.1.5'],
    purpose: 'The distribution system connects medical-surgical vacuum inlets to the central source. In this diagram, we follow the direction of air movement from the facility toward the producer.',
    fieldFocus: 'Keep the system identity clear: medical-surgical vacuum is a dedicated clinical vacuum service. Use the System Path view for the branch, zone, and inlet relationships.'
  },
  {
    id: 'source-valve',
    name: 'Source Shutoff Valve',
    label: 'Source isolation',
    nfpa: ['5.1.3.7.5.3', '5.1.4.2'],
    purpose: 'The source shutoff valve separates the central vacuum source from the facility distribution system.',
    fieldFocus: 'For a 6010 installer, recognize this as the distribution/source boundary and verify that the valve relationship, identification, and accessibility match the adopted project requirements.'
  },
  {
    id: 'filtration',
    name: 'Vacuum Filtration',
    label: 'Patient-side filtration',
    nfpa: ['5.1.3.7.4'],
    purpose: 'Category 1 central vacuum systems other than liquid-ring arrangements use inlet filtration on the patient side of the vacuum producer.',
    fieldFocus: 'The key field concept is service continuity: filtration is arranged so one filter or filter bundle can be isolated for service while the source remains available. Detailed filter servicing belongs to the equipment manufacturer and qualified maintenance personnel.'
  },
  {
    id: 'receiver',
    name: 'Vacuum Receiver',
    label: 'Source stabilization',
    nfpa: ['5.1.3.7.3', '5.1.3.7.5.2'],
    purpose: 'The vacuum receiver is part of the central source architecture and supports stable source operation.',
    fieldFocus: 'Understand the receiver as a serviceable source component. The 2024 arrangement requirements address maintaining medical-surgical vacuum while receiver service is performed.'
  },
  {
    id: 'pumps',
    name: 'Vacuum Pumps',
    label: 'Vacuum production',
    nfpa: ['5.1.3.7.1.1', '5.1.3.7.2', '5.1.3.7.5', '5.1.3.7.6'],
    purpose: 'The pump set creates the suction needed by the medical-surgical vacuum distribution system.',
    fieldFocus: 'Category 1 architecture uses multiple pumps and controls to support continued service with the largest single pump unavailable. Arrangement varies by equipment technology; the app should teach redundancy and isolation, not pump repair.'
  },
  {
    id: 'exhaust',
    name: 'Vacuum Exhaust',
    label: 'Discharge outdoors',
    nfpa: ['5.1.3.7.7'],
    purpose: 'Medical-surgical vacuum pumps discharge through an exhaust system that carries the source air away from occupied areas and the building environment.',
    fieldFocus: 'For field orientation, treat exhaust location, routing, labeling, drainage, and protection from re-entry as source-system issues. Use the adopted code and project documents for the complete installation requirements.'
  }
];

const relatedSourceFunctions = [
  {
    name: 'Electrical power and control',
    nfpa: '5.1.3.7.6',
    summary: 'Controls coordinate pump operation, restart, redundancy, and continued source availability.'
  },
  {
    name: 'Operating alarm',
    nfpa: '5.1.3.7.8',
    summary: 'The source includes an operating alarm condition tied to available pump capacity; alarm behavior belongs in the dedicated Alarms module.'
  }
];

let selectedId = 'pumps';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function renderDiagram() {
  diagramEl.innerHTML = components.map((component, index) => {
    const node = `
      <button type="button" class="vacuum-node ${selectedId === component.id ? 'active' : ''}" data-vacuum-id="${component.id}">
        <small>${escapeHtml(component.label)}</small>
        <strong>${escapeHtml(component.name)}</strong>
        <span>${escapeHtml(component.nfpa.map(section => `§${section}`).join(' · '))}</span>
      </button>`;
    const arrow = index < components.length - 1 ? '<span class="vacuum-arrow" aria-hidden="true">→</span>' : '';
    return `<div class="vacuum-step">${node}${arrow}</div>`;
  }).join('');

  diagramEl.querySelectorAll('[data-vacuum-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.vacuumId;
      renderDiagram();
      renderDetail();
      if (window.matchMedia('(max-width: 900px)').matches) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderDetail() {
  const component = components.find(item => item.id === selectedId);
  if (!component) return;

  detailEl.innerHTML = `
    <div class="reference-detail-head">
      <div><p class="eyebrow">Medical-surgical vacuum source</p><h2>${escapeHtml(component.name)}</h2></div>
      <span class="verified-badge">2024 map</span>
    </div>
    <section class="reference-section">
      <h3>What it does</h3>
      <p>${escapeHtml(component.purpose)}</p>
    </section>
    <section class="reference-section field-focus">
      <h3>Field focus</h3>
      <p>${escapeHtml(component.fieldFocus)}</p>
    </section>
    <section class="reference-section">
      <h3>NFPA 99-2024 map</h3>
      <div class="section-list">${component.nfpa.map(section => `<div><strong>§ ${escapeHtml(section)}</strong><span>Reference location only — consult the adopted licensed code for the full requirement.</span></div>`).join('')}</div>
    </section>
    <section class="reference-section">
      <h3>Related source functions</h3>
      <div class="section-list">${relatedSourceFunctions.map(item => `<div><strong>§ ${escapeHtml(item.nfpa)}</strong><span><b>${escapeHtml(item.name)}:</b> ${escapeHtml(item.summary)}</span></div>`).join('')}</div>
    </section>
    <div class="field-note"><strong>Scope:</strong> This view teaches source architecture and field relationships. It intentionally does not teach vacuum-pump repair, electrical control service, pipe preparation, or brazing technique.</div>
  `;
}

renderDiagram();
renderDetail();
