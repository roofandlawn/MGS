(() => {
  const outletForm = document.getElementById('outletForm');
  const testForm = document.getElementById('testForm');
  const outletListElement = document.getElementById('outletList');
  const testListElement = document.getElementById('testList');
  const addTestBtn = document.getElementById('addTestBtn');

  if (!outletForm || !testForm || !outletListElement || !testListElement) return;

  const validSystemIds = new Set(SYSTEM_CATALOG.map(system => system.id));

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function cleanIds(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(String)
      .filter(id => validSystemIds.has(id)))];
  }

  function systemFromText(value) {
    if (typeof catalogSystemForText === 'function') return catalogSystemForText(value);
    const normalized = normalizeText(value);
    return SYSTEM_CATALOG.find(system => normalizeText(system.label) === normalized) || null;
  }

  function tagsFromLegacyValue(project, value) {
    const system = systemFromText(value);
    if (system) return { systemIds: [system.id], systemOther: '' };
    const specialty = String(project?.systemScopeOther || '').trim();
    if (specialty && normalizeText(value) === normalizeText(specialty)) {
      return { systemIds: [], systemOther: specialty };
    }
    return { systemIds: [], systemOther: '' };
  }

  function normalizeCanonicalRecord(project, record, legacyValue) {
    if (!record || typeof record !== 'object') return record;
    const legacyId = validSystemIds.has(record.systemId) ? [record.systemId] : [];
    record.systemIds = cleanIds(Array.isArray(record.systemIds) ? record.systemIds : legacyId);
    record.systemOther = String(record.systemOther || '').trim();

    const hasStructuredTags = record.systemIds.length || record.systemOther;
    const mayInferLegacy = !hasStructuredTags && !record.systemTagsSource && !record.systemTagsUpdatedAt;
    if (mayInferLegacy) {
      const inferred = tagsFromLegacyValue(project, legacyValue);
      if (inferred.systemIds.length || inferred.systemOther) {
        record.systemIds = inferred.systemIds;
        record.systemOther = inferred.systemOther;
        record.systemTagsSource = 'legacy-inferred';
      }
    }
    return record;
  }

  function ensureCanonicalCollections() {
    state.projects.forEach(project => {
      project.outlets = (Array.isArray(project.outlets) ? project.outlets : [])
        .map(record => normalizeCanonicalRecord(project, record, record?.gas));
      project.tests = (Array.isArray(project.tests) ? project.tests : [])
        .map(record => normalizeCanonicalRecord(project, record, record?.system));
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

  function createSystemChoice(system, checked, outsideScope = false) {
    return `
      <label class="record-system-choice ${outsideScope ? 'outside' : ''}">
        <input type="checkbox" name="canonicalSystemIds" value="${system.id}" ${checked ? 'checked' : ''}>
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
          <input type="checkbox" name="canonicalSystemOther" value="${escapeHtml(specialty)}" ${selectedOther === specialty ? 'checked' : ''}>
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
      groups.push(`<div class="record-system-group"><strong>Saved specialty tag</strong><div class="record-system-grid"><label class="record-system-choice specialty"><input type="checkbox" name="canonicalSystemOther" value="${escapeHtml(selectedOther)}" checked><span>${escapeHtml(selectedOther)}</span></label></div></div>`);
    }

    container.innerHTML = groups.join('') || '<p class="helper">Set the project system scope first, or leave the record untagged.</p>';
  }

  function readTags(root) {
    const ids = cleanIds([...root.querySelectorAll('input[name="canonicalSystemIds"]:checked')].map(input => input.value));
    const other = root.querySelector('input[name="canonicalSystemOther"]:checked')?.value || '';
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
    if (tags.systemOther && normalizeText(tags.systemOther) !== normalizeText(specialty)) outside.push(tags.systemOther);
    return outside;
  }

  function confirmOutsideScope(project, tags, skipSystemId = null) {
    const outside = outsideScopeNames(project, tags).filter(name => {
      const system = systemFromText(name);
      return !skipSystemId || system?.id !== skipSystemId;
    });
    if (!outside.length) return true;
    return window.confirm(`${outside.join(', ')} ${outside.length === 1 ? 'is' : 'are'} outside the selected project scope. Save these system tags anyway?`);
  }

  function addTestTagFieldset() {
    if (testForm.querySelector('[data-canonical-system-options="test"]')) return;
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'record-system-fieldset';
    fieldset.innerHTML = '<legend>System tags</legend><small class="helper">Tag the gas/system(s) this test applies to. Keep the System / gas field above for the user-facing description, such as “zone valve box,” and use these tags for reliable checklist matching.</small><div data-canonical-system-options="test"></div>';
    testForm.querySelector('[name="system"]')?.closest('label')?.after(fieldset);
  }

  function prepareTestTags() {
    const project = selectedProject();
    if (!project) return;
    addTestTagFieldset();
    renderTagOptions(testForm.querySelector('[data-canonical-system-options="test"]'), project, null, true);
  }

  function deriveOutletTags(project) {
    const select = outletForm.querySelector('[name="gas"]');
    const option = select?.selectedOptions?.[0];
    const explicitId = option?.dataset.systemId;
    if (validSystemIds.has(explicitId)) return { systemIds: [explicitId], systemOther: '' };
    if (option?.dataset.scopeSpecialty === 'true') {
      return { systemIds: [], systemOther: String(option.value || '').trim() };
    }
    return tagsFromLegacyValue(project, select?.value);
  }

  function persistDerivedTagsAfterSubmit(form, collectionName, tagReader, source) {
    form.addEventListener('submit', event => {
      const project = selectedProject();
      if (!project) return;
      const tags = tagReader(project);
      form._mgsPendingCanonicalTags = {
        tags,
        source,
        previousFirstId: project[collectionName]?.[0]?.id || null
      };
    }, true);

    form.addEventListener('submit', event => {
      if (event.defaultPrevented) return;
      const project = selectedProject();
      const pending = form._mgsPendingCanonicalTags;
      form._mgsPendingCanonicalTags = null;
      if (!project || !pending) return;
      const record = project[collectionName]?.[0];
      if (!record || record.id === pending.previousFirstId) return;
      record.systemIds = cleanIds(pending.tags.systemIds);
      record.systemOther = String(pending.tags.systemOther || '').trim();
      record.systemTagsSource = pending.source;
      record.systemTagsUpdatedAt = new Date().toISOString();
      save();
    });
  }

  function captureTestTags(project) {
    let tags = readTags(testForm);
    const typedValue = testForm.querySelector('[name="system"]')?.value || '';
    const typedSystem = systemFromText(typedValue);

    if (!tags.systemIds.length && !tags.systemOther) {
      tags = tagsFromLegacyValue(project, typedValue);
    }

    if (!confirmOutsideScope(project, tags, typedSystem?.id || null)) {
      return null;
    }
    return tags;
  }

  testForm.addEventListener('submit', event => {
    const project = selectedProject();
    if (!project) return;
    const tags = captureTestTags(project);
    if (!tags) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    testForm._mgsPendingCanonicalTags = {
      tags,
      source: readTags(testForm).systemIds.length || readTags(testForm).systemOther ? 'manual' : 'selection-inferred',
      previousFirstId: project.tests?.[0]?.id || null
    };
  }, true);

  testForm.addEventListener('submit', event => {
    if (event.defaultPrevented) return;
    const project = selectedProject();
    const pending = testForm._mgsPendingCanonicalTags;
    testForm._mgsPendingCanonicalTags = null;
    if (!project || !pending) return;
    const record = project.tests?.[0];
    if (!record || record.id === pending.previousFirstId) return;
    record.systemIds = cleanIds(pending.tags.systemIds);
    record.systemOther = String(pending.tags.systemOther || '').trim();
    record.systemTagsSource = pending.source;
    record.systemTagsUpdatedAt = new Date().toISOString();
    save();
  });

  persistDerivedTagsAfterSubmit(outletForm, 'outlets', deriveOutletTags, 'gas-selection');

  addTestBtn?.addEventListener('click', () => prepareTestTags());

  function installEditor() {
    if (document.getElementById('canonicalSystemTagDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'canonicalSystemTagDialog';
    dialog.innerHTML = `<form id="canonicalSystemTagForm" method="dialog">
      <div class="dialog-head"><h3 id="canonicalSystemTagDialogTitle">Edit system tags</h3><button type="button" class="icon-btn" data-canonical-tag-close>×</button></div>
      <input type="hidden" name="kind"><input type="hidden" name="recordId">
      <p class="structured-tag-note">Canonical system IDs are used for project-scope checks and checklist evidence matching. The existing display label is preserved separately.</p>
      <div data-canonical-system-options="editor"></div>
      <div class="dialog-actions"><button type="button" class="secondary" data-canonical-tag-close>Cancel</button><button class="primary">Save system tags</button></div>
    </form>`;
    document.body.append(dialog);
  }

  installEditor();
  const tagDialog = document.getElementById('canonicalSystemTagDialog');
  const tagForm = document.getElementById('canonicalSystemTagForm');

  function collectionForKind(project, kind) {
    if (kind === 'outlet') return project.outlets;
    if (kind === 'test') return project.tests;
    return null;
  }

  function decorateRecordTags(listElement, collection, kind) {
    listElement.querySelectorAll('.record-card').forEach(card => {
      const deleteButton = card.querySelector(kind === 'outlet' ? '[data-outlet-delete]' : '[data-test-delete]');
      const recordId = kind === 'outlet' ? deleteButton?.dataset.outletDelete : deleteButton?.dataset.testDelete;
      const record = collection.find(item => item.id === recordId);
      const main = card.querySelector('.record-main');
      if (!record || !main) return;
      main.querySelector(`[data-canonical-system-tools="${kind}"]`)?.remove();
      const tools = document.createElement('div');
      tools.dataset.canonicalSystemTools = kind;
      tools.className = 'record-system-tools';
      tools.innerHTML = `<div class="record-system-tags">${tagMarkup(record)}</div><button type="button" class="tag-edit-link" data-edit-canonical-system-tags="${kind}" data-record-id="${record.id}">Edit system tags</button>`;
      main.append(tools);
    });
  }

  function decorateCanonicalTags() {
    const project = selectedProject();
    if (!project) return;
    ensureCanonicalCollections();
    decorateRecordTags(outletListElement, project.outlets || [], 'outlet');
    decorateRecordTags(testListElement, project.tests || [], 'test');
  }

  function openTagEditor(kind, recordId) {
    const project = selectedProject();
    const collection = project ? collectionForKind(project, kind) : null;
    const record = collection?.find(item => item.id === recordId);
    if (!project || !record) return;
    normalizeCanonicalRecord(project, record, kind === 'outlet' ? record.gas : record.system);
    tagForm.elements.kind.value = kind;
    tagForm.elements.recordId.value = recordId;
    document.getElementById('canonicalSystemTagDialogTitle').textContent = kind === 'outlet'
      ? 'Edit outlet / terminal system tag'
      : 'Edit test record system tags';
    renderTagOptions(tagForm.querySelector('[data-canonical-system-options="editor"]'), project, record, false);
    tagDialog.showModal();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-edit-canonical-system-tags]');
    if (!button) return;
    openTagEditor(button.dataset.editCanonicalSystemTags, button.dataset.recordId);
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
    record.systemTagsSource = 'manual';
    record.systemTagsUpdatedAt = new Date().toISOString();
    tagDialog.close();
    save();
  });

  tagDialog.querySelectorAll('[data-canonical-tag-close]').forEach(button => button.addEventListener('click', () => tagDialog.close()));

  const observer = new MutationObserver(() => decorateCanonicalTags());
  observer.observe(outletListElement, { childList: true, subtree: true });
  observer.observe(testListElement, { childList: true, subtree: true });

  const originalSave = save;
  save = function canonicalSystemSave() {
    ensureCanonicalCollections();
    originalSave();
    decorateCanonicalTags();
  };

  ensureCanonicalCollections();
  decorateCanonicalTags();
})();
