(() => {
  const FIXTURE_PROJECT_ID = '7b1c1a40-7b7f-4e70-9c0d-202609170001';
  const FIXTURE_OWNER_ID = '7b1c1a40-7b7f-4e70-9c0d-202609170099';
  const BROWSER_B_MARKER = 'MGS sync validation marker: browser-b';
  const FIXED_AT = '2026-09-17T15:00:00.000Z';
  const PHOTO_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

  const IDS = Object.freeze({
    alarm: '7b1c1a40-7b7f-4e70-9c0d-202609170101',
    outlet: '7b1c1a40-7b7f-4e70-9c0d-202609170102',
    test: '7b1c1a40-7b7f-4e70-9c0d-202609170103',
    valve: '7b1c1a40-7b7f-4e70-9c0d-202609170104',
    photo: '7b1c1a40-7b7f-4e70-9c0d-202609170105'
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sameSet(left, right) {
    const a = [...new Set(left || [])].sort();
    const b = [...new Set(right || [])].sort();
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  function check(name, passed, detail = '') {
    return { name, passed: Boolean(passed), detail: detail || '' };
  }

  function summarize(checks) {
    const failed = checks.filter(item => !item.passed);
    return {
      passed: failed.length === 0,
      checks,
      failed: failed.map(item => item.name)
    };
  }

  function buildFixture(overrides = {}) {
    const base = {
      id: FIXTURE_PROJECT_ID,
      name: 'MGS Cloud Sync Validation',
      facility: 'Development Test Facility',
      location: 'Level 2',
      notes: 'Deterministic development-only fixture for selected-project sync validation.',
      fieldNotes: 'Browser A baseline',
      systemScope: ['oxygen', 'medicalAir'],
      systemScopeOther: '',
      projectSchemaVersion: 1,
      updatedAt: FIXED_AT,
      alarms: [{
        id: IDS.alarm,
        type: 'Area alarm',
        location: 'Level 2 nurse station',
        serves: 'Oxygen and Medical Air',
        status: 'Pass',
        notes: 'Validation fixture alarm',
        systemIds: ['oxygen', 'medicalAir'],
        recordSchemaVersion: 1,
        updatedAt: FIXED_AT
      }],
      outlets: [{
        id: IDS.outlet,
        gas: 'Oxygen',
        location: 'Room 204 headwall',
        identifier: 'O2-204-A',
        status: 'Pass',
        notes: 'Validation fixture outlet',
        systemIds: ['oxygen'],
        recordSchemaVersion: 1,
        updatedAt: FIXED_AT
      }],
      tests: [{
        id: IDS.test,
        type: 'Alarm functional test',
        system: 'Medical Air',
        location: 'Level 2',
        date: '2026-09-17',
        status: 'Pass',
        person: 'Validation Technician',
        reading: 'MGS-VAL-TEST-001',
        notes: 'Validation fixture test',
        systemIds: ['medicalAir'],
        recordSchemaVersion: 1,
        updatedAt: FIXED_AT
      }],
      valves: [{
        id: IDS.valve,
        type: 'Zone valve box',
        location: 'Level 2 corridor',
        identifier: 'ZVB-L2-01',
        serves: 'Rooms 201-210',
        status: 'Pass',
        notes: 'Validation fixture valve/control',
        systemIds: ['medicalAir'],
        recordSchemaVersion: 1,
        updatedAt: FIXED_AT
      }],
      photos: [{
        id: IDS.photo,
        caption: 'Area alarm validation photo',
        location: 'Level 2 nurse station',
        notes: 'Photo bytes must stay out of Postgres.',
        dataUrl: PHOTO_DATA_URL,
        systemIds: ['oxygen'],
        recordSchemaVersion: 1,
        updatedAt: FIXED_AT
      }],
      tasks: [{
        id: 'validation-manual-1',
        text: 'Confirm validation fixture handoff data',
        done: true,
        completedAt: FIXED_AT,
        updatedAt: FIXED_AT
      }],
      scopeFieldChecklist: {
        'oxygen:source': { status: 'done', completedAt: FIXED_AT, updatedAt: FIXED_AT },
        'medicalAir:testing': { status: 'open', completedAt: null, updatedAt: FIXED_AT }
      },
      verifierReadiness: { status: 'in-progress' },
      verifierEvidence: { validationFixture: true },
      handoffMetadata: {
        projectNumber: 'MGS-VAL-001',
        installerCompany: 'MGS Development',
        installerContact: 'Development fixture',
        verifierName: '',
        verifierCompany: '',
        ahjName: '',
        ahjContact: '',
        reportId: 'VAL-RPT-001',
        documentSet: 'Validation drawing set A',
        fieldStates: {
          verifierName: 'na',
          verifierCompany: 'na',
          ahjName: 'na',
          ahjContact: 'na'
        },
        updatedAt: FIXED_AT
      }
    };
    return { ...clone(base), ...clone(overrides) };
  }

  function requireContract() {
    if (!window.MGSSupabaseSyncContract?.projectToSyncBundle) {
      throw new Error('MGS Supabase sync contract is not loaded.');
    }
    return window.MGSSupabaseSyncContract;
  }

  function requireSync() {
    if (!window.MGSSupabaseSync?.syncProject) {
      throw new Error('MGS Supabase local sync adapter is not loaded.');
    }
    return window.MGSSupabaseSync;
  }

  function databasePayload(bundle) {
    return {
      project: bundle.project,
      projectSystems: bundle.projectSystems,
      fieldRecords: bundle.fieldRecords,
      recordSystems: bundle.recordSystems,
      closeoutItems: bundle.closeoutItems,
      checklistItems: bundle.checklistItems
    };
  }

  function systemsForRecord(bundle, recordId) {
    return bundle.recordSystems
      .filter(row => row.record_id === recordId)
      .map(row => row.system_id);
  }

  function runContractPreflight(project = buildFixture()) {
    const bundle = requireContract().projectToSyncBundle(project, { ownerUserId: FIXTURE_OWNER_ID });
    const serializedDbPayload = JSON.stringify(databasePayload(bundle));
    const kinds = bundle.fieldRecords.map(row => row.kind);
    const photoRecord = bundle.fieldRecords.find(row => row.id === IDS.photo);
    const verifierName = bundle.closeoutItems.find(row => row.item_key === 'verifierName');
    const generatedDone = bundle.checklistItems.find(row => row.checklist_key === 'oxygen:source');

    const checks = [
      check('project systems are Oxygen + Medical Air', sameSet(bundle.projectSystems.map(row => row.system_id), ['oxygen', 'medicalAir'])),
      check('all five validation field-record kinds are mapped', sameSet(kinds, ['alarm', 'outlet', 'test', 'valve', 'photo'])),
      check('alarm keeps both canonical system tags', sameSet(systemsForRecord(bundle, IDS.alarm), ['oxygen', 'medicalAir'])),
      check('outlet keeps Oxygen tag', sameSet(systemsForRecord(bundle, IDS.outlet), ['oxygen'])),
      check('test keeps Medical Air tag', sameSet(systemsForRecord(bundle, IDS.test), ['medicalAir'])),
      check('valve keeps Medical Air tag', sameSet(systemsForRecord(bundle, IDS.valve), ['medicalAir'])),
      check('photo keeps Oxygen tag', sameSet(systemsForRecord(bundle, IDS.photo), ['oxygen'])),
      check('photo bytes are absent from Postgres payload', !serializedDbPayload.includes('data:image/') && !serializedDbPayload.includes('dataUrl')),
      check('photo row is marked attachmentPending', photoRecord?.payload?.attachmentPending === true),
      check('photo bytes are staged separately for Storage', bundle.legacyPhotoAttachments.length === 1 && bundle.legacyPhotoAttachments[0].data_url === PHOTO_DATA_URL),
      check('optional verifier name is preserved as N/A', verifierName?.status === 'na' && verifierName?.requirement_level === 'optional'),
      check('generated checklist completion is mapped', generatedDone?.status === 'done' && Boolean(generatedDone?.completed_at))
    ];

    return { ...summarize(checks), bundle };
  }

  function activeRows(rows) {
    return (rows || []).filter(row => !row.deleted_at);
  }

  function maxRevision(snapshot) {
    const rows = [
      snapshot?.project,
      ...(snapshot?.projectSystems || []),
      ...(snapshot?.fieldRecords || []),
      ...(snapshot?.recordSystems || []),
      ...(snapshot?.closeoutItems || []),
      ...(snapshot?.checklistItems || [])
    ].filter(Boolean);
    return rows.reduce((max, row) => Math.max(max, Number(row.revision) || 0), 0);
  }

  function snapshotSystemsForRecord(snapshot, recordId) {
    return activeRows(snapshot?.recordSystems)
      .filter(row => row.record_id === recordId)
      .map(row => row.system_id);
  }

  function verifyCloudSnapshot(snapshot, options = {}) {
    const activeFieldRecords = activeRows(snapshot?.fieldRecords);
    const photoRecord = activeFieldRecords.find(row => row.id === IDS.photo);
    const verifierName = activeRows(snapshot?.closeoutItems).find(row => row.item_key === 'verifierName');
    const generatedDone = activeRows(snapshot?.checklistItems).find(row => row.checklist_key === 'oxygen:source');
    const serializedFieldRecords = JSON.stringify(activeFieldRecords);
    const expectedMarker = options.expectBrowserBMarker ? BROWSER_B_MARKER : null;

    const checks = [
      check('cloud project exists', snapshot?.project?.id === FIXTURE_PROJECT_ID && !snapshot?.project?.deleted_at),
      check('cloud project scope is preserved', sameSet(activeRows(snapshot?.projectSystems).map(row => row.system_id), ['oxygen', 'medicalAir'])),
      check('cloud field records include all validation records', sameSet(activeFieldRecords.map(row => row.id), Object.values(IDS))),
      check('cloud alarm system tags are preserved', sameSet(snapshotSystemsForRecord(snapshot, IDS.alarm), ['oxygen', 'medicalAir'])),
      check('cloud outlet system tag is preserved', sameSet(snapshotSystemsForRecord(snapshot, IDS.outlet), ['oxygen'])),
      check('cloud test system tag is preserved', sameSet(snapshotSystemsForRecord(snapshot, IDS.test), ['medicalAir'])),
      check('cloud valve system tag is preserved', sameSet(snapshotSystemsForRecord(snapshot, IDS.valve), ['medicalAir'])),
      check('cloud photo system tag is preserved', sameSet(snapshotSystemsForRecord(snapshot, IDS.photo), ['oxygen'])),
      check('cloud photo metadata is present', photoRecord?.payload?.caption === 'Area alarm validation photo'),
      check('photo bytes never entered field_records payload', !serializedFieldRecords.includes('data:image/') && !serializedFieldRecords.includes('dataUrl')),
      check('cloud optional closeout N/A survived', verifierName?.status === 'na'),
      check('cloud generated checklist completion survived', generatedDone?.status === 'done'),
      check('server revision advanced above zero', maxRevision(snapshot) > 0)
    ];

    if (expectedMarker) {
      checks.push(check('Browser B marker reached cloud project', snapshot?.project?.field_notes === expectedMarker));
    }

    return { ...summarize(checks), revision: maxRevision(snapshot) };
  }

  function verifyLocalProject(project, options = {}) {
    const photo = (project?.photos || []).find(row => row.id === IDS.photo);
    const verifierState = project?.handoffMetadata?.fieldStates?.verifierName;
    const generatedDone = project?.scopeFieldChecklist?.['oxygen:source'];
    const expectedMarker = options.expectBrowserBMarker ? BROWSER_B_MARKER : null;
    const checks = [
      check('local project id is preserved', project?.id === FIXTURE_PROJECT_ID),
      check('local project scope is preserved', sameSet(project?.systemScope, ['oxygen', 'medicalAir'])),
      check('local alarm exists', (project?.alarms || []).some(row => row.id === IDS.alarm)),
      check('local outlet exists', (project?.outlets || []).some(row => row.id === IDS.outlet)),
      check('local test exists', (project?.tests || []).some(row => row.id === IDS.test)),
      check('local valve exists', (project?.valves || []).some(row => row.id === IDS.valve)),
      check('local photo metadata exists', photo?.caption === 'Area alarm validation photo'),
      check('local optional closeout N/A is preserved', verifierState === 'na'),
      check('local generated checklist completion is preserved', generatedDone?.status === 'done')
    ];

    if (options.requireLocalPhotoBytes) {
      checks.push(check('same-device photo bytes remain local', Boolean(photo?.dataUrl)));
    }
    if (expectedMarker) {
      checks.push(check('Browser B marker is present locally', project?.fieldNotes === expectedMarker));
    }

    return summarize(checks);
  }

  function installFixture() {
    if (typeof state === 'undefined' || typeof save !== 'function') {
      throw new Error('MGS local workspace is not available on this page.');
    }
    const fixture = buildFixture();
    const index = state.projects.findIndex(project => project.id === FIXTURE_PROJECT_ID);
    if (index >= 0) state.projects[index] = fixture;
    else state.projects.push(fixture);
    state.selectedProjectId = FIXTURE_PROJECT_ID;
    save();
    return fixture;
  }

  function localFixture() {
    if (typeof state === 'undefined') return null;
    return state.projects.find(project => project.id === FIXTURE_PROJECT_ID) || null;
  }

  async function requireSignedInSession() {
    const sync = requireSync();
    if (!sync.isEnabled()) throw new Error('Enable MGS cloud sync before running the live validation.');
    const session = await sync.getSession();
    if (!session?.user?.id) throw new Error('Sign in to Supabase before running the live validation.');
    return session;
  }

  async function runBrowserAPush() {
    const sync = requireSync();
    const session = await requireSignedInSession();
    const fixture = installFixture();
    const preflight = runContractPreflight(fixture);
    if (!preflight.passed) throw new Error(`Contract preflight failed: ${preflight.failed.join(', ')}`);

    const beforeCursor = sync.cursorFor(session.user.id, FIXTURE_PROJECT_ID);
    const result = await sync.syncProject(fixture);
    const snapshot = await sync.pullProjectSnapshot(FIXTURE_PROJECT_ID);
    const cloud = verifyCloudSnapshot(snapshot);
    const afterCursor = sync.cursorFor(session.user.id, FIXTURE_PROJECT_ID);
    const cursor = summarize([
      check('Browser A sync cursor did not move backward', afterCursor >= beforeCursor, `${beforeCursor} -> ${afterCursor}`),
      check('Browser A sync cursor acknowledges returned revision', afterCursor >= result.revision, `${afterCursor} >= ${result.revision}`)
    ]);

    return { phase: 'browser-a-push', preflight, cloud, cursor, result };
  }

  async function runBrowserBModifyAndSync() {
    const sync = requireSync();
    const session = await requireSignedInSession();
    const beforeCursor = sync.cursorFor(session.user.id, FIXTURE_PROJECT_ID);
    const snapshot = await sync.pullProjectSnapshot(FIXTURE_PROJECT_ID);
    const initialCloud = verifyCloudSnapshot(snapshot);
    if (!initialCloud.passed) throw new Error(`Browser B pull validation failed: ${initialCloud.failed.join(', ')}`);

    const pulled = sync.applySnapshotToLocal(snapshot);
    pulled.fieldNotes = BROWSER_B_MARKER;
    pulled.updatedAt = new Date().toISOString();
    if (typeof save !== 'function') throw new Error('MGS local save path is not available.');
    save();

    const result = await sync.syncProject(pulled);
    const returned = await sync.pullProjectSnapshot(FIXTURE_PROJECT_ID);
    const cloud = verifyCloudSnapshot(returned, { expectBrowserBMarker: true });
    const local = verifyLocalProject(localFixture(), { expectBrowserBMarker: true });
    const afterCursor = sync.cursorFor(session.user.id, FIXTURE_PROJECT_ID);
    const cursor = summarize([
      check('Browser B sync cursor did not move backward', afterCursor >= beforeCursor, `${beforeCursor} -> ${afterCursor}`),
      check('Browser B change produced a newer server revision', cloud.revision > initialCloud.revision, `${initialCloud.revision} -> ${cloud.revision}`),
      check('Browser B cursor acknowledges returned revision', afterCursor >= result.revision, `${afterCursor} >= ${result.revision}`)
    ]);

    return { phase: 'browser-b-modify-sync', initialCloud, cloud, local, cursor, result };
  }

  async function runBrowserAVerifyReturn() {
    const sync = requireSync();
    await requireSignedInSession();
    const snapshot = await sync.pullProjectSnapshot(FIXTURE_PROJECT_ID);
    const cloud = verifyCloudSnapshot(snapshot, { expectBrowserBMarker: true });
    if (!cloud.passed) throw new Error(`Browser A return validation failed: ${cloud.failed.join(', ')}`);
    const rebuilt = sync.applySnapshotToLocal(snapshot);
    const local = verifyLocalProject(rebuilt, { expectBrowserBMarker: true, requireLocalPhotoBytes: true });
    return { phase: 'browser-a-verify-return', cloud, local, revision: cloud.revision };
  }

  window.MGSSyncValidation = Object.freeze({
    fixtureProjectId: FIXTURE_PROJECT_ID,
    browserBMarker: BROWSER_B_MARKER,
    buildFixture,
    installFixture,
    runContractPreflight,
    verifyCloudSnapshot,
    verifyLocalProject,
    runBrowserAPush,
    runBrowserBModifyAndSync,
    runBrowserAVerifyReturn
  });
})();
