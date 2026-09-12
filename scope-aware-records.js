const scopeSystemAliases = new Map([
  ['oxygen', 'oxygen'], ['o2', 'oxygen'],
  ['medical air', 'medicalAir'], ['med air', 'medicalAir'],
  ['medical-surgical vacuum', 'medicalVacuum'], ['medical surgical vacuum', 'medicalVacuum'], ['medical vacuum', 'medicalVacuum'], ['vacuum', 'medicalVacuum'],
  ['wagd', 'wagd'], ['waste anesthetic gas disposal', 'wagd'],
  ['nitrous oxide', 'nitrousOxide'], ['n2o', 'nitrousOxide'],
  ['nitrogen', 'nitrogen'], ['n2', 'nitrogen'],
  ['instrument air', 'instrumentAir'],
  ['carbon dioxide', 'carbonDioxide'], ['co2', 'carbonDioxide']
]);

function normalizeScopeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function scopeIsDefined(project) {
  return Boolean(project && (project.systemScope?.length || String(project.systemScopeOther || '').trim()));
}

function catalogSystemForText(value) {
  const normalized = normalizeScopeText(value);
  if (!normalized) return null;
  const aliasId = scopeSystemAliases.get(normalized);
  if (aliasId) return systemForId(aliasId);
  return SYSTEM_CATALOG.find(system => normalizeScopeText(system.label) === normalized) || null;
}

function scopeStateForValue(project, value) {
  if (!project) return { kind: 'none', system: null };
  const normalized = normalizeScopeText(value);
  const specialty = normalizeScopeText(project.systemScopeOther);
  if (specialty && normalized === specialty) return { kind: 'in', system: null, specialty: true };
  const system = catalogSystemForText(value);
  if (!scopeIsDefined(project)) return { kind: 'unset', system };
  if (!system) return { kind: 'unmatched', system: null };
  return project.systemScope.includes(system.id)
    ? { kind: 'in', system }
    : { kind: 'outside', system };
}

function addSystemOption(parent, system, labelSuffix = '') {
  const option = document.createElement('option');
  option.value = system.label;
  option.textContent = `${system.label}${labelSuffix}`;
  option.dataset.systemId = system.id;
  parent.append(option);
}

function prepareOutletSystemOptions(project) {
  const select = outletDialog.querySelector('[name="gas"]');
  if (!select) return;
  select.innerHTML = '';

  if (scopeIsDefined(project)) {
    const inScope = document.createElement('optgroup');
    inScope.label = 'In project scope';
    project.systemScope.map(systemForId).filter(Boolean).forEach(system => addSystemOption(inScope, system));
    const specialty = String(project.systemScopeOther || '').trim();
    if (specialty) {
      const option = document.createElement('option');
      option.value = specialty;
      option.textContent = specialty;
      option.dataset.scopeSpecialty = 'true';
      inScope.append(option);
    }
    if (inScope.children.length) select.append(inScope);

    const outside = document.createElement('optgroup');
    outside.label = 'Outside current project scope';
    SYSTEM_CATALOG.filter(system => !project.systemScope.includes(system.id)).forEach(system => addSystemOption(outside, system));
    if (outside.children.length) select.append(outside);
  } else {
    const catalog = document.createElement('optgroup');
    catalog.label = 'System catalog — project scope not set';
    SYSTEM_CATALOG.forEach(system => addSystemOption(catalog, system));
    select.append(catalog);
  }

  const other = document.createElement('option');
  other.value = 'Other';
  other.textContent = 'Other / component not listed';
  select.append(other);
  updateScopeFeedback(outletDialog.querySelector('form'), select.value, 'outlet');
}

function prepareTestSystemSuggestions(project) {
  const input = testDialog.querySelector('[name="system"]');
  if (!input) return;
  input.setAttribute('list', 'testSystemSuggestions');
  input.placeholder = 'Select/type system, gas, or component';
  let list = document.getElementById('testSystemSuggestions');
  if (!list) {
    list = document.createElement('datalist');
    list.id = 'testSystemSuggestions';
    testDialog.querySelector('form').append(list);
  }
  list.innerHTML = '';
  const used = new Set();
  const addSuggestion = (value, label) => {
    const normalized = normalizeScopeText(value);
    if (!value || used.has(normalized)) return;
    used.add(normalized);
    const option = document.createElement('option');
    option.value = value;
    option.label = label;
    list.append(option);
  };

  project.systemScope.map(systemForId).filter(Boolean).forEach(system => addSuggestion(system.label, 'In project scope'));
  if (String(project.systemScopeOther || '').trim()) addSuggestion(project.systemScopeOther.trim(), 'In project scope · specialty');
  SYSTEM_CATALOG.forEach(system => addSuggestion(system.label, project.systemScope.includes(system.id) ? 'In project scope' : 'System catalog'));
  updateScopeFeedback(testDialog.querySelector('form'), input.value, 'test');
}

function ensureScopeFeedback(form, kind) {
  let feedback = form.querySelector(`[data-scope-feedback="${kind}"]`);
  if (feedback) return feedback;
  const field = kind === 'outlet' ? form.querySelector('[name="gas"]') : form.querySelector('[name="system"]');
  feedback = document.createElement('div');
  feedback.className = 'scope-entry-feedback';
  feedback.dataset.scopeFeedback = kind;
  feedback.setAttribute('role', 'status');
  field.closest('label')?.after(feedback);
  return feedback;
}

