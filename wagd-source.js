const optionEl = document.querySelector('#sourceOptions');
const diagramEl = document.querySelector('#wagdDiagram');
const detailEl = document.querySelector('#wagdDetail');

const sourceOptions = [
  {
    id: 'shared-vacuum',
    name: 'Medical-Surgical Vacuum Source',
    label: 'Shared source option',
    nfpa: ['5.1.3.8.1.1', '5.1.3.8.1.2'],
    purpose: 'WAGD can be produced through the medical-surgical vacuum source when the additional WAGD requirements for that arrangement are satisfied.',
    fieldFocus: 'This is the point where the two systems can interact. Keep service identity and source-capacity considerations clear; the WAGD terminal and piping service are still not interchangeable with medical-surgical vacuum.',
    deepLink: '<p><a class="primary nav-button" href="vacuum-source.html">Open medical-surgical vacuum source →</a></p>'
  },
  {
    id: 'dedicated-producer',
    name: 'Dedicated WAGD Producer',
    label: 'Central dedicated option',
    nfpa: ['5.1.3.8.1.3', '5.1.3.8.1.4', '5.1.3.8.1.6', '5.1.3.8.2'],
    purpose: 'A dedicated producer creates the suction or flow used only for WAGD service.',
    fieldFocus: 'For Category 1 central systems, focus on producer count/capacity, isolation, backflow prevention, controls, alarm relationships, and exhaust. Equipment location requirements vary with the source arrangement and total producer power.',
    deepLink: ''
  },
  {
    id: 'venturi',
    name: 'Venturi Source',
    label: 'Alternative source option',
    nfpa: ['5.1.3.8.1.1', '5.1.3.8.1.7'],
    purpose: 'A venturi can provide the motive force for WAGD using an allowed dedicated driving medium.',
    fieldFocus: 'Recognize this as a different source technology from a vacuum pump or blower. Use the adopted code and manufacturer documentation for the permitted motive source, adjustment limitations, and exhaust arrangement.',
    deepLink: ''
  }
];

const components = [
  {
    id: 'wagd-piping',
    name: 'WAGD Piping / Inlets',
    label: 'Use side',
    nfpa: ['5.1.3.8', '5.1.5'],
    purpose: 'The dedicated WAGD service carries waste anesthetic gases away from connected anesthesia or analgesia equipment toward the source/disposal arrangement.',
    fieldFocus: 'Keep WAGD service identification distinct from medical-surgical vacuum. Use the System Path view for the zone and terminal relationship.'
  },
  {
    id: 'source-isolation',
    name: 'Source Isolation',
    label: 'Source boundary',
    nfpa: ['5.1.3.8.1.6', '5.1.4.2'],
    purpose: 'Source isolation separates the central WAGD source equipment from the facility piping and supports equipment service without unnecessarily disabling the entire system.',
    fieldFocus: 'For a 6010 installer, understand the isolation relationship and identification. Detailed equipment service remains manufacturer- and qualification-specific.'
  },
  {
    id: 'producers',
    name: 'WAGD Producers',
    label: 'Flow / vacuum production',
    nfpa: ['5.1.3.8.1.6', '5.1.3.8.2'],
    purpose: 'Dedicated producers create the flow needed to remove waste anesthetic gases from the connected WAGD system.',
    fieldFocus: 'The Category 1 central-source concept includes continued capacity with the largest single producer unavailable, along with isolation and prevention of backflow through off-cycle equipment.'
  },
  {
    id: 'controls',
    name: 'Controls',
    label: 'Automatic operation',
    nfpa: ['5.1.3.8.4'],
    purpose: 'Controls stage and restart source equipment so WAGD remains available as demand changes or equipment is taken out of service.',
    fieldFocus: 'The app should teach control purpose, redundancy, and automatic restart—not electrical troubleshooting or programming.'
  },
  {
    id: 'alarms',
    name: 'Local Alarm',
    label: 'Source status',
    nfpa: ['5.1.3.8.3', '5.1.9.5'],
    purpose: 'A central WAGD source has local alarm requirements tied to source operation and available producer capacity.',
    fieldFocus: 'Connect this source alarm to the larger alarm architecture. Keep the distinction between source/local alarms, area alarms, and master alarms clear.'
  },
  {
    id: 'exhaust',
    name: 'WAGD Exhaust',
    label: 'Disposal / discharge',
    nfpa: ['5.1.3.8.5', '5.1.3.7.7'],
    purpose: 'The exhaust arrangement carries waste anesthetic gases away from the source while limiting the chance of discharge re-entering occupied or intake areas.',
    fieldFocus: 'Treat exhaust routing and discharge as a source-system requirement. Some smaller or venturi arrangements have specific allowances; recovery or destruction equipment can also affect the exhaust path.'
  }
];

let selectedType = 'component';
let selectedId = 'producers';

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
      <button type="button" class="wagd-node ${selectedType === 'component' && selectedId === component.id ? 'active' : ''}" data-wagd-id="${component.id}">
        <small>${escapeHtml(component.label)}</small>
        <strong>${escapeHtml(component.name)}</strong>
        <span>${escapeHtml(component.nfpa.map(section => `§${section}`).join(' · '))}</span>
      </button>`;
    const arrow = index < components.length - 1 ? '<span class="wagd-arrow" aria-hidden="true">→</span>' : '';
    return `<div class="wagd-step">${node}${arrow}</div>`;
  }).join('');

  diagramEl.querySelectorAll('[data-wagd-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedType = 'component';
      selectedId = button.dataset.wagdId;
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
      <div><p class="eyebrow">${selectedType === 'option' ? 'WAGD source option' : 'WAGD source component'}</p><h2>${escapeHtml(item.name)}</h2></div>
      <span class="verified-badge">2024 map</span>
    </div>
    <section class="reference-section">
      <h3>What it does</h3>
      <p>${escapeHtml(item.purpose)}</p>
    </section>
    <section class="reference-section field-focus">
      <h3>Field focus</h3>
      <p>${escapeHtml(item.fieldFocus)}</p>
      ${item.deepLink || ''}
    </section>
    <section class="reference-section">
      <h3>NFPA 99-2024 map</h3>
      <div class="section-list">${item.nfpa.map(section => `<div><strong>§ ${escapeHtml(section)}</strong><span>Reference location only — consult the adopted licensed code for the full requirement.</span></div>`).join('')}</div>
    </section>
    <div class="field-note"><strong>Scope:</strong> This view teaches WAGD source architecture and system distinctions. It intentionally does not teach pump repair, electrical service, pipe preparation, or brazing technique.</div>
  `;
}

renderOptions();
renderDiagram();
renderDetail();
