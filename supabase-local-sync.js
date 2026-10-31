(() => {
  const CONFIG_KEY = 'mgs-supabase-config-v1';
  const META_KEY = 'mgs-supabase-sync-meta-v1';
  const DEFAULT_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const TABLES = {
    projects: 'projects',
    systems: 'project_systems',
    records: 'field_records',
    recordSystems: 'record_systems',
    closeout: 'project_closeout_items',
    checklist: 'project_checklist_items'
  };
  const RECORD_COLLECTIONS = {
    alarm: 'alarms',
    outlet: 'outlets',
    test: 'tests',
    photo: 'photos',
    valve: 'valves',
    note: 'notes'
  };

  let clientPromise = null;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function currentConfig() {
    const stored = readJson(CONFIG_KEY, {});
    const runtime = window.MGS_SUPABASE_CONFIG && typeof window.MGS_SUPABASE_CONFIG === 'object'
      ? window.MGS_SUPABASE_CONFIG
      : {};
    return {
      ...stored,
      ...runtime,
      enabled: Boolean(runtime.enabled ?? stored.enabled),
      url: String(runtime.url ?? stored.url ?? '').replace(/\/$/, ''),
      anonKey: String(runtime.anonKey ?? stored.anonKey ?? ''),
      sdkUrl: String(runtime.sdkUrl ?? stored.sdkUrl ?? DEFAULT_SDK_URL)
    };
  }

  function assertEnabled() {
    const config = currentConfig();
    if (!config.enabled) throw new Error('MGS cloud sync is disabled by feature flag.');
    if (!config.url || !config.anonKey) {
      throw new Error('MGS cloud sync needs a Supabase URL and anon key.');
    }
    return config;
  }

  function loadSupabaseSdk(sdkUrl) {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-mgs-supabase-sdk]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Supabase SDK failed to load.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.dataset.mgsSupabaseSdk = 'true';
      script.onload = () => window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error('Supabase SDK loaded without createClient().'));
      script.onerror = () => reject(new Error('Supabase SDK failed to load.'));
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    const config = assertEnabled();
    if (!clientPromise) {
      clientPromise = loadSupabaseSdk(config.sdkUrl).then(sdk => sdk.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }));
    }
    return clientPromise;
  }

  async function getSession() {
    const client = await getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function requireSession() {
    const session = await getSession();
    if (!session?.user?.id) throw new Error('Sign in before syncing this project.');
    return session;
  }

  async function signInWithOtp(email, redirectTo = location.href.split('#')[0]) {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithOtp({
      email: String(email || '').trim(),
      options: { emailRedirectTo: redirectTo }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const client = await getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  function meta() {
    return readJson(META_KEY, { users: {} });
  }

  function updateCursor(userId, projectId, revision) {
    const value = meta();
    value.users[userId] ||= { projects: {} };
    value.users[userId].projects ||= {};
    value.users[userId].projects[projectId] = {
      ...(value.users[userId].projects[projectId] || {}),
      cursor: Number(revision) || 0,
      syncedAt: new Date().toISOString()
    };
    writeJson(META_KEY, value);
  }

  function cursorFor(userId, projectId) {
    return Number(meta()?.users?.[userId]?.projects?.[projectId]?.cursor) || 0;
  }

  function withActiveRow(row) {
    return { ...row, deleted_at: null };
  }

  async function upsertRows(client, table, rows, onConflict) {
    if (!rows.length) return [];
    const { data, error } = await client
      .from(table)
      .upsert(rows.map(withActiveRow), { onConflict })
      .select();
    if (error) throw error;
    return data || [];
  }

  async function tombstoneByProject(client, table, projectId, keyField, keepValues) {
    const { data, error } = await client
      .from(table)
      .select(`${keyField},deleted_at`)
      .eq('project_id', projectId);
    if (error) throw error;
    const keep = new Set(keepValues.map(String));
    const stale = (data || []).filter(row => !row.deleted_at && !keep.has(String(row[keyField])));
    if (!stale.length) return 0;
    const now = new Date().toISOString();
    for (const row of stale) {
      const { error: updateError } = await client
        .from(table)
        .update({ deleted_at: now, client_updated_at: now })
        .eq('project_id', projectId)
        .eq(keyField, row[keyField]);
      if (updateError) throw updateError;
    }
    return stale.length;
  }

  async function tombstoneRecords(client, projectId, keepIds) {
    const { data, error } = await client
      .from(TABLES.records)
      .select('id,deleted_at')
      .eq('project_id', projectId);
    if (error) throw error;
    const keep = new Set(keepIds.map(String));
    const stale = (data || []).filter(row => !row.deleted_at && !keep.has(String(row.id)));
    if (!stale.length) return 0;
    const now = new Date().toISOString();
    for (const row of stale) {
      const { error: updateError } = await client
        .from(TABLES.records)
        .update({ deleted_at: now, client_updated_at: now })
        .eq('id', row.id);
      if (updateError) throw updateError;
    }
    return stale.length;
  }

  async function replaceRecordSystems(client, rows, recordIds) {
    if (!recordIds.length) return;
    await upsertRows(client, TABLES.recordSystems, rows, 'record_id,system_id');
    const { data, error } = await client
      .from(TABLES.recordSystems)
      .select('record_id,system_id,deleted_at')
      .in('record_id', recordIds);
    if (error) throw error;

    const keep = new Set(rows.map(row => `${row.record_id}:${row.system_id}`));
    const stale = (data || []).filter(row => !row.deleted_at && !keep.has(`${row.record_id}:${row.system_id}`));
    const now = new Date().toISOString();
    for (const row of stale) {
      const { error: updateError } = await client
        .from(TABLES.recordSystems)
        .update({ deleted_at: now, client_updated_at: now })
        .eq('record_id', row.record_id)
        .eq('system_id', row.system_id);
      if (updateError) throw updateError;
    }
  }

  async function existingOwner(client, projectId, fallbackUserId) {
    const { data, error } = await client
      .from(TABLES.projects)
      .select('owner_user_id')
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw error;
    return data?.owner_user_id || fallbackUserId;
  }

  async function pushProject(project) {
    if (!window.MGSSupabaseSyncContract?.projectToSyncBundle) {
      throw new Error('MGS Supabase sync contract is not loaded.');
    }
    const client = await getClient();
    const session = await requireSession();
    const ownerUserId = await existingOwner(client, project.id, session.user.id);
    const bundle = window.MGSSupabaseSyncContract.projectToSyncBundle(project, { ownerUserId });

    await upsertRows(client, TABLES.projects, [bundle.project], 'id');
    await upsertRows(client, TABLES.systems, bundle.projectSystems, 'project_id,system_id');
    await tombstoneByProject(client, TABLES.systems, project.id, 'system_id', bundle.projectSystems.map(row => row.system_id));

    await upsertRows(client, TABLES.records, bundle.fieldRecords, 'id');
    await tombstoneRecords(client, project.id, bundle.fieldRecords.map(row => row.id));
    await replaceRecordSystems(client, bundle.recordSystems, bundle.fieldRecords.map(row => row.id));

    await upsertRows(client, TABLES.closeout, bundle.closeoutItems, 'project_id,item_key');
    await tombstoneByProject(client, TABLES.closeout, project.id, 'item_key', bundle.closeoutItems.map(row => row.item_key));

    await upsertRows(client, TABLES.checklist, bundle.checklistItems, 'project_id,checklist_key');
    await tombstoneByProject(client, TABLES.checklist, project.id, 'checklist_key', bundle.checklistItems.map(row => row.checklist_key));

    return {
      projectId: project.id,
      pendingPhotoUploads: bundle.legacyPhotoAttachments.length,
      pushedRecords: bundle.fieldRecords.length
    };
  }

  async function pullProjectSnapshot(projectId) {
    const client = await getClient();
    await requireSession();
    const read = async (table, query) => {
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    };

    const projectRows = await read(TABLES.projects, client.from(TABLES.projects).select('*').eq('id', projectId));
    if (!projectRows.length || projectRows[0].deleted_at) throw new Error('Project was not found in cloud sync.');

    const fieldRecords = await read(TABLES.records, client.from(TABLES.records).select('*').eq('project_id', projectId));
    const recordIds = fieldRecords.map(row => row.id);
    const recordSystems = recordIds.length
      ? await read(TABLES.recordSystems, client.from(TABLES.recordSystems).select('*').in('record_id', recordIds))
      : [];

    return {
      project: projectRows[0],
      projectSystems: await read(TABLES.systems, client.from(TABLES.systems).select('*').eq('project_id', projectId)),
      fieldRecords,
      recordSystems,
      closeoutItems: await read(TABLES.closeout, client.from(TABLES.closeout).select('*').eq('project_id', projectId)),
      checklistItems: await read(TABLES.checklist, client.from(TABLES.checklist).select('*').eq('project_id', projectId))
    };
  }

  function maxRevision(snapshot) {
    const rows = [
      snapshot.project,
      ...snapshot.projectSystems,
      ...snapshot.fieldRecords,
      ...snapshot.recordSystems,
      ...snapshot.closeoutItems,
      ...snapshot.checklistItems
    ];
    return rows.reduce((max, row) => Math.max(max, Number(row?.revision) || 0), 0);
  }

  function rebuildProject(localProject, snapshot) {
    const remote = snapshot.project;
    const activeSystems = snapshot.projectSystems.filter(row => !row.deleted_at).map(row => row.system_id);
    const activeRecordSystems = snapshot.recordSystems.filter(row => !row.deleted_at);
    const systemsByRecord = activeRecordSystems.reduce((map, row) => {
      (map[row.record_id] ||= []).push(row.system_id);
      return map;
    }, {});

    const rebuilt = {
      ...(localProject || {}),
      id: remote.id,
      name: remote.name,
      facility: remote.facility || '',
      location: remote.location || '',
      notes: remote.notes || '',
      fieldNotes: remote.field_notes || '',
      systemScope: activeSystems,
      systemScopeOther: remote.system_other || '',
      projectSchemaVersion: Number(remote.schema_version) || 1,
      updatedAt: remote.client_updated_at || remote.updated_at || new Date().toISOString()
    };

    Object.values(RECORD_COLLECTIONS).forEach(collection => {
      if (collection !== 'notes') rebuilt[collection] = [];
    });

    const localPhotos = new Map((localProject?.photos || []).map(photo => [photo.id, photo]));
    snapshot.fieldRecords.filter(row => !row.deleted_at).forEach(row => {
      const collection = RECORD_COLLECTIONS[row.kind];
      if (!collection || collection === 'notes') return;
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const localPhoto = row.kind === 'photo' ? localPhotos.get(row.id) : null;
      rebuilt[collection].push({
        ...(localPhoto?.dataUrl ? { dataUrl: localPhoto.dataUrl } : {}),
        ...payload,
        id: row.id,
        systemIds: systemsByRecord[row.id] || [],
        systemOther: row.system_other || '',
        recordSchemaVersion: Number(row.schema_version) || 1,
        updatedAt: row.client_updated_at || row.updated_at || payload.updatedAt
      });
    });

    const workflow = remote.workflow_state && typeof remote.workflow_state === 'object' ? remote.workflow_state : {};
    rebuilt.tasks = Array.isArray(workflow.tasks) ? workflow.tasks : (rebuilt.tasks || []);
    rebuilt.scopeFieldChecklist = workflow.scopeFieldChecklist && typeof workflow.scopeFieldChecklist === 'object'
      ? workflow.scopeFieldChecklist
      : (rebuilt.scopeFieldChecklist || {});
    rebuilt.verifierReadiness = workflow.verifierReadiness && typeof workflow.verifierReadiness === 'object'
      ? workflow.verifierReadiness
      : (rebuilt.verifierReadiness || {});
    rebuilt.verifierEvidence = workflow.verifierEvidence && typeof workflow.verifierEvidence === 'object'
      ? workflow.verifierEvidence
      : (rebuilt.verifierEvidence || {});

    snapshot.checklistItems.filter(row => !row.deleted_at).forEach(row => {
      if (row.checklist_type === 'manual' && row.checklist_key.startsWith('manual:')) {
        const id = row.checklist_key.slice('manual:'.length);
        const existing = rebuilt.tasks.find(task => task.id === id);
        const next = {
          id,
          text: row.title || existing?.text || 'Checklist item',
          done: row.status === 'done',
          completedAt: row.completed_at || null,
          updatedAt: row.client_updated_at || row.updated_at || null
        };
        if (existing) Object.assign(existing, next);
        else rebuilt.tasks.push(next);
      } else if (row.checklist_type === 'generated') {
        rebuilt.scopeFieldChecklist[row.checklist_key] = {
          ...(rebuilt.scopeFieldChecklist[row.checklist_key] || {}),
          status: row.status,
          completedAt: row.completed_at || null,
          updatedAt: row.client_updated_at || row.updated_at || null
        };
      }
    });

    const handoff = {
      ...(localProject?.handoffMetadata || {}),
      projectNumber: remote.project_number || localProject?.handoffMetadata?.projectNumber || '',
      fieldStates: { ...(localProject?.handoffMetadata?.fieldStates || {}) }
    };
    snapshot.closeoutItems.filter(row => !row.deleted_at).forEach(row => {
      handoff[row.item_key] = row.value_text || '';
      if (row.requirement_level === 'optional') {
        handoff.fieldStates[row.item_key] = row.status === 'na' ? 'na' : 'applicable';
      }
    });
    rebuilt.handoffMetadata = handoff;
    return rebuilt;
  }

  function applySnapshotToLocal(snapshot) {
    if (typeof state === 'undefined' || typeof save !== 'function') {
      throw new Error('MGS local workspace is not available on this page.');
    }
    const index = state.projects.findIndex(project => project.id === snapshot.project.id);
    const local = index >= 0 ? state.projects[index] : null;
    const rebuilt = rebuildProject(local, snapshot);
    if (index >= 0) state.projects[index] = rebuilt;
    else state.projects.push(rebuilt);
    state.selectedProjectId = rebuilt.id;
    save();
    return rebuilt;
  }

  async function syncProject(project) {
    const session = await requireSession();
    emitStatus('syncing', project.id);
    try {
      const push = await pushProject(project);
      const snapshot = await pullProjectSnapshot(project.id);
      const rebuilt = applySnapshotToLocal(snapshot);
      const revision = maxRevision(snapshot);
      updateCursor(session.user.id, project.id, revision);
      emitStatus('synced', project.id, { revision, pendingPhotoUploads: push.pendingPhotoUploads });
      return { project: rebuilt, revision, ...push };
    } catch (error) {
      emitStatus('error', project.id, { message: error.message });
      throw error;
    }
  }

  async function syncSelectedProject() {
    if (typeof selectedProject !== 'function') throw new Error('MGS project workspace is not available.');
    const project = selectedProject();
    if (!project) throw new Error('Select a project before syncing.');
    return syncProject(project);
  }

  function emitStatus(status, projectId, detail = {}) {
    window.dispatchEvent(new CustomEvent('mgs:supabase-sync', {
      detail: { status, projectId, ...detail }
    }));
  }

  function configure(nextConfig = {}) {
    const current = readJson(CONFIG_KEY, {});
    const merged = {
      ...current,
      ...nextConfig,
      enabled: Boolean(nextConfig.enabled ?? current.enabled)
    };
    writeJson(CONFIG_KEY, merged);
    clientPromise = null;
    return currentConfig();
  }

  window.MGSSupabaseSync = Object.freeze({
    isEnabled: () => currentConfig().enabled,
    configure,
    getSession,
    signInWithOtp,
    signOut,
    pushProject,
    pullProjectSnapshot,
    applySnapshotToLocal,
    syncProject,
    syncSelectedProject,
    cursorFor
  });
})();
