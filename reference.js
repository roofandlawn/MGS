const library = window.MGS_REFERENCE;
const listEl = document.querySelector('#referenceList');
const detailEl = document.querySelector('#referenceDetail');
const searchEl = document.querySelector('#referenceSearch');
const filtersEl = document.querySelector('#groupFilters');
const countEl = document.querySelector('#resultCount');

let activeGroup = 'All';
let selectedId = library.components[0]?.id || null;

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function componentHaystack(component) {
  return [
    component.name,
    component.group,
    ...component.systems,
    ...component.nfpa,
    component.summary,
    component.fieldFocus,
    ...component.roles,
    ...component.search
  ].join(' ').toLowerCase();
}

function filteredComponents() {
  const query = searchEl.value.trim().toLowerCase();
  return library.components.filter(component => {
    const groupMatch = activeGroup === 'All' || component.group === activeGroup;
    const searchMatch = !query || componentHaystack(component).includes(query);
    return groupMatch && searchMatch;
  });
}

function renderFilters() {
  const groups = ['All', ...new Set(library.components.map(component => component.group))];
  filtersEl.innerHTML = groups.map(group => `
    <button type="button" class="filter-chip ${group === activeGroup ? 'active' : ''}" data-group="${escapeHtml(group)}">${escapeHtml(group)}</button>
  `).join('');

  filtersEl.querySelectorAll('[data-group]').forEach(button => {
    button.addEventListener('click', () => {
      activeGroup = button.dataset.group;
      const visible = filteredComponents();
      if (!visible.some(component => component.id === selectedId)) selectedId = visible[0]?.id || null;
      render();
    });
  });
}

function renderList() {
  const visible = filteredComponents();
  countEl.textContent = `${visible.length} component${visible.length === 1 ? '' : 's'}`;

  if (!visible.length) {
    listEl.innerHTML = '<div class="empty">No reference records match that search.</div>';
    return;
  }

  listEl.innerHTML = visible.map(component => `
    <button type="button" class="reference-row ${component.id === selectedId ? 'active' : ''}" data-reference-id="${component.id}">
      <span class="reference-row-top"><strong>${escapeHtml(component.name)}</strong><small>${escapeHtml(component.group)}</small></span>
      <span>${escapeHtml(component.nfpa.map(section => `NFPA 99 §${section}`).join(' · '))}</span>
    </button>
  `).join('');

  listEl.querySelectorAll('[data-reference-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.referenceId;
      renderList();
      renderDetail();
      if (window.matchMedia('(max-width: 760px)').matches) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderDetail() {
  const component = library.components.find(item => item.id === selectedId);
  if (!component) {
    detailEl.innerHTML = '<div class="detail-empty">Select a component to open its field-reference page.</div>';
    return;
  }

  detailEl.innerHTML = `
    <div class="reference-detail-head">
      <div><p class="eyebrow">${escapeHtml(component.group)}</p><h2>${escapeHtml(component.name)}</h2></div>
      <span class="verified-badge">2024 reference mapped</span>
    </div>

    <section class="reference-section">
      <h3>What it is</h3>
      <p>${escapeHtml(component.summary)}</p>
    </section>

    <section class="reference-section field-focus">
      <h3>Field focus</h3>
      <p>${escapeHtml(component.fieldFocus)}</p>
    </section>

    <section class="reference-section">
      <h3>Systems</h3>
      <div class="tag-row">${component.systems.map(system => `<span class="tag">${escapeHtml(system)}</span>`).join('')}</div>
    </section>

    <section class="reference-section">
      <h3>NFPA 99-2024 map</h3>
      <div class="code-links">${component.nfpa.map(section => `<div><strong>§ ${escapeHtml(section)}</strong><span>Reference location — use the adopted licensed code for the full requirement.</span></div>`).join('')}</div>
    </section>

    <section class="reference-section">
      <h3>Useful for</h3>
      <div class="tag-row">${component.roles.map(role => `<span class="role-tag">${escapeHtml(role === 'New' ? 'New to med gas' : `ASSE ${role}`)}</span>`).join('')}</div>
    </section>
  `;
}

function render() {
  renderFilters();
  renderList();
  renderDetail();
}

document.querySelector('#editionLabel').textContent = library.edition;
document.querySelector('#sourceNote').textContent = library.source.note;
searchEl.addEventListener('input', () => {
  const visible = filteredComponents();
  if (!visible.some(component => component.id === selectedId)) selectedId = visible[0]?.id || null;
  renderList();
  renderDetail();
});

render();
