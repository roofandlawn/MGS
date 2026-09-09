const SCOPE_FIELD_STATUS = {
  open: 'Open',
  done: 'Complete',
  na: 'N/A'
};

const pressureFieldPrompts = [
  {
    suffix: 'source',
    title: 'Source / supply impact reviewed',
    detail: 'Confirm whether this project changes, extends, or only connects to the existing source/supply arrangement.',
    actionTab: 'systems',
    nfpaFamily: '§5.1.3 — Sources',
    evidenceType: 'Drawing',
    evidenceDetail: 'Cite the current system drawing or project document that shows the source/supply relationship; add a field note when the work only connects downstream.'
  },
  {
    suffix: 'valves',
    title: 'Valve coverage and locations recorded',
    detail: 'Record the valves that control this system for the project area and note any coordination or access issue.',
    actionTab: 'notes',
    nfpaFamily: '§5.1.4 — Valves',
    evidenceType: 'Field record',
    evidenceDetail: 'Record the applicable isolation points, areas served, and field location. Photos can support access and identification conditions.'
  },
  {
    suffix: 'alarms',
    title: 'Alarm coverage and interfaces reviewed',
    detail: 'Identify the alarm panels, signals, and project interfaces that apply to this system.',
    actionTab: 'alarms',
    nfpaFamily: '§5.1.9 — Warning Systems',
    evidenceType: 'Field record',
    evidenceDetail: 'Create the applicable alarm record with location, service/interface, and field status; functional test evidence belongs in Tests.'
  },
  {
    suffix: 'terminals',
    title: 'Outlets / terminals recorded',
    detail: 'Capture terminal locations, identifiers or quantities, and field status for the project area.',
    actionTab: 'outlets',
    nfpaFamily: '§5.1.5 — Station Outlets and Inlets',
    evidenceType: 'Field record',
    evidenceDetail: 'Create outlet/terminal records for the project area with location, identifier or quantity, and field status.'
  },
  {
    suffix: 'identification',
    title: 'Identification / labeling checkpoints reviewed',
    detail: 'Confirm the project has a plan to document required piping and component identification before closeout.',
    actionTab: 'photos',
    nfpaFamily: '§5.1.11 — Labeling and Identification',
    evidenceType: 'Photo',
    evidenceDetail: 'Capture representative project photos showing piping/component identification and any location-specific issue that needs correction.'
  },
  {
    suffix: 'testing',
    title: 'Installer test / inspection records planned',
    detail: 'Identify the installer test, inspection, and supporting records that must be captured for this system before handoff.',
    actionTab: 'tests',
    nfpaFamily: '§5.1.12 — Performance Criteria and Testing',
    evidenceType: 'Test record',
    evidenceDetail: 'Create the applicable test/inspection record with date, person/company, result, reading or report reference, and notes.'
  }
];

