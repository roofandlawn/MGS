const library = window.MGS_REFERENCE;
const diagramEl = document.querySelector('#pathDiagram');
const detailEl = document.querySelector('#pathDetail');
const buttonsEl = document.querySelector('#systemButtons');
const titleEl = document.querySelector('#pathTitle');

const systems = {
  oxygen: {
    label: 'Oxygen',
    source: 'cylinder-manifold',
    sourceCaption: 'Cylinder manifold example',
    terminal: 'station-outlet',
    terminalCaption: 'Oxygen outlet'
  },
  'medical-air': {
    label: 'Medical Air',
    source: 'medical-air-source',
    sourceCaption: 'Compressor source',
    terminal: 'station-outlet',
    terminalCaption: 'Medical air outlet'
  },
  vacuum: {
    label: 'Medical-Surgical Vacuum',
    source: 'vacuum-source',
    sourceCaption: 'Central vacuum source',
    terminal: 'station-inlet',
    terminalCaption: 'Vacuum inlet'
  }
};

const commonPath = [
  { id: 'source-valve', caption: 'Source isolation' },
  { id: 'main-line-valve', caption: 'Main distribution' },
  { id: 'riser-valve', caption: 'Vertical distribution' },
  { id: 'service-valve', caption: 'Branch / lateral isolation' },
  { id: 'zone-valve', caption: 'Patient-area isolation' }
];

let activeSystem = 'oxygen';
let selectedId = null;

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function getComponent(id) {
  return library.components.find(component => component.id === id);
}

function getPath() {
  const system = systems[activeSystem];
  return [
    { id: system.source, caption: system.sourceCaption },
    ...commonPath,
    { id: system.terminal, caption: system.terminalCaption }
  ];
}

function renderSystemButtons() {
  buttonsEl.innerHTML = Object.entries(systems).map(([id, system]) => `
    <button type="button" class="filter-chip ${id === activeSystem ? 'active' : ''}" data-system="${id}">${escapeHtml(system.label)}</button>
  `).join('');

  buttonsEl.querySelectorAll('[data-system]').forEach(button => {
    button.addEventListener('click', () => {
      activeSystem = button.dataset.system;
      selectedId = systems[activeSystem].source;
      render();
    });
  });
}

function renderDiagram() {
  const path = getPath();
  titleEl.textContent = systems[activeSystem].label;

  diagramEl.innerHTML = path.map((step, index) => {
    const component = getComponent(step.id);
    if (!component) return '';
    const node = `
      <button type="button" class="path-node ${selectedId === component.id ? 'active' : ''}" data-component-id="${component.id}">
        <small>${escapeHtml(step.caption)}</small>
        <strong>${escapeHtml(component.name)}</strong>
        <span>${escapeHtml(component.nfpa.map(section => `NFPA 99 §${section}`).join(' · '))}</span>
      </button>`;
    const arrow = index < path.length - 1 ? '<span class="path-arrow" aria-hidden="true">→</span>' : '';
    return `<div class="path-step">${node}${arrow}</div>`;
  }).join('');

  document.querySelectorAll('[data-component-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.componentId;
      renderDiagram();
      renderDetail();
      if (window.matchMedia('(max-width: 900px)').matches) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderDetail() {
  const component = getComponent(selectedId);
  if (!component) {
    detailEl.innerHTML = '<div class="detail-empty">Tap a component in the path to see its field-reference summary.</div>';
    return;
  }

  const sourceDeepLink = component.id === 'medical-air-source'
    ? '<p><a class="primary nav-button" href="medical-air.html">Open interactive medical-air source →</a></p>'
    : '';

  detailEl.innerHTML = `
    <div class="reference-detail-head">
      <div><p class="eyebrow">${escapeHtml(component.group)}</p><h2>${escapeHtml(component.name)}</h2></div>
      <span class="verified-badge">2024 map</span>
    </div>
    <section class="reference-section">
      <h3>What it is</h3>
      <p>${escapeHtml(component.summary)}</p>
    </section>
    <section class="reference-section field-focus">
      <h3>Why it matters in the path</h3>
      <p>${escapeHtml(component.fieldFocus)}</p>
      ${sourceDeepLink}
    </section>
    <section class="reference-section">
      <h3>NFPA 99-2024 map</h3>
      <div class="code-links">${component.nfpa.map(section => `<div><strong>§ ${escapeHtml(section)}</strong><span>Reference location only — open the adopted licensed code for the full requirement.</span></div>`).join('')}</div>
    </section>
    <section class="reference-section">
      <h3>Systems</h3>
      <div class="tag-row">${component.systems.map(system => `<span class="tag">${escapeHtml(system)}</span>`).join('')}</div>
    </section>
  `;
}

function render() {
  renderSystemButtons();
  renderDiagram();
  renderDetail();
}

selectedId = systems[activeSystem].source;
render();