function updateScopeFeedback(form, value, kind) {
  const project = selectedProject();
  const feedback = ensureScopeFeedback(form, kind);
  const state = scopeStateForValue(project, value);
  feedback.className = `scope-entry-feedback ${state.kind}`;
  feedback.replaceChildren();

  const text = document.createElement('span');
  if (state.kind === 'in') text.textContent = state.specialty ? 'In project scope · specialty system.' : `In project scope: ${state.system.label}.`;
  else if (state.kind === 'outside') text.textContent = `${state.system.label} is outside the current project scope. Saving will require confirmation.`;
  else if (state.kind === 'unset') text.textContent = 'Project system scope is not set, so this record cannot be automatically scope-checked.';
  else if (state.kind === 'unmatched' && String(value || '').trim()) text.textContent = 'This entry does not match a standard system name. Use this for a component or specialty record when intentional.';
  else text.textContent = kind === 'test' ? 'Choose or type the system, gas, or component for this record.' : 'Choose the gas/system for this outlet record.';
  feedback.append(text);

  if (state.system?.module) {
    const link = document.createElement('a');
    link.href = state.system.module;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `Open ${state.system.label} source/reference module`;
    feedback.append(link);
  }
}

function guardScopeAwareSubmit(form, kind) {
  form.addEventListener('submit', event => {
    const project = selectedProject();
    const value = kind === 'outlet' ? form.querySelector('[name="gas"]')?.value : form.querySelector('[name="system"]')?.value;
    const state = scopeStateForValue(project, value);
    if (state.kind !== 'outside') return;
    const ok = window.confirm(`${state.system.label} is not in the selected project scope. Save this record anyway?`);
    if (!ok) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

function decorateScopedModuleLinks() {
  const project = selectedProject();
  if (!project || !systemScopeEditor || systemScopeEditor.querySelector('.scope-module-links')) return;
  const systemsWithModules = project.systemScope.map(systemForId).filter(system => system?.module);
  if (!systemsWithModules.length) return;

  const panel = document.createElement('div');
  panel.className = 'scope-module-links';
  const heading = document.createElement('strong');
  heading.textContent = 'Scoped source/reference modules';
  panel.append(heading);
  const links = document.createElement('div');
  links.className = 'scope-module-link-list';
  systemsWithModules.forEach(system => {
    const link = document.createElement('a');
    link.href = system.module;
    link.textContent = `Open ${system.label}`;
    links.append(link);
  });
  panel.append(links);
  systemScopeEditor.querySelector('.scope-editor')?.append(panel);
}

function decorateRecordScopeFlags(list, records, kind) {
  const project = selectedProject();
  if (!project || !scopeIsDefined(project)) return;
  list.querySelectorAll('.record-card').forEach(card => {
    if (card.querySelector('.scope-record-flag')) return;
    const deleteButton = card.querySelector(kind === 'outlet' ? '[data-outlet-delete]' : '[data-test-delete]');
    const id = kind === 'outlet' ? deleteButton?.dataset.outletDelete : deleteButton?.dataset.testDelete;
    const record = records.find(item => item.id === id);
    if (!record) return;
    const value = kind === 'outlet' ? record.gas : record.system;
    const state = scopeStateForValue(project, value);
    if (state.kind !== 'outside') return;
    const flag = document.createElement('span');
    flag.className = 'scope-record-flag';
    flag.textContent = 'Outside project scope';
    flag.title = `${state.system.label} is not selected in this project's system scope.`;
    card.querySelector('.record-main')?.append(flag);
  });
}

$('#addOutletBtn').onclick = () => {
  const project = selectedProject();
  if (!project) return alert('Create or select a project first.');
  prepareOutletSystemOptions(project);
  outletDialog.showModal();
};

$('#addTestBtn').onclick = () => {
  const project = selectedProject();
  if (!project) return alert('Create or select a project first.');
  prepareTestSystemSuggestions(project);
  testDialog.showModal();
};

outletDialog.querySelector('[name="gas"]')?.addEventListener('change', event => updateScopeFeedback(outletDialog.querySelector('form'), event.target.value, 'outlet'));
testDialog.querySelector('[name="system"]')?.addEventListener('input', event => updateScopeFeedback(testDialog.querySelector('form'), event.target.value, 'test'));

guardScopeAwareSubmit(outletDialog.querySelector('form'), 'outlet');
guardScopeAwareSubmit(testDialog.querySelector('form'), 'test');

const scopeObserver = new MutationObserver(() => decorateScopedModuleLinks());
scopeObserver.observe(systemScopeEditor, { childList: true, subtree: true });

const outletScopeObserver = new MutationObserver(() => decorateRecordScopeFlags(outletList, selectedProject()?.outlets || [], 'outlet'));
outletScopeObserver.observe(outletList, { childList: true, subtree: true });

const testScopeObserver = new MutationObserver(() => decorateRecordScopeFlags(testList, selectedProject()?.tests || [], 'test'));
testScopeObserver.observe(testList, { childList: true, subtree: true });

decorateScopedModuleLinks();
decorateRecordScopeFlags(outletList, selectedProject()?.outlets || [], 'outlet');
decorateRecordScopeFlags(testList, selectedProject()?.tests || [], 'test');