const vacuumFieldPrompts = [
  {
    suffix: 'source',
    title: 'Vacuum source impact reviewed',
    detail: 'Confirm whether the work affects the central vacuum source, receiver, controls, exhaust, or only downstream distribution.',
    actionTab: 'systems',
    nfpaFamily: '§5.1.3.7 — Medical-Surgical Vacuum Sources',
    evidenceType: 'Drawing',
    evidenceDetail: 'Cite the drawing or project document showing the vacuum source/interface and note whether source equipment, exhaust, controls, or only downstream piping is affected.'
  },
  {
    suffix: 'valves',
    title: 'Isolation valve coverage and locations recorded',
    detail: 'Record the isolation points serving the project area and note access or coordination concerns.',
    actionTab: 'notes',
    nfpaFamily: '§5.1.4 — Valves',
    evidenceType: 'Field record',
    evidenceDetail: 'Record the applicable isolation points, areas served, and field location. Photos can support access and identification conditions.'
  },
  {
    suffix: 'alarms',
    title: 'Vacuum alarm coverage reviewed',
    detail: 'Identify the alarm panels, signals, and project interfaces that apply to the vacuum work.',
    actionTab: 'alarms',
    nfpaFamily: '§5.1.9 — Warning Systems',
    evidenceType: 'Field record',
    evidenceDetail: 'Create the applicable vacuum alarm record with location, interface, and field status; functional test evidence belongs in Tests.'
  },
  {
    suffix: 'terminals',
    title: 'Vacuum inlets recorded',
    detail: 'Capture inlet locations, identifiers or quantities, and field status for the project area.',
    actionTab: 'outlets',
    nfpaFamily: '§5.1.5 — Station Outlets and Inlets',
    evidenceType: 'Field record',
    evidenceDetail: 'Create vacuum inlet records for the project area with location, identifier or quantity, and field status.'
  },
  {
    suffix: 'identification',
    title: 'Vacuum identification checkpoints reviewed',
    detail: 'Confirm the project has a plan to document required piping and component identification before closeout.',
    actionTab: 'photos',
    nfpaFamily: '§5.1.11 — Labeling and Identification',
    evidenceType: 'Photo',
    evidenceDetail: 'Capture representative project photos showing vacuum piping/component identification and any issue that needs correction.'
  },
  {
    suffix: 'testing',
    title: 'Vacuum test / inspection records planned',
    detail: 'Identify the installer test, inspection, and supporting records that must be captured before handoff.',
    actionTab: 'tests',
    nfpaFamily: '§5.1.12 — Performance Criteria and Testing',
    evidenceType: 'Test record',
    evidenceDetail: 'Create the applicable vacuum test/inspection record with date, person/company, result, reading or report reference, and notes.'
  }
];

const wagdFieldPrompts = [
  {
    suffix: 'source',
    title: 'WAGD disposal / source arrangement reviewed',
    detail: 'Confirm the project arrangement and whether the work affects the disposal source, interface, or only downstream distribution.',
    actionTab: 'systems',
    nfpaFamily: '§5.1.3.8 — WAGD Sources',
    evidenceType: 'Drawing',
    evidenceDetail: 'Cite the current drawing or project document showing the WAGD source/disposal arrangement and the project interface.'
  },
  {
    suffix: 'valves',
    title: 'WAGD isolation / control points recorded',
    detail: 'Record the project control or isolation points and note access or coordination concerns.',
    actionTab: 'notes',
    nfpaFamily: '§5.1.4 — Valves',
    evidenceType: 'Field record',
    evidenceDetail: 'Record the applicable WAGD control/isolation points, areas served, and field location; add photos where identification or access matters.'
  },
  {
    suffix: 'alarms',
    title: 'WAGD alarm / monitoring interfaces reviewed',
    detail: 'Identify any project alarm or monitoring interfaces that apply to this WAGD system.',
    actionTab: 'alarms',
    nfpaFamily: '§5.1.9 — Warning Systems',
    evidenceType: 'Field record',
    evidenceDetail: 'Create the applicable WAGD alarm/monitoring record with location, interface, and field status; functional test evidence belongs in Tests.'
  },
  {
    suffix: 'terminals',
    title: 'WAGD terminals recorded',
    detail: 'Capture terminal locations, identifiers or quantities, and field status for the project area.',
    actionTab: 'outlets',
    nfpaFamily: '§5.1.5 — Station Outlets and Inlets',
    evidenceType: 'Field record',
    evidenceDetail: 'Create WAGD terminal records for the project area with location, identifier or quantity, and field status.'
  },
  {
    suffix: 'identification',
    title: 'WAGD identification checkpoints reviewed',
    detail: 'Confirm the project has a plan to document required piping and component identification before closeout.',
    actionTab: 'photos',
    nfpaFamily: '§5.1.11 — Labeling and Identification',
    evidenceType: 'Photo',
    evidenceDetail: 'Capture representative project photos showing WAGD piping/component identification and any issue that needs correction.'
  },
  {
    suffix: 'testing',
    title: 'WAGD test / inspection records planned',
    detail: 'Identify the installer test, inspection, and supporting records that must be captured before handoff.',
    actionTab: 'tests',
    nfpaFamily: '§5.1.12 — Performance Criteria and Testing',
    evidenceType: 'Test record',
    evidenceDetail: 'Create the applicable WAGD test/inspection record with date, person/company, result, reading or report reference, and notes.'
  }
];

