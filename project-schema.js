(() => {
  const APP_STORAGE_KEY = 'mgs-prototype-v3';
  const LEGACY_STORAGE_KEYS = [APP_STORAGE_KEY, 'mgs-prototype-v2', 'mgs-prototype-v1'];
  const CURRENT_STATE_SCHEMA_VERSION = 1;
  const CURRENT_PROJECT_SCHEMA_VERSION = 1;
  const CURRENT_RECORD_SCHEMA_VERSION = 1;

  const CANONICAL_SYSTEM_IDS = new Set([
    'oxygen',
    'medicalAir',
    'medicalVacuum',
    'wagd',
    'nitrousOxide',
    'nitrogen',
    'instrumentAir',
    'carbonDioxide'
  ]);

  const SYSTEM_ALIASES = [
    { id: 'oxygen', patterns: [/\boxygen\b/i, /\bo2\b/i] },
    { id: 'medicalAir', patterns: [/\bmedical\s*air\b/i, /\bmed\s*air\b/i] },
    { id: 'medicalVacuum', patterns: [/\bmedical[-\s]*surgical\s*vacuum\b/i, /\bmedical\s*vacuum\b/i, /\bmed\s*vacuum\b/i, /\bvacuum\b/i] },
    { id: 'wagd', patterns: [/\bwagd\b/i, /waste\s+anesthetic\s+gas/i] },
    { id: 'nitrousOxide', patterns: [/\bnitrous\s*oxide\b/i, /\bn2o\b/i] },
    { id: 'nitrogen', patterns: [/\bnitrogen\b/i, /\bn2\b/i] },
    { id: 'instrumentAir', patterns: [/\binstrument\s*air\b/i] },
    { id: 'carbonDioxide', patterns: [/\bcarbon\s*dioxide\b/i, /\bco2\b/i] }
  ];

  function cleanSystemIds(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(String)
      .filter(id => CANONICAL_SYSTEM_IDS.has(id)))];
  }

  function inferCanonicalSystemIds(value) {
    const text = String(value || '').trim();
    if (!text) return [];
    return SYSTEM_ALIASES
      .filter(entry => entry.patterns.some(pattern => pattern.test(text)))
      .map(entry => entry.id);
  }

  function explicitSystemIds(record, kind) {
    const existing = cleanSystemIds(record?.systemIds);
    if (existing.length) return { ids: existing, source: record.systemTagsSource || 'explicit' };
    if (CANONICAL_SYSTEM_IDS.has(record?.systemId)) return { ids: [record.systemId], source: record.systemTagsSource || 'legacy-systemId' };

    if (kind === 'outlet') {
      const inferred = inferCanonicalSystemIds(record?.gas);
      return { ids: inferred, source: inferred.length ? 'schema-migration:gas' : '' };
    }

    if (kind === 'test') {
      const inferred = inferCanonicalSystemIds(record?.system);
      return { ids: inferred, source: inferred.length ? 'schema-migration:system' : '' };
    }

    return { ids: [], source: record?.systemTagsSource || '' };
  }

  function normalizeRecord(record, kind, migratedAt) {
    const source = record && typeof record === 'object' ? record : {};
    const normalizedSystems = explicitSystemIds(source, kind);
    const systemOther = String(source.systemOther || '').trim();
    const hadFormalSchema = Number(source.recordSchemaVersion) >= CURRENT_RECORD_SCHEMA_VERSION;

    return {
      ...source,
      systemIds: normalizedSystems.ids,
      systemOther,
      systemTagsSource: normalizedSystems.source,
      systemTagsUpdatedAt: source.systemTagsUpdatedAt || (normalizedSystems.source.startsWith('schema-migration:') ? migratedAt : null),
      recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
      recordSchemaMigratedAt: source.recordSchemaMigratedAt || (hadFormalSchema ? null : migratedAt)
    };
  }

  function normalizeTask(task) {
    const source = task && typeof task === 'object' ? task : {};
    return { ...source, done: Boolean(source.done) };
  }

  function migrateProject(project, migratedAt) {
    const source = project && typeof project === 'object' ? project : {};
    const hadFormalSchema = Number(source.projectSchemaVersion) >= CURRENT_PROJECT_SCHEMA_VERSION;

    return {
      ...source,
      tasks: Array.isArray(source.tasks) ? source.tasks.map(normalizeTask) : [],
      alarms: (Array.isArray(source.alarms) ? source.alarms : []).map(record => normalizeRecord(record, 'alarm', migratedAt)),
      outlets: (Array.isArray(source.outlets) ? source.outlets : []).map(record => normalizeRecord(record, 'outlet', migratedAt)),
      tests: (Array.isArray(source.tests) ? source.tests : []).map(record => normalizeRecord(record, 'test', migratedAt)),
      photos: (Array.isArray(source.photos) ? source.photos : []).map(record => normalizeRecord(record, 'photo', migratedAt)),
      valves: (Array.isArray(source.valves) ? source.valves : []).map(record => normalizeRecord(record, 'valve', migratedAt)),
      fieldNotes: source.fieldNotes || '',
      systemScope: cleanSystemIds(source.systemScope),
      systemScopeOther: String(source.systemScopeOther || '').trim(),
      systemScopeUpdatedAt: source.systemScopeUpdatedAt || null,
      projectSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      projectSchemaMigratedAt: source.projectSchemaMigratedAt || (hadFormalSchema ? null : migratedAt),
      dataModel: 'mgs-project-record-v1'
    };
  }

  function legacyVersionForKey(key) {
    if (key === 'mgs-prototype-v1') return 1;
    if (key === 'mgs-prototype-v2') return 2;
    if (key === 'mgs-prototype-v3') return 3;
    return null;
  }

  function migrateState(rawState, options = {}) {
    const source = rawState && typeof rawState === 'object' ? rawState : {};
    const sourceKey = options.sourceKey || APP_STORAGE_KEY;
    const migratedAt = options.migratedAt || new Date().toISOString();
    const hadFormalSchema = Number(source.dataSchemaVersion) >= CURRENT_STATE_SCHEMA_VERSION;
    const sourceProjects = Array.isArray(source.projects) ? source.projects : [];

    const projects = sourceProjects.map((project, index) => {
      const withLegacyTasks = {
        ...project,
        tasks: Array.isArray(project?.tasks)
          ? project.tasks
          : (sourceKey === 'mgs-prototype-v1' && index === 0 && Array.isArray(source.tasks) ? source.tasks : [])
      };
      return migrateProject(withLegacyTasks, migratedAt);
    });

    const selectedExists = projects.some(project => project.id === source.selectedProjectId);
    const selectedProjectId = selectedExists ? source.selectedProjectId : (projects[0]?.id || null);

    return {
      ...source,
      projects,
      selectedProjectId,
      dataSchemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      dataSchemaMigratedAt: source.dataSchemaMigratedAt || (hadFormalSchema ? null : migratedAt),
      dataModel: 'mgs-project-state-v1',
      migrationSource: source.migrationSource || {
        storageKey: sourceKey,
        legacyStorageVersion: legacyVersionForKey(sourceKey)
      }
    };
  }

  function parseStorage(storage, key) {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && Array.isArray(parsed.projects) ? parsed : null;
    } catch (error) {
      console.warn(`MGS could not parse saved project data from ${key}.`, error);
      return null;
    }
  }

  function loadAndMigrate(storage) {
    for (const key of LEGACY_STORAGE_KEYS) {
      const parsed = parseStorage(storage, key);
      if (!parsed) continue;
      const state = migrateState(parsed, { sourceKey: key });
      storage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
      return { state, sourceKey: key, migrated: true };
    }
    return { state: null, sourceKey: null, migrated: false };
  }

  function prepareStateForSave(state) {
    return migrateState(state, { sourceKey: APP_STORAGE_KEY });
  }

  window.MGSProjectSchema = Object.freeze({
    storageKey: APP_STORAGE_KEY,
    legacyStorageKeys: [...LEGACY_STORAGE_KEYS],
    stateSchemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    projectSchemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    recordSchemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
    canonicalSystemIds: [...CANONICAL_SYSTEM_IDS],
    cleanSystemIds,
    inferCanonicalSystemIds,
    migrateState,
    prepareStateForSave,
    loadAndMigrate
  });

  try {
    window.__MGS_SCHEMA_BOOTSTRAP__ = loadAndMigrate(localStorage);
  } catch (error) {
    console.warn('MGS project schema migration could not access browser storage.', error);
  }
})();
