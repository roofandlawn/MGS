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

const medicalAirFieldPrompts = [
  {
    "suffix": "source",
    "title": "Medical Air source type and project limits identified",
    "detail": "Record whether the supply is a medical-air compressor system or an approved proportioning system; identify existing-versus-new source equipment and the downstream work boundary.",
    "actionTab": "systems",
    "nfpaFamily": "§5.1.3.6 — Medical Air; §5.1.3.6.3.14 — Proportioning Sources",
    "evidenceType": "Drawing",
    "evidenceDetail": "Reference source schematic, equipment schedule, and approved design. Mark compressor-only prompts N/A when a different approved source technology is used."
  },
  {
    "suffix": "intake",
    "title": "Compressor intake location and protection reviewed",
    "detail": "For compressor sources, document the outdoor or permitted alternate-air intake, nearby exhaust/vent/vehicle risks, intake routing, screening, and service label.",
    "actionTab": "photos",
    "nfpaFamily": "§5.1.3.6.3.11 — Compressor Intake",
    "evidenceType": "Photo",
    "evidenceDetail": "Record intake location and annotated nearby openings, exhaust discharges and potential contamination sources; cite plans and adopted clearance criteria. N/A if no compressor intake."
  },
  {
    "suffix": "compressors",
    "title": "Compressor redundancy, controls and power interface recorded",
    "detail": "For compressor sources, identify duty/standby units, isolation/check-valve path, lead/lag controls, motor power and emergency electrical interfaces. Do not operate equipment from this checklist.",
    "actionTab": "notes",
    "nfpaFamily": "§5.1.3.6.3.4 and §5.1.3.6.3.10 — Compressors / Controls",
    "evidenceType": "Field record",
    "evidenceDetail": "Record equipment tags, standby arrangements, control interfaces and source-room readiness; cite approved sequence and manufacturer commissioning procedures."
  },
  {
    "suffix": "receiver",
    "title": "Receiver, drains and maintenance-bypass path reviewed",
    "detail": "For compressor sources, identify receiver connections, water/condensate removal, isolation, and the means to maintain service during receiver maintenance.",
    "actionTab": "notes",
    "nfpaFamily": "§5.1.3.6.3.9 — Medical Air Source Arrangement",
    "evidenceType": "Field record",
    "evidenceDetail": "Record receiver tag, drain type/routing, maintenance bypass and isolation points with a drawing or field photograph."
  },
  {
    "suffix": "treatment",
    "title": "Dryer, filtration and aftercooler train documented",
    "detail": "For compressor sources, trace the flow through applicable aftercoolers, dryers, filters, sample points and redundant treatment branches. Identify how an off-line branch can be serviced or returned to service.",
    "actionTab": "photos",
    "nfpaFamily": "§5.1.3.6.3.7–§5.1.3.6.3.9 — Dryers, Filters and Arrangement",
    "evidenceType": "Photo",
    "evidenceDetail": "Label flow direction, equipment tags, branch selection, sample ports, drains and maintenance isolation; cite OEM requirements for any operating procedure."
  },
  {
    "suffix": "regulators",
    "title": "Final regulation and source valve path reviewed",
    "detail": "Record the line regulators, relief protection, source shutoff valve and downstream sampling/monitoring location, using the approved pressure criteria rather than app defaults.",
    "actionTab": "notes",
    "nfpaFamily": "§5.1.3.6.3 — Medical Air Supply Components / Arrangement",
    "evidenceType": "Field record",
    "evidenceDetail": "Identify regulator branches, pressure-reference documents, relief devices and the source boundary; record observed readings only under authorized commissioning procedures."
  },
  {
    "suffix": "quality",
    "title": "Dew-point and CO monitoring interfaces mapped",
    "detail": "For compressor sources, locate dew-point and carbon-monoxide monitoring, sample points, monitor power and alarm contacts. For proportioning sources, document the applicable oxygen-analysis and failover scheme instead.",
    "actionTab": "alarms",
    "nfpaFamily": "§5.1.3.6.3.13–§5.1.3.6.3.14 — Quality Monitoring / Proportioning",
    "evidenceType": "Field record",
    "evidenceDetail": "Record monitor make/model, sensor location, display, signal path, project alarm matrix and calibration/inspection record reference. Never label air quality accepted based on a checkbox."
  },
  {
    "suffix": "alarms",
    "title": "Source status and local/master warning interfaces recorded",
    "detail": "Trace compressor fault, reserve capacity, high dew point, CO and other applicable signals from source devices through local and required master alarm panels. Use the approved alarm matrix.",
    "actionTab": "alarms",
    "nfpaFamily": "§5.1.3.6.3.12 and §5.1.9 — Medical Air Warning Signals",
    "evidenceType": "Field record",
    "evidenceDetail": "Enter each applicable alarm point, label, point of connection and panel location. Put witnessed function-test results in Tests, not the checklist status."
  },
  {
    "suffix": "outlets",
    "title": "Medical Air outlets, zone valves and service identity recorded",
    "detail": "Document impacted clinical outlets and isolation valves and confirm the service remains clearly identified as Medical Air, distinct from Instrument Air.",
    "actionTab": "outlets",
    "nfpaFamily": "§5.1.4, §5.1.5 and §5.1.11 — Valves, Outlets and Identification",
    "evidenceType": "Field record",
    "evidenceDetail": "Record affected room/outlet IDs, valve boxes, service labels and representative photos; include project drawing references."
  },
  {
    "suffix": "testing",
    "title": "Installer records and independent verifier handoff planned",
    "detail": "Identify the installer inspections and testing evidence, source manufacturer startup reports and separate independent verifier/AHJ documentation required by the adopted code and project. Checklist completion never certifies the system.",
    "actionTab": "tests",
    "nfpaFamily": "§5.1.12 — Performance Criteria and Testing",
    "evidenceType": "Test record",
    "evidenceDetail": "Reference installer test IDs, personnel, dates, measurements, OEM startup record and separate verifier report. Keep deficiencies and subsequent re-test evidence in project history."
  }
];