const specialtyFieldPrompts = [
  {
    suffix: 'arrangement',
    title: 'System arrangement and project limits reviewed',
    detail: 'Document where the specialty system starts and stops within this job and which equipment is affected.',
    actionTab: 'systems',
    nfpaFamily: 'NFPA 99 Ch. 5 — confirm system-specific applicability',
    evidenceType: 'Drawing',
    evidenceDetail: 'Cite the drawing, specification, manufacturer document, or approved project detail that defines this specialty system and its limits.'
  },
  {
    suffix: 'controls',
    title: 'Isolation / control points recorded',
    detail: 'Record the control or isolation points that apply to the project area.',
    actionTab: 'notes',
    nfpaFamily: 'NFPA 99 Ch. 5 — confirm system-specific applicability',
    evidenceType: 'Field record',
    evidenceDetail: 'Record the specialty system control/isolation points and note the project document, manufacturer instruction, or AHJ direction used.'
  },
  {
    suffix: 'terminals',
    title: 'Terminal devices / connections recorded',
    detail: 'Capture terminal devices, connections, locations, identifiers, or quantities as applicable.',
    actionTab: 'outlets',
    nfpaFamily: 'NFPA 99 Ch. 5 — confirm system-specific applicability',
    evidenceType: 'Field record',
    evidenceDetail: 'Create field records for specialty terminals/connections with location, identifier or quantity, and field status.'
  },
  {
    suffix: 'identification',
    title: 'Identification checkpoints reviewed',
    detail: 'Document the project identification and labeling plan for the specialty system.',
    actionTab: 'photos',
    nfpaFamily: '§5.1.11 — Labeling and Identification, where applicable',
    evidenceType: 'Photo',
    evidenceDetail: 'Capture representative photos and cite any project-specific identification requirement that applies to the specialty system.'
  },
  {
    suffix: 'testing',
    title: 'Test / inspection records planned',
    detail: 'Identify the project-specific testing, inspection, manufacturer, or AHJ records that must be captured before handoff.',
    actionTab: 'tests',
    nfpaFamily: '§5.1.12 — Performance Criteria and Testing, where applicable',
    evidenceType: 'Test record',
    evidenceDetail: 'Create the project-specific test/inspection record and cite manufacturer, project, verifier, or AHJ criteria used for the specialty system.'
  }
];

function fieldPromptSet(systemId) {
  if (systemId === 'medicalVacuum') return vacuumFieldPrompts;
  if (systemId === 'wagd') return wagdFieldPrompts;
  return pressureFieldPrompts;
}

function specialtyChecklistKey(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || 'specialty';
}

