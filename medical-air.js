const diagramEl = document.querySelector('#airDiagram');
const detailEl = document.querySelector('#airDetail');

const components = [
  {
    id: 'air-intake',
    name: 'Air Intake',
    label: 'Source air',
    nfpa: ['5.1.3.6.3'],
    purpose: 'The beginning of the compressor source path. Intake conditions and source-room arrangement affect the air entering the medical-air system.',
    fieldFocus: 'For a 6010 installer, understand where the intake belongs in the source system and how it relates to the compressor package. Use the adopted code and manufacturer documents for the detailed intake requirements.'
  },
  {
    id: 'compressors',
    name: 'Compressors',
    label: 'Compression',
    nfpa: ['5.1.3.6.3.4', '5.1.3.6.3.9'],
    purpose: 'Compressors create the pressure needed to supply the medical-air distribution system.',
    fieldFocus: 'The 2024 source architecture requires multiple compressors for Category 1 medical air and addresses maintaining capacity with the largest single compressor unavailable.'
  },
  {
    id: 'aftercoolers',
    name: 'Aftercoolers',
    label: 'Cooling',
    nfpa: ['5.1.3.6.3.5', '5.1.3.6.3.9'],
    purpose: 'Aftercoolers, where used, remove heat from compressed air before downstream treatment.',
    fieldFocus: 'Know the component relationship and isolation/redundancy concept. Detailed servicing belongs to the manufacturer and qualified source-equipment personnel.'
  },
  {
    id: 'receiver',
    name: 'Air Receiver',
    label: 'Storage / stabilization',
    nfpa: ['5.1.3.6.3.6'],
    purpose: 'The receiver provides compressed-air storage and helps stabilize compressor operation and system demand.',
    fieldFocus: 'Recognize the receiver as source equipment, not as a substitute for an aftercooler or condensate trap.'
  },
  {
    id: 'dryers',
    name: 'Dryers',
    label: 'Moisture control',
    nfpa: ['5.1.3.6.3.3', '5.1.3.6.3.7', '5.1.3.6.3.9'],
    purpose: 'Drying equipment controls moisture so water vapor does not condense in the medical-air distribution system.',
    fieldFocus: 'For field orientation, understand the dryer as a source-quality component and how redundancy supports continued operation during service or a single fault.'
  },
  {
    id: 'filters',
    name: 'Filters',
    label: 'Particulate control',
    nfpa: ['5.1.3.6.3.8', '5.1.3.6.3.9'],
    purpose: 'Medical-air filters condition the air before final downstream pressure regulation and distribution.',
    fieldFocus: 'The key 6010-level takeaway is location in the source path, serviceability, status indication, and relationship to the final-line side of the source.'
  },
  {
    id: 'source-valve',
    name: 'Source Valve',
    label: 'Source isolation',
    nfpa: ['5.1.4.2'],
    purpose: 'The source valve is the isolation point between the central source equipment and the facility medical-air distribution system.',
    fieldFocus: 'This is the handoff from source equipment into the building distribution path. From here, use the System Path view to continue through main, riser, branch, zone, and outlet relationships.'
  }
];

let selectedId = 'compressors';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function renderDiagram() {
  diagramEl.innerHTML = components.map((component, index) => {
    const node = `
      <button type="button" class="air-node ${selectedId === component.id ? 'active' : ''}" data-air-id="${component.id}">
        <small>${escapeHtml(component.label)}</small>
        <strong>${escapeHtml(component.name)}</strong>
        <span>${escapeHtml(component.nfpa.map(section => `§${section}`).join(' · '))}</span>
      </button>`;
    const arrow = index < components.length - 1 ? '<span class="air-arrow" aria-hidden="true">→</span>' : '';
    return `<div class="air-step">${node}${arrow}</div>`;
  }).join('');

  diagramEl.querySelectorAll('[data-air-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.airId;
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
      <div><p class="eyebrow">Medical air source</p><h2>${escapeHtml(component.name)}</h2></div>
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
    <div class="field-note"><strong>Scope:</strong> This view teaches source architecture. It intentionally does not teach compressor repair, electrical controls, pipe preparation, or brazing technique.</div>
  `;
}

renderDiagram();
renderDetail();