const instrumentAirFieldPrompts = [
  {
    suffix: 'source',
    title: 'Instrument air source and redundancy reviewed',
    detail: 'Confirm whether the project affects the compressor source, standby arrangement, source room, controls, or only downstream distribution.',
    actionTab: 'systems',
    nfpaFamily: '§5.1.13.3.7 — Instrument Air Supply Systems',
    evidenceType: 'Drawing',
    evidenceDetail: 'Cite the current drawing or equipment schedule showing the instrument-air source arrangement, redundancy or standby provision, and project interface.'
  },
  {
    suffix: 'treatment',
    title: 'Drying and filtration train recorded',
    detail: 'Trace the treatment path through separators, dryers, filters, drains, and final filtration; record flow direction, isolation, and status indications.',
    actionTab: 'notes',
    nfpaFamily: '§5.1.13.3.7 — Instrument Air quality, treatment, and source components',
    evidenceType: 'Field record',
    evidenceDetail: 'Record treatment components in flow order and note filter/dryer status indications, drains, isolation points, and any project deficiency. Use the adopted code and manufacturer instructions for acceptance criteria.'
  },
  {
    suffix: 'pressure',
    title: 'Pressure-control path and equipment ratings reviewed',
    detail: 'Confirm the project design pressure, pressure-control arrangement, relief/overpressure protection, and connected equipment ratings.',
    actionTab: 'notes',
    nfpaFamily: '§5.1.13.3.7.3 — Instrument Air source pressure characteristics',
    evidenceType: 'Field record',
    evidenceDetail: 'Record design/observed pressure information and the project document or equipment data used. Do not infer an acceptable setpoint from the app.'
  },
  {
    suffix: 'alarms',
    title: 'Instrument air source and warning signals reviewed',
    detail: 'Identify the applicable local/source and remote warning signals and trace the project interfaces to the alarm records.',
    actionTab: 'alarms',
    nfpaFamily: '§5.1.13.3.7 and §5.1.13.9 — Instrument Air monitoring / warning systems',
    evidenceType: 'Field record',
    evidenceDetail: 'Create alarm records for the applicable source and warning conditions with location, interface, and field status; functional evidence belongs in Tests.'
  },
  {
    suffix: 'terminals',
    title: 'Instrument air equipment outlets recorded',
    detail: 'Capture outlet locations, identifiers or quantities, designed pressure, and intended equipment use. Keep this service distinct from Medical Air.',
    actionTab: 'outlets',
    nfpaFamily: '§5.1.13.5 — Support-Gas Station Outlets',
    evidenceType: 'Field record',
    evidenceDetail: 'Create instrument-air outlet records with location, identifier or quantity, intended equipment use, and field status.'
  },
  {
    suffix: 'identification',
    title: 'Instrument air identification and Medical Air separation reviewed',
    detail: 'Confirm the project documentation clearly maintains Instrument Air identity through piping, valves, alarm references, and outlets without treating it as Medical Air.',
    actionTab: 'photos',
    nfpaFamily: '§5.1.13.10–§5.1.13.11 — Distribution and Identification',
    evidenceType: 'Photo',
    evidenceDetail: 'Capture representative photos showing instrument-air piping/component identification and any location where service identity could be confused with Medical Air.'
  },
  {
    suffix: 'testing',
    title: 'Instrument air installer records and verifier handoff planned',
    detail: 'Identify installer inspection/test records and the separate verifier or AHJ documentation required for project closeout. Checklist completion does not mean the system is verified.',
    actionTab: 'tests',
    nfpaFamily: '§5.1.13 — Medical Support Gases; confirm adopted testing / verification requirements',
    evidenceType: 'Test record',
    evidenceDetail: 'Create installer test/inspection records with date, person/company, result, readings or report reference, and notes. Record external verifier outcomes separately when available.'
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
  if (systemId === 'medicalAir') return medicalAirFieldPrompts;
  if (systemId === 'instrumentAir') return instrumentAirFieldPrompts;
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