function scopeFieldItems(project) {
  if (!project) return [];
  const items = [{
    id: 'project:scope-review',
    group: 'Project setup',
    title: 'System scope reviewed against current project documents',
    detail: 'Confirm the selected systems still match the current contract documents, approved changes, and field conditions.',
    actionTab: 'systems',
    nfpaFamily: 'NFPA 99 Ch. 5 — Gas and Vacuum Systems',
    evidenceType: 'Drawing',
    evidenceDetail: 'Cite the current drawing, specification, addendum, or approved change used to define the project system scope.'
  }];

  (project.systemScope || []).map(systemForId).filter(Boolean).forEach(system => {
    fieldPromptSet(system.id).forEach(prompt => items.push({
      id: `${system.id}:${prompt.suffix}`,
      group: system.label,
      title: prompt.title,
      detail: prompt.detail,
      actionTab: prompt.actionTab,
      module: prompt.suffix === 'source' ? system.module : null,
      nfpaFamily: prompt.nfpaFamily,
      evidenceType: prompt.evidenceType,
      evidenceDetail: prompt.evidenceDetail
    }));
  });

  const specialty = String(project.systemScopeOther || '').trim();
  if (specialty) {
    const key = specialtyChecklistKey(specialty);
    specialtyFieldPrompts.forEach(prompt => items.push({
      id: `specialty:${key}:${prompt.suffix}`,
      group: specialty,
      title: prompt.title,
      detail: prompt.detail,
      actionTab: prompt.actionTab,
      nfpaFamily: prompt.nfpaFamily,
      evidenceType: prompt.evidenceType,
      evidenceDetail: prompt.evidenceDetail
    }));
  }

  items.push({
    id: 'project:handoff-review',
    group: 'Project closeout',
    title: 'Handoff evidence path reviewed',
    detail: 'Confirm where project test records, photos, drawings, and verifier/AHJ closeout information will be collected.',
    actionTab: 'tests',
    nfpaFamily: '§5.1.12 — Performance Criteria and Testing',
    evidenceType: 'Closeout document',
    evidenceDetail: 'Cite the closeout package, verification/inspection report, drawing set, or other project record used for final handoff when available.'
  });

  return items;
}

function fieldChecklistRecord(project, itemId) {
  const records = project.scopeFieldChecklist && typeof project.scopeFieldChecklist === 'object'
    ? project.scopeFieldChecklist
    : (project.scopeFieldChecklist = {});
  const record = records[itemId] || {};
  const status = Object.hasOwn(SCOPE_FIELD_STATUS, record.status) ? record.status : 'open';
  return { ...record, status };
}

function scopeFieldCounts(project, items = scopeFieldItems(project)) {
  let complete = 0;
  let applicable = 0;
  let na = 0;
  items.forEach(item => {
    const status = fieldChecklistRecord(project, item.id).status;
    if (status === 'na') na += 1;
    else {
      applicable += 1;
      if (status === 'done') complete += 1;
    }
  });
  return { complete, applicable, na, open: Math.max(0, applicable - complete) };
}

function scopeFieldStatusOptions(selected) {
  return Object.entries(SCOPE_FIELD_STATUS)
    .map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`)
    .join('');
}

function activateFieldTab(tabName) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(candidate => candidate.classList.toggle('active', candidate === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tabName}`));
  tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function renderScopeFieldChecklist() {
  const container = document.getElementById('scopeFieldChecklist');
  const summary = document.getElementById('scopeFieldChecklistSummary');
  if (!container || !summary) return;
  const project = selectedProject();

  if (!project) {
    summary.textContent = 'Select a project to generate its field plan.';
    container.innerHTML = '<div class="empty">Select a project first.</div>';
    return;
  }

  const hasScope = Boolean((project.systemScope || []).length || String(project.systemScopeOther || '').trim());
  if (!hasScope) {
    summary.textContent = 'System scope is not set yet.';
    container.innerHTML = '<div class="scope-field-empty"><strong>No system-specific plan yet.</strong><span>Set the project system scope first, then MGS will generate only the relevant field prompts.</span><button type="button" class="secondary" data-open-field-tab="systems">Open Systems</button></div>';
    return;
  }

  const items = scopeFieldItems(project);
  const counts = scopeFieldCounts(project, items);
  summary.textContent = `${counts.complete}/${counts.applicable} applicable complete${counts.na ? ` · ${counts.na} N/A` : ''}`;

  const groups = new Map();
  items.forEach(item => {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  });

  container.innerHTML = [...groups.entries()].map(([group, groupItems]) => `
    <section class="scope-field-group">
      <div class="scope-field-group-head"><h5>${escapeHtml(group)}</h5><span>${groupItems.length} prompt${groupItems.length === 1 ? '' : 's'}</span></div>
      <div class="scope-field-items">
        ${groupItems.map(item => {
          const record = fieldChecklistRecord(project, item.id);
          const completeDate = record.completedAt ? new Date(record.completedAt).toLocaleDateString() : '';
          return `
            <article class="scope-field-item status-${record.status}" data-field-item="${escapeHtml(item.id)}">
              <div class="scope-field-item-main">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.detail)}</span>
                <div class="scope-field-meta" aria-label="Reference and evidence guidance">
                  <span class="scope-field-meta-chip"><b>NFPA family</b>${escapeHtml(item.nfpaFamily || 'Confirm applicable NFPA 99 section')}</span>
                  <span class="scope-field-meta-chip"><b>Evidence</b>${escapeHtml(item.evidenceType || 'Project record')}</span>
                </div>
                ${item.evidenceDetail ? `<small class="scope-field-evidence-detail">${escapeHtml(item.evidenceDetail)}</small>` : ''}
                ${completeDate && record.status === 'done' ? `<small>Completed ${escapeHtml(completeDate)}</small>` : ''}
              </div>
              <div class="scope-field-item-actions">
                <label>Status
                  <select data-field-status="${escapeHtml(item.id)}">${scopeFieldStatusOptions(record.status)}</select>
                </label>
                <button type="button" class="secondary compact" data-open-field-tab="${escapeHtml(item.actionTab)}">Open records</button>
                ${item.module ? `<a class="secondary compact" href="${escapeHtml(item.module)}">Open reference</a>` : ''}
              </div>
            </article>`;
        }).join('')}
      </div>
    </section>`).join('');
}

