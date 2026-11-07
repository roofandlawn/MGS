(() => {
  const DATA_URL_PREFIX = 'data:image/';

  function requireValidation() {
    if (!window.MGSSyncValidation?.buildFixture) {
      throw new Error('MGS sync validation harness is not loaded.');
    }
    return window.MGSSyncValidation;
  }

  function requireSync() {
    if (!window.MGSSupabaseSync?.syncProject) {
      throw new Error('MGS Supabase local sync adapter is not loaded.');
    }
    return window.MGSSupabaseSync;
  }

  function requireStorage() {
    if (!window.MGSSupabasePhotoStorage?.uploadPendingProjectPhotos) {
      throw new Error('MGS Supabase photo storage adapter is not loaded.');
    }
    return window.MGSSupabasePhotoStorage;
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

  function fixturePhoto(project) {
    return Array.isArray(project?.photos) ? project.photos[0] || null : null;
  }

  function localFixture() {
    if (typeof state === 'undefined') return null;
    const projectId = requireValidation().fixtureProjectId;
    return state.projects.find(project => project.id === projectId) || null;
  }

  function ensureLocalFixture() {
    return localFixture() || requireValidation().installFixture();
  }

  async function requireSignedInSession() {
    const sync = requireSync();
    if (!sync.isEnabled()) throw new Error('Enable MGS cloud sync before running photo-storage validation.');
    const session = await sync.getSession();
    if (!session?.user?.id) throw new Error('Sign in to Supabase before running photo-storage validation.');
    return session;
  }

  function activeRows(rows) {
    return (rows || []).filter(row => !row.deleted_at);
  }

  function cloudPhotoRecord(snapshot, recordId) {
    return activeRows(snapshot?.fieldRecords).find(row => row.id === recordId && row.kind === 'photo') || null;
  }

  function verifyAttachmentMetadata(snapshot, photoId) {
    const photoRecord = cloudPhotoRecord(snapshot, photoId);
    const serializedPayload = JSON.stringify(photoRecord?.payload || {});
    return summarize([
      check('cloud photo field record exists', Boolean(photoRecord)),
      check('photo field record is no longer attachment-pending', photoRecord?.payload?.attachmentPending === false),
      check('photo field record has attachment id', photoRecord?.payload?.attachmentId === photoId),
      check('photo field record has storage bucket', Boolean(photoRecord?.payload?.attachmentBucket)),
      check('photo field record has storage path', Boolean(photoRecord?.payload?.attachmentPath)),
      check('photo bytes are still absent from field_records payload', !serializedPayload.includes('data:image/') && !serializedPayload.includes('dataUrl'))
    ]);
  }

  function runStoragePreflight(project = requireValidation().buildFixture()) {
    const storage = requireStorage();
    const syncPreflight = requireValidation().runContractPreflight(project);
    const photo = fixturePhoto(project);
    const expectedPath = photo ? `${project.id}/photos/${photo.id}/original` : '';
    const actualPath = photo ? storage.storagePath(project.id, photo.id) : '';
    const staged = syncPreflight.bundle?.legacyPhotoAttachments || [];

    const checks = [
      check('base sync contract preflight passes', syncPreflight.passed, syncPreflight.failed.join(', ')),
      check('fixture contains one photo', Boolean(photo)),
      check('storage bucket is private-project bucket id', storage.bucketId === 'mgs-project-files'),
      check('fixture image type is permitted', storage.allowedMediaTypes.includes('image/png')),
      check('cloud-photo size limit is 10 MB', storage.maxBytes === 10 * 1024 * 1024),
      check('deterministic storage path matches project/photo ids', actualPath === expectedPath, `${actualPath} === ${expectedPath}`),
      check('exactly one photo is staged for Storage', staged.length === 1),
      check('staged photo belongs to fixture record', staged[0]?.record_id === photo?.id),
      check('staged bytes stay outside Postgres-bound rows', String(staged[0]?.data_url || '').startsWith(DATA_URL_PREFIX))
    ];

    return { ...summarize(checks), syncPreflight, projectId: project.id, photoId: photo?.id || null };
  }

  async function runBrowserAPhotoUpload() {
    const sync = requireSync();
    const storage = requireStorage();
    await requireSignedInSession();
    const project = ensureLocalFixture();
    const photo = fixturePhoto(project);
    if (!photo) throw new Error('Validation fixture photo is missing.');

    const preflight = runStoragePreflight(project);
    if (!preflight.passed) throw new Error(`Photo storage preflight failed: ${preflight.failed.join(', ')}`);

    const projectSync = await sync.syncProject(project);
    const upload = await storage.uploadPendingProjectPhotos(project);
    const downloaded = await storage.downloadPhotoByRecord(project.id, photo.id);
    const snapshot = await sync.pullProjectSnapshot(project.id);
    const attachmentState = verifyAttachmentMetadata(snapshot, photo.id);

    const checks = [
      check('project metadata sync completed before photo upload', Number(projectSync?.revision) > 0),
      check('one photo upload was attempted', upload.attempted === 1),
      check('one photo upload succeeded', upload.uploaded === 1 && upload.failed === 0),
      check('uploaded attachment id matches photo record', upload.results?.[0]?.attachment?.id === photo.id),
      check('uploaded attachment byte size is recorded', Number(upload.results?.[0]?.attachment?.byte_size) > 0),
      check('private photo can be downloaded by current project member', String(downloaded?.dataUrl || '').startsWith(DATA_URL_PREFIX)),
      check('download resolves the same attachment record', downloaded?.attachment?.record_id === photo.id),
      check('cloud field record attachment metadata is valid', attachmentState.passed, attachmentState.failed.join(', '))
    ];

    return {
      phase: 'browser-a-photo-upload',
      ...summarize(checks),
      preflight,
      attachmentState,
      upload,
      projectSync,
      attachment: downloaded?.attachment || null
    };
  }

  async function runBrowserBPhotoHydrate() {
    const sync = requireSync();
    const storage = requireStorage();
    await requireSignedInSession();
    const projectId = requireValidation().fixtureProjectId;
    const snapshot = await sync.pullProjectSnapshot(projectId);
    const rebuilt = sync.applySnapshotToLocal(snapshot);
    const photo = fixturePhoto(rebuilt);
    if (!photo) throw new Error('Cloud validation fixture photo metadata is missing.');

    const simulatedFreshDevice = {
      ...rebuilt,
      photos: rebuilt.photos.map(item => ({ ...item, dataUrl: '' }))
    };
    const hydration = await storage.hydrateMissingProjectPhotos(simulatedFreshDevice);
    const hydratedPhoto = fixturePhoto(hydration.project);
    const attachmentState = verifyAttachmentMetadata(snapshot, photo.id);

    const checks = [
      check('cloud project rebuilt without requiring local photo bytes', Boolean(photo)),
      check('fresh-device hydration fetched one photo', hydration.hydrated === 1 && hydration.failed === 0),
      check('hydrated photo contains image bytes', String(hydratedPhoto?.dataUrl || '').startsWith(DATA_URL_PREFIX)),
      check('hydrated photo carries attachment id', hydratedPhoto?.attachmentId === photo.id),
      check('hydrated photo carries storage path', Boolean(hydratedPhoto?.attachmentPath)),
      check('cloud field record attachment metadata remains valid', attachmentState.passed, attachmentState.failed.join(', '))
    ];

    return {
      phase: 'browser-b-photo-hydrate',
      ...summarize(checks),
      hydration,
      attachmentState,
      project: hydration.project
    };
  }

  window.MGSPhotoStorageValidation = Object.freeze({
    runStoragePreflight,
    verifyAttachmentMetadata,
    runBrowserAPhotoUpload,
    runBrowserBPhotoHydrate
  });
})();
