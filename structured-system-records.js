(() => {
  function installStructuredUi() {
    const tabs = document.querySelector('.tabs');
    const alarmsTab = tabs?.querySelector('[data-tab="alarms"]');
    if (tabs && alarmsTab && !tabs.querySelector('[data-tab="valves"]')) {
      const tab = document.createElement('button');
      tab.className = 'tab';
      tab.dataset.tab = 'valves';
      tab.textContent = 'Valves';
      tabs.insertBefore(tab, alarmsTab);
    }

    const alarmPanel = document.getElementById('tab-alarms');
    if (alarmPanel && !document.getElementById('tab-valves')) {
      const panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = 'tab-valves';
      panel.innerHTML = '<div class="section-actions"><div><h4>Valves & controls</h4><small class="helper">Record isolation points, zone valve boxes, source controls, and other project control locations with explicit system tags.</small></div><button id="addValveBtn" class="secondary">+ Add valve / control</button></div><div id="valveList" class="record-list"></div>';
      alarmPanel.parentNode.insertBefore(panel, alarmPanel);
    }

    const alarmForm = document.getElementById('alarmForm');
    if (alarmForm && !alarmForm.querySelector('[data-record-system-options="alarm"]')) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'record-system-fieldset';
      fieldset.innerHTML = '<legend>System tags</legend><small class="helper">Select every system this alarm record applies to. Structured tags are used by the project evidence checklist.</small><div data-record-system-options="alarm"></div>';
      alarmForm.querySelector('[name="serves"]')?.closest('label')?.after(fieldset);
    }

    const photoForm = document.getElementById('photoForm');
    if (photoForm && !photoForm.querySelector('[data-record-system-options="photo"]')) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'record-system-fieldset';
      fieldset.innerHTML = '<legend>System tags</legend><small class="helper">Select the system or systems visible in this photo. Leave blank only when the image is project-wide rather than system-specific.</small><div data-record-system-options="photo"></div>';
      photoForm.querySelector('#photoPreview')?.after(fieldset);
    }

    if (!document.getElementById('valveDialog')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'valveDialog';
      dialog.innerHTML = `<form id="valveForm" method="dialog">
        <div class="dialog-head"><h3>Add valve / control record</h3><button type="button" class="icon-btn" data-structured-close>×</button></div>
        <label>Type<select name="type"><option>Zone valve box</option><option>Isolation valve</option><option>Source valve / control</option><option>Main / riser valve</option><option>Control device</option><option>Other</option></select></label>
        <label>Location<input name="location" required placeholder="Level 2 corridor / source room"></label>
        <label>Identifier<input name="identifier" placeholder="ZVB-2A, V-14, panel tag..."></label>
        <label>Area served / description<input name="serves" placeholder="OR suite, east wing, source header..."></label>
        <fieldset class="record-system-fieldset"><legend>System tags</legend><small class="helper">Select every system controlled by this valve or device.</small><div data-record-system-options="valve"></div></fieldset>
        <label>Status<select name="status"><option>Not checked</option><option>Pass</option><option>Needs attention</option></select></label>
        <label>Notes<textarea name="notes" rows="3" placeholder="Access, identification, coordination, condition..."></textarea></label>
        <div class="dialog-actions"><button type="button" class="secondary" data-structured-close>Cancel</button><button class="primary">Save valve / control</button></div>
      </form>`;
      document.body.append(dialog);
    }

    if (!document.getElementById('systemTagDialog')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'systemTagDialog';
      dialog.innerHTML = `<form id="systemTagForm" method="dialog">
        <div class="dialog-head"><h3 id="systemTagDialogTitle">Edit system tags</h3><button type="button" class="icon-btn" data-tag-close>×</button></div>
        <input type="hidden" name="kind"><input type="hidden" name="recordId">
        <p class="structured-tag-note">Choose all applicable systems. Structured tags take priority over free-text matching in the evidence engine.</p>
        <div data-record-system-options="editor"></div>
        <div class="dialog-actions"><button type="button" class="secondary" data-tag-close>Cancel</button><button class="primary">Save system tags</button></div>
      </form>`;
      document.body.append(dialog);
    }
  }

  installStructuredUi();

  const valveList = document.getElementById('valveList');
  const valveDialog = document.getElementById('valveDialog');
  const valveForm = document.getElementById('valveForm');
  const addValveBtn = document.getElementById('addValveBtn');
  const alarmForm = document.getElementById('alarmForm');
  const photoForm = document.getElementById('photoForm');
  const photoInput = document.getElementById('photoInput');
  const alarmListElement = document.getElementById('alarmList');
  const photoListElement = document.getElementById('photoList');
  const tagDialog = document.getElementById('systemTagDialog');
  const tagForm = document.getElementById('systemTagForm');

  if (!valveList || !valveDialog || !valveForm || !addValveBtn || !alarmForm || !photoForm || !tagDialog || !tagForm) return;

  const validSystemIds = new Set(SYSTEM_CATALOG.map(system => system.id));

  function cleanIds(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(String)
      .filter(id => validSystemIds.has(id)))];
  }

  function normalizeTaggedRecord(record) {
    if (!record || typeof record !== 'object') return record;
    const legacyId = validSystemIds.has(record.systemId) ? [record.systemId] : [];
    record.systemIds = cleanIds(Array.isArray(record.systemIds) ? record.systemIds : legacyId);
    record.systemOther = String(record.systemOther || '').trim();
    return record;
  }

  function ensureStructuredCollections() {
    state.projects.forEach(project => {
      project.alarms = (Array.isArray(project.alarms) ? project.alarms : []).map(normalizeTaggedRecord);
      project.photos = (Array.isArray(project.photos) ? project.photos : []).map(normalizeTaggedRecord);
      project.valves = (Array.isArray(project.valves) ? project.valves : []).map(normalizeTaggedRecord);
    });
  }

  function scopeDefined(project) {
    return Boolean(project && ((project.systemScope || []).length || String(project.systemScopeOther || '').trim()));
  }

  function recordTagLabels(record) {
    const labels = cleanIds(record?.systemIds)
      .map(systemForId)
      .filter(Boolean)
      .map(system => system.label);
    const other = String(record?.systemOther || '').trim();
    if (other) labels.push(other);
    return labels;
  }

  function tagMarkup(record) {
    const labels = recordTagLabels(record);
    if (!labels.length) return '<span class="record-system-tag missing">System tag missing</span>';
    return labels.map(label => `<span class="record-system-tag">${escapeHtml(label)}</span>`).join('');
  }

  function tagText(record) {
    const labels = recordTagLabels(record);
    return labels.length ? labels.join(', ') : 'System tag missing';
  }

  function createSystemChoice(system, checked, outsideScope = false) {
    return `
      <label class="record-system-choice ${outsideScope ? 'outside' : ''}">
        <input type="checkbox" name="systemIds" value="${system.id}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(system.label)}</span>
      </label>`;
  }

  function renderTagOptions(container, project, selectedRecord = null, autoSelectSingle = false) {
    if (!container || !project) return;
    const selectedIds = new Set(cleanIds(selectedRecord?.systemIds));
    const selectedOther = String(selectedRecord?.systemOther || '').trim();
    const inScopeIds = new Set(project.systemScope || []);
    const specialty = String(project.systemScopeOther || '').trim();

    if (autoSelectSingle && !selectedIds.size && !selectedOther && inScopeIds.size === 1 && !specialty) {
      selectedIds.add([...inScopeIds][0]);
    }

    const groups = [];
    const inScopeSystems = SYSTEM_CATALOG.filter(system => inScopeIds.has(system.id));
    if (inScopeSystems.length || specialty) {
      const choices = inScopeSystems.map(system => createSystemChoice(system, selectedIds.has(system.id))).join('');
      const specialtyChoice = specialty ? `
        <label class="record-system-choice specialty">
          <input type="checkbox" name="systemOther" value="${escapeHtml(specialty)}" ${selectedOther === specialty ? 'checked' : ''}>
          <span>${escapeHtml(specialty)} <small>specialty</small></span>
        </label>` : '';
      groups.push(`<div class="record-system-group"><strong>In project scope</strong><div class="record-system-grid">${choices}${specialtyChoice}</div></div>`);
    }

    const outsideSystems = SYSTEM_CATALOG.filter(system => !inScopeIds.has(system.id));
    if (scopeDefined(project) && outsideSystems.length) {
      groups.push(`<div class="record-system-group outside"><strong>Outside current scope</strong><div class="record-system-grid">${outsideSystems.map(system => createSystemChoice(system, selectedIds.has(system.id), true)).join('')}</div></div>`);
    } else if (!scopeDefined(project)) {
      groups.push(`<div class="record-system-group"><strong>System catalog</strong><div class="record-system-grid">${SYSTEM_CATALOG.map(system => createSystemChoice(system, selectedIds.has(system.id))).join('')}</div></div>`);
    }

    if (selectedOther && selectedOther !== specialty) {
      groups.push(`<div class="record-system-group"><strong>Saved specialty tag</strong><div class="record-system-grid"><label class="record-system-choice specialty"><input type="checkbox" name="systemOther" value="${escapeHtml(selectedOther)}" checked><span>${escapeHtml(selectedOther)}</span></label></div></div>`);
    }

    container.innerHTML = groups.join('') || '<p class="helper">Set the project system scope first, or leave the record untagged.</p>';
  }

  function readTags(form) {
    const ids = cleanIds([...form.querySelectorAll('input[name="systemIds"]:checked')].map(input => input.value));
    const other = form.querySelector('input[name="systemOther"]:checked')?.value || '';
    return { systemIds: ids, systemOther: String(other).trim() };
  }

  function outsideScopeNames(project, tags) {
    if (!scopeDefined(project)) return [];
    const outside = tags.systemIds
      .filter(id => !(project.systemScope || []).includes(id))
      .map(systemForId)
      .filter(Boolean)
      .map(system => system.label);
    const specialty = String(project.systemScopeOther || '').trim();
    if (tags.systemOther && tags.systemOther !== specialty) outside.push(tags.systemOther);
    return outside;
  }

  function confirmOutsideScope(project, tags) {
    const outside = outsideScopeNames(project, tags);
    if (!outside.length) return true;
    return window.confirm(`${outside.join(', ')} ${outside.length === 1 ? 'is' : 'are'} outside the selected project scope. Save these system tags anyway?`);
  }

  function prepareNewRecordTags(kind) {
    const project = selectedProject();
    if (!project) return false;
    const container = document.querySelector(`[data-record-system-options="${kind}"]`);
    renderTagOptions(container, project, null, true);
    return true;
  }

  function persistTagsAfterExistingSubmit(form, collectionName) {
    form.addEventListener('submit', event => {
      const project = selectedProject();
      if (!project) return;
      const tags = readTags(form);
      if (!confirmOutsideScope(project, tags)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      form._mgsPendingStructuredTags = {
        tags,
        previousFirstId: project[collectionName]?.[0]?.id || null
      };
    }, true);

    form.addEventListener('submit', event => {
      if (event.defaultPrevented) return;
      const project = selectedProject();
      const pending = form._mgsPendingStructuredTags;
      form._mgsPendingStructuredTags = null;
      if (!project || !pending) return;
      const record = project[collectionName]?.[0];
      if (!record || record.id === pending.previousFirstId) return;
      record.systemIds = pending.tags.systemIds;
      record.systemOther = pending.tags.systemOther;
      record.systemTagsUpdatedAt = new Date().toISOString();
      save();
    });
  }

  function renderValveRecords() {
    const project = selectedProject();
    if (!project) {
      valveList.innerHTML = '<div class="empty">Select a project first.</div>';
      return;
    }
    project.valves = Array.isArray(project.valves) ? project.valves.map(normalizeTaggedRecord) : [];
    if (!project.valves.length) {
      valveList.innerHTML = '<div class="empty">No valve or control records yet.</div>';
      return;
    }

    valveList.innerHTML = project.valves.map(record => `
      <article class="record-card">
        <div class="record-main">
          <strong>${escapeHtml(record.type || 'Valve / control')}</strong>
          <span>${escapeHtml(record.location || 'Location not entered')}</span>
          <small>${escapeHtml([record.identifier, record.serves].filter(Boolean).join(' · ') || 'No identifier / area served entered')}</small>
          <div class="record-system-tags">${tagMarkup(record)}</div>
          <button type="button" class="tag-edit-link" data-edit-system-tags="valve" data-record-id="${record.id}">Edit system tags</button>
        </div>
        <span class="status ${statusClass(record.status)}">${escapeHtml(record.status || 'Not checked')}</span>
        <button class="delete-link" data-valve-delete="${record.id}">Delete</button>
        ${record.notes ? `<p>${escapeHtml(record.notes)}</p>` : ''}
      </article>`).join('');
  }

  function decorateAlarmTags() {
    const project = selectedProject();
    if (!project || !alarmListElement) return;
    alarmListElement.querySelectorAll('.record-card').forEach(card => {
      const deleteButton = card.querySelector('[data-alarm-delete]');
      const record = project.alarms.find(item => item.id === deleteButton?.dataset.alarmDelete);
      const main = card.querySelector('.record-main');
      if (!record || !main) return;
      normalizeTaggedRecord(record);
      main.querySelector('[data-structured-system-tools]')?.remove();
      const tools = document.createElement('div');
      tools.dataset.structuredSystemTools = 'true';
      tools.className = 'record-system-tools';
      tools.innerHTML = `<div class="record-system-tags">${tagMarkup(record)}</div><button type="button" class="tag-edit-link" data-edit-system-tags="alarm" data-record-id="${record.id}">Edit system tags</button>`;
      main.append(tools);
    });
  }

  function decoratePhotoTags() {
    const project = selectedProject();
    if (!project || !photoListElement) return;
    photoListElement.querySelectorAll('.photo-card').forEach(card => {
      const deleteButton = card.querySelector('[data-photo-delete]');
      const record = project.photos.find(item => item.id === deleteButton?.dataset.photoDelete);
      const caption = card.querySelector('figcaption');
      if (!record || !caption) return;
      normalizeTaggedRecord(record);
      caption.querySelector('[data-structured-system-tools]')?.remove();
      const tools = document.createElement('div');
      tools.dataset.structuredSystemTools = 'true';
      tools.className = 'record-system-tools';
      tools.innerHTML = `<div class="record-system-tags">${tagMarkup(record)}</div><button type="button" class="tag-edit-link" data-edit-system-tags="photo" data-record-id="${record.id}">Edit system tags</button>`;
      caption.append(tools);
    });
  }

  function decorateProjectValveCount() {
    const project = selectedProject();
    const grid = document.querySelector('#projectDetail .detail-grid');
    if (!project || !grid || grid.querySelector('[data-valve-record-count]')) return;
    const item = document.createElement('div');
    item.dataset.valveRecordCount = 'true';
    item.innerHTML = `<span>Valve / control records</span><strong>${project.valves?.length || 0}</strong>`;
    grid.append(item);
  }

  function routeValveChecklistActions() {
    document.querySelectorAll('.scope-field-item[data-field-item]').forEach(article => {
      const itemId = String(article.dataset.fieldItem || '');
      if (!itemId.endsWith(':valves') && !itemId.endsWith(':controls')) return;
      const button = article.querySelector('.scope-field-item-actions [data-open-field-tab], .scope-field-item-actions [data-evidence-tab]');
      if (!button || button.dataset.evidenceHandoff) return;
      if (button.dataset.openFieldTab !== 'valves') button.dataset.openFieldTab = 'valves';
      if (button.dataset.evidenceTab !== 'valves') button.dataset.evidenceTab = 'valves';
      if (!button.title || /record area/i.test(button.title)) button.title = 'Open Valve / Control records for this project.';
    });
  }

  function updateRecordedItemCount() {
    const count = state.projects.reduce((total, project) => total
      + (project.alarms?.length || 0)
      + (project.outlets?.length || 0)
      + (project.tests?.length || 0)
      + (project.photos?.length || 0)
      + (project.valves?.length || 0), 0);
    const deviceCount = document.getElementById('deviceCount');
    if (deviceCount) deviceCount.textContent = count;
  }

  function renderStructuredRecords() {
    ensureStructuredCollections();
    renderValveRecords();
    decorateAlarmTags();
    decoratePhotoTags();
    decorateProjectValveCount();
    routeValveChecklistActions();
    updateRecordedItemCount();
  }

  function collectionForKind(project, kind) {
    if (kind === 'alarm') return project.alarms;
    if (kind === 'photo') return project.photos;
    if (kind === 'valve') return project.valves;
    return null;
  }

  function openTagEditor(kind, recordId) {
    const project = selectedProject();
    const collection = project ? collectionForKind(project, kind) : null;
    const record = collection?.find(item => item.id === recordId);
    if (!project || !record) return;
    normalizeTaggedRecord(record);
    tagForm.elements.kind.value = kind;
    tagForm.elements.recordId.value = recordId;
    const label = kind === 'alarm' ? 'alarm record' : kind === 'photo' ? 'project photo' : 'valve / control record';
    document.getElementById('systemTagDialogTitle').textContent = `Edit ${label} system tags`;
    renderTagOptions(tagForm.querySelector('[data-record-system-options="editor"]'), project, record, false);
    tagDialog.showModal();
  }

  document.getElementById('addAlarmBtn').onclick = () => {
    const project = selectedProject();
    if (!project) return alert('Create or select a project first.');
    prepareNewRecordTags('alarm');
    alarmDialog.showModal();
  };

  document.querySelector('.tab[data-tab="valves"]')?.addEventListener('click', event => {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === event.currentTarget));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === 'tab-valves'));
    renderValveRecords();
  });

  valveDialog.querySelectorAll('[data-structured-close]').forEach(button => button.addEventListener('click', () => valveDialog.close()));

  addValveBtn.onclick = () => {
    const project = selectedProject();
    if (!project) return alert('Create or select a project first.');
    prepareNewRecordTags('valve');
    valveDialog.showModal();
  };

  photoInput?.addEventListener('click', () => {
    if (selectedProject()) prepareNewRecordTags('photo');
  });

  persistTagsAfterExistingSubmit(alarmForm, 'alarms');
  persistTagsAfterExistingSubmit(photoForm, 'photos');

  valveForm.addEventListener('submit', event => {
    event.preventDefault();
    const project = selectedProject();
    if (!project) return;
    const tags = readTags(valveForm);
    if (!confirmOutsideScope(project, tags)) return;
    const formData = new FormData(valveForm);
    project.valves.unshift({
      id: crypto.randomUUID(),
      type: String(formData.get('type') || '').trim(),
      location: String(formData.get('location') || '').trim(),
      identifier: String(formData.get('identifier') || '').trim(),
      serves: String(formData.get('serves') || '').trim(),
      status: String(formData.get('status') || 'Not checked'),
      notes: String(formData.get('notes') || '').trim(),
      systemIds: tags.systemIds,
      systemOther: tags.systemOther,
      addedAt: new Date().toISOString(),
      systemTagsUpdatedAt: new Date().toISOString()
    });
    valveForm.reset();
    valveDialog.close();
    save();
  });

  valveList.addEventListener('click', event => {
    const button = event.target.closest('[data-valve-delete]');
    if (!button) return;
    const project = selectedProject();
    if (!project) return;
    project.valves = project.valves.filter(record => record.id !== button.dataset.valveDelete);
    save();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-edit-system-tags]');
    if (!button) return;
    openTagEditor(button.dataset.editSystemTags, button.dataset.recordId);
  });

  tagForm.addEventListener('submit', event => {
    event.preventDefault();
    const project = selectedProject();
    if (!project) return;
    const kind = tagForm.elements.kind.value;
    const recordId = tagForm.elements.recordId.value;
    const collection = collectionForKind(project, kind);
    const record = collection?.find(item => item.id === recordId);
    if (!record) return;
    const tags = readTags(tagForm);
    if (!confirmOutsideScope(project, tags)) return;
    record.systemIds = tags.systemIds;
    record.systemOther = tags.systemOther;
    record.systemTagsUpdatedAt = new Date().toISOString();
    tagDialog.close();
    save();
  });

  tagDialog.querySelectorAll('[data-tag-close]').forEach(button => button.addEventListener('click', () => tagDialog.close()));

  const checklistContainer = document.getElementById('scopeFieldChecklist');
  if (checklistContainer) {
    const checklistRouteObserver = new MutationObserver(() => routeValveChecklistActions());
    checklistRouteObserver.observe(checklistContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-open-field-tab', 'data-evidence-tab'] });
  }

  const originalSave = save;
  save = function structuredSave() {
    originalSave();
    renderStructuredRecords();
  };

  const originalRenderReport = renderReport;
  renderReport = function structuredRenderReport() {
    originalRenderReport();
    const project = selectedProject();
    const report = document.getElementById('report');
    if (!project || !report || report.querySelector('[data-valve-report]')) return;
    const section = document.createElement('section');
    section.dataset.valveReport = 'true';
    section.innerHTML = `<h3>Valve / control records</h3>${reportRows(project.valves || [], record => [
      `<strong>${escapeHtml(record.type || 'Valve / control')}</strong><br>${escapeHtml(record.location || '')}<br><small>${escapeHtml([record.identifier, record.serves].filter(Boolean).join(' · '))}</small><br><small>Systems: ${escapeHtml(tagText(record))}</small>`,
      `<strong>${escapeHtml(record.status || 'Not checked')}</strong>${record.notes ? `<br>${escapeHtml(record.notes)}` : ''}`
    ])}`;
    const fieldNotesSection = [...report.querySelectorAll('section')].find(candidate => candidate.querySelector('h3')?.textContent === 'Field notes');
    if (fieldNotesSection) report.insertBefore(section, fieldNotesSection);
    else report.append(section);
  };

  ensureStructuredCollections();
  renderStructuredRecords();
})();