function updateScopeFieldOpenStat() {
  const target = document.getElementById('openCount');
  if (!target) return;
  const manualOpen = state.projects.reduce((total, project) => total + (project.tasks || []).filter(task => !task.done).length, 0);
  const generatedOpen = state.projects.reduce((total, project) => {
    const hasScope = Boolean((project.systemScope || []).length || String(project.systemScopeOther || '').trim());
    if (!hasScope) return total;
    return total + scopeFieldCounts(project).open;
  }, 0);
  target.textContent = manualOpen + generatedOpen;
  target.title = `${manualOpen} custom checklist item${manualOpen === 1 ? '' : 's'} + ${generatedOpen} generated field-plan item${generatedOpen === 1 ? '' : 's'} open`;
}

const scopeFieldContainer = document.getElementById('scopeFieldChecklist');
scopeFieldContainer?.addEventListener('change', event => {
  const select = event.target.closest('[data-field-status]');
  if (!select) return;
  const project = selectedProject();
  if (!project) return;
  if (!project.scopeFieldChecklist || typeof project.scopeFieldChecklist !== 'object') project.scopeFieldChecklist = {};
  const previous = fieldChecklistRecord(project, select.dataset.fieldStatus);
  const nextStatus = Object.hasOwn(SCOPE_FIELD_STATUS, select.value) ? select.value : 'open';
  project.scopeFieldChecklist[select.dataset.fieldStatus] = {
    ...previous,
    status: nextStatus,
    completedAt: nextStatus === 'done' ? (previous.completedAt || new Date().toISOString()) : null,
    updatedAt: new Date().toISOString()
  };
  save();
});

scopeFieldContainer?.addEventListener('click', event => {
  const action = event.target.closest('[data-open-field-tab]');
  if (!action) return;
  activateFieldTab(action.dataset.openFieldTab);
});

const scopeFieldObserverTarget = document.getElementById('projectDetail');
const scopeFieldObserver = scopeFieldObserverTarget
  ? new MutationObserver(() => {
      renderScopeFieldChecklist();
      updateScopeFieldOpenStat();
    })
  : null;
scopeFieldObserver?.observe(scopeFieldObserverTarget, { childList: true, subtree: true });

renderScopeFieldChecklist();
updateScopeFieldOpenStat();