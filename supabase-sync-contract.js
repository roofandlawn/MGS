(() => {
  const CONTRACT_VERSION = 1;
  const PROJECT_SCHEMA_VERSION = 1;
  const RECORD_SCHEMA_VERSION = 1;
  const SYSTEM_IDS = new Set([
    'oxygen',
    'medicalAir',
    'medicalVacuum',
    'wagd',
    'nitrousOxide',
    'nitrogen',
    'instrumentAir',
    'carbonDioxide'
  ]);
  const RECORD_GROUPS = [
    ['alarms', 'alarm'],
    ['outlets', 'outlet'],
    ['tests', 'test'],
    ['photos', 'photo'],
    ['valves', 'valve']
  ];
  const CLOSEOUT_FIELDS = [
    ['projectNumber', 'required'],
    ['installerCompany', 'required'],
    ['installerContact', 'optional'],
    ['verifierName', 'optional'],
    ['verifierCompany', 'optional'],
    ['ahjName', 'optional'],
    ['ahjContact', 'optional'],
    ['reportId', 'optional'],
    ['documentSet', 'required']
  ];

  function cleanString(value) {
    return String(value ?? '').trim();
  }

  function cleanSystemIds(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(String)
      .filter(value => SYSTEM_IDS.has(value)))];
  }

  function isoOrNull(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  function recordTimestamp(record) {
    return isoOrNull(record?.updatedAt)
      || isoOrNull(record?.systemTagsUpdatedAt)
      || isoOrNull(record?.addedAt)
      || isoOrNull(record?.createdAt);
  }

  function stripPhotoBytes(record) {
    if (!record || typeof record !== 'object') return {};
    const { dataUrl, ...payload } = record;
    return {
      ...payload,
      attachmentPending: Boolean(dataUrl)
    };
  }

  function workflowState(project) {
    return {
      tasks: Array.isArray(project?.tasks) ? project.tasks : [],
      scopeFieldChecklist: project?.scopeFieldChecklist && typeof project.scopeFieldChecklist === 'object'
        ? project.scopeFieldChecklist
        : {},
      verifierReadiness: project?.verifierReadiness && typeof project.verifierReadiness === 'object'
        ? project.verifierReadiness
        : {},
      verifierEvidence: project?.verifierEvidence && typeof project.verifierEvidence === 'object'
        ? project.verifierEvidence
        : {}
    };
  }

  function closeoutRows(project) {
    const metadata = project?.handoffMetadata && typeof project.handoffMetadata === 'object'
      ? project.handoffMetadata
      : {};
    const states = metadata.fieldStates && typeof metadata.fieldStates === 'object'
      ? metadata.fieldStates
      : {};

    return CLOSEOUT_FIELDS.map(([itemKey, requirementLevel]) => {
      const valueText = cleanString(metadata[itemKey]);
      const na = requirementLevel === 'optional' && states[itemKey] === 'na';
      return {
        project_id: project.id,
        item_key: itemKey,
        requirement_level: requirementLevel,
        status: na ? 'na' : (valueText ? 'complete' : 'missing'),
        value_text: valueText || null,
        client_updated_at: isoOrNull(metadata.updatedAt)
      };
    });
  }

  function checklistRows(project) {
    const manual = (Array.isArray(project?.tasks) ? project.tasks : []).map(task => ({
      project_id: project.id,
      checklist_key: `manual:${task.id}`,
      checklist_type: 'manual',
      status: task.done ? 'done' : 'open',
      title: cleanString(task.text) || 'Checklist item',
      completed_at: task.done ? (isoOrNull(task.completedAt) || null) : null,
      client_updated_at: isoOrNull(task.updatedAt)
    }));

    const generated = Object.entries(
      project?.scopeFieldChecklist && typeof project.scopeFieldChecklist === 'object'
        ? project.scopeFieldChecklist
        : {}
    ).map(([key, item]) => ({
      project_id: project.id,
      checklist_key: key,
      checklist_type: 'generated',
      status: ['open', 'done', 'na'].includes(item?.status) ? item.status : 'open',
      title: null,
      completed_at: item?.status === 'done' ? isoOrNull(item.completedAt) : null,
      client_updated_at: isoOrNull(item?.updatedAt)
    }));

    return [...manual, ...generated];
  }

  function projectToSyncBundle(project, options = {}) {
    if (!project?.id) throw new Error('MGS sync requires a project id.');
    if (!options.ownerUserId) throw new Error('MGS sync requires ownerUserId from the authenticated Supabase user.');

    const projectSystems = cleanSystemIds(project.systemScope).map(systemId => ({
      project_id: project.id,
      system_id: systemId
    }));

    const fieldRecords = [];
    const recordSystems = [];
    const legacyPhotoAttachments = [];

    RECORD_GROUPS.forEach(([collection, kind]) => {
      (Array.isArray(project[collection]) ? project[collection] : []).forEach(record => {
        if (!record?.id) return;
        const payload = kind === 'photo' ? stripPhotoBytes(record) : { ...record };
        delete payload.systemIds;
        delete payload.systemOther;
        delete payload.recordSchemaVersion;
        delete payload.recordSchemaMigratedAt;

        fieldRecords.push({
          id: record.id,
          project_id: project.id,
          kind,
          payload,
          system_other: cleanString(record.systemOther) || null,
          schema_version: Number(record.recordSchemaVersion) || RECORD_SCHEMA_VERSION,
          client_updated_at: recordTimestamp(record)
        });

        cleanSystemIds(record.systemIds).forEach(systemId => recordSystems.push({
          record_id: record.id,
          system_id: systemId
        }));

        if (kind === 'photo' && record.dataUrl) {
          legacyPhotoAttachments.push({
            record_id: record.id,
            project_id: project.id,
            data_url: record.dataUrl,
            caption: cleanString(record.caption),
            location: cleanString(record.location),
            client_updated_at: recordTimestamp(record)
          });
        }
      });
    });

    return {
      contractVersion: CONTRACT_VERSION,
      project: {
        id: project.id,
        owner_user_id: options.ownerUserId,
        name: cleanString(project.name) || 'Untitled project',
        project_number: cleanString(project?.handoffMetadata?.projectNumber) || null,
        facility: cleanString(project.facility) || null,
        location: cleanString(project.location) || null,
        notes: cleanString(project.notes) || null,
        field_notes: cleanString(project.fieldNotes) || null,
        system_other: cleanString(project.systemScopeOther) || null,
        schema_version: Number(project.projectSchemaVersion) || PROJECT_SCHEMA_VERSION,
        workflow_state: workflowState(project),
        client_updated_at: isoOrNull(project.updatedAt) || isoOrNull(project.systemScopeUpdatedAt)
      },
      projectSystems,
      fieldRecords,
      recordSystems,
      closeoutItems: closeoutRows(project),
      checklistItems: checklistRows(project),
      legacyPhotoAttachments
    };
  }

  window.MGSSupabaseSyncContract = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    canonicalSystemIds: [...SYSTEM_IDS],
    projectToSyncBundle
  });
})();
