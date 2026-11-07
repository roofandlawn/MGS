(() => {
  function requireHarness() {
    if (!window.MGSSyncValidation?.installFixture) {
      throw new Error('MGS base sync validation harness is not loaded.');
    }
    return window.MGSSyncValidation;
  }

  function requireSync() {
    if (!window.MGSSupabaseSync?.pullProjectSnapshot) {
      throw new Error('MGS Supabase local sync adapter is not loaded.');
    }
    return window.MGSSupabaseSync;
  }

  function requireLifecycle() {
    if (!window.MGSSupabaseSyncLifecycle?.syncProject) {
      throw new Error('MGS Supabase sync lifecycle is not loaded.');
    }
    return window.MGSSupabaseSyncLifecycle;
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

  function localFixture() {
    const harness = requireHarness();
    if (typeof state === 'undefined' || !Array.isArray(state.projects)) return null;
    return state.projects.find(project => project.id === harness.fixtureProjectId) || null;
  }

  async function requireSignedInSession() {
    const sync = requireSync();
    if (!sync.isEnabled()) throw new Error('Enable MGS cloud sync before running lifecycle validation.');
    const session = await sync.getSession();
    if (!session?.user?.id) throw new Error('Sign in to Supabase before running lifecycle validation.');
    return session;
  }

  function photoById(project, id) {
    return (Array.isArray(project?.photos) ? project.photos : []).find(photo => photo.id === id) || null;
  }

  function firstPhoto(project) {
    return Array.isArray(project?.photos) ? project.photos[0] || null : null;
  }

  async function runBrowserALifecycle() {
    const harness = requireHarness();
    const sync = requireSync();
    const lifecycle = requireLifecycle();
    const session = await requireSignedInSession();
    const fixture = harness.installFixture();
    const preflight = harness.runContractPreflight(fixture);
    if (!preflight.passed) throw new Error(`Contract preflight failed: ${preflight.failed.join(', ')}`);

    const beforeCursor = sync.cursorFor(session.user.id, fixture.id);
    const result = await lifecycle.syncSelectedProject();
    const snapshot = await sync.pullProjectSnapshot(fixture.id);
    const cloud = harness.verifyCloudSnapshot(snapshot);
    const local = harness.verifyLocalProject(localFixture(), { requireLocalPhotoBytes: true });
    const afterCursor = sync.cursorFor(session.user.id, fixture.id);
    const photo = firstPhoto(result.project);

    const lifecycleChecks = summarize([
      check('lifecycle returned a server revision', Number(result.revision) > 0, String(result.revision || 0)),
      check('photo upload completed without failure', Number(result.photoUpload?.failed) === 0, `uploaded=${result.photoUpload?.uploaded || 0}, failed=${result.photoUpload?.failed || 0}`),
      check('no photo uploads remain pending', Number(result.pendingPhotoUploads) === 0, String(result.pendingPhotoUploads || 0)),
      check('same-device photo bytes remain available locally', Boolean(photo?.dataUrl)),
      check('photo attachment metadata is confirmed locally', photo?.attachmentPending === false && Boolean(photo?.attachmentId) && Boolean(photo?.attachmentPath)),
      check('sync cursor did not move backward', afterCursor >= beforeCursor, `${beforeCursor} -> ${afterCursor}`),
      check('sync cursor acknowledges lifecycle revision', afterCursor >= Number(result.revision || 0), `${afterCursor} >= ${result.revision || 0}`)
    ]);

    return {
      phase: 'browser-a-lifecycle',
      passed: preflight.passed && cloud.passed && local.passed && lifecycleChecks.passed,
      preflight,
      cloud,
      local,
      lifecycle: lifecycleChecks,
      result
    };
  }

  async function runBrowserBLifecycle() {
    const harness = requireHarness();
    const sync = requireSync();
    const lifecycle = requireLifecycle();
    const session = await requireSignedInSession();
    const projectId = harness.fixtureProjectId;
    const beforeCursor = sync.cursorFor(session.user.id, projectId);
    const snapshot = await sync.pullProjectSnapshot(projectId);
    const initialCloud = harness.verifyCloudSnapshot(snapshot);
    if (!initialCloud.passed) throw new Error(`Browser B pull validation failed: ${initialCloud.failed.join(', ')}`);

    const pulled = sync.applySnapshotToLocal(snapshot);
    pulled.fieldNotes = harness.browserBMarker;
    pulled.updatedAt = new Date().toISOString();
    pulled.photos = (pulled.photos || []).map(photo => {
      const next = { ...photo };
      delete next.dataUrl;
      return next;
    });

    if (typeof state === 'undefined' || typeof save !== 'function') {
      throw new Error('MGS local save path is not available.');
    }
    const index = state.projects.findIndex(project => project.id === projectId);
    if (index >= 0) state.projects[index] = pulled;
    save();

    const result = await lifecycle.syncProject(pulled);
    const returned = await sync.pullProjectSnapshot(projectId);
    const cloud = harness.verifyCloudSnapshot(returned, { expectBrowserBMarker: true });
    const local = harness.verifyLocalProject(localFixture(), { expectBrowserBMarker: true, requireLocalPhotoBytes: true });
    const afterCursor = sync.cursorFor(session.user.id, projectId);
    const photo = firstPhoto(result.project);

    const lifecycleChecks = summarize([
      check('fresh-device lifecycle hydrated the photo', Number(result.photoHydration?.hydrated) >= 1, String(result.photoHydration?.hydrated || 0)),
      check('photo hydration completed without failure', Number(result.photoHydration?.failed) === 0, String(result.photoHydration?.failed || 0)),
      check('hydrated photo has local bytes', Boolean(photo?.dataUrl)),
      check('hydrated photo retains attachment metadata', photo?.attachmentPending === false && Boolean(photo?.attachmentId) && Boolean(photo?.attachmentPath)),
      check('Browser B change produced a newer server revision', cloud.revision > initialCloud.revision, `${initialCloud.revision} -> ${cloud.revision}`),
      check('sync cursor did not move backward', afterCursor >= beforeCursor, `${beforeCursor} -> ${afterCursor}`),
      check('sync cursor acknowledges lifecycle revision', afterCursor >= Number(result.revision || 0), `${afterCursor} >= ${result.revision || 0}`)
    ]);

    return {
      phase: 'browser-b-lifecycle',
      passed: initialCloud.passed && cloud.passed && local.passed && lifecycleChecks.passed,
      initialCloud,
      cloud,
      local,
      lifecycle: lifecycleChecks,
      result
    };
  }

  async function runBrowserAReturn() {
    const harness = requireHarness();
    const sync = requireSync();
    const lifecycle = requireLifecycle();
    await requireSignedInSession();
    const projectId = harness.fixtureProjectId;
    const snapshot = await sync.pullProjectSnapshot(projectId);
    const cloud = harness.verifyCloudSnapshot(snapshot, { expectBrowserBMarker: true });
    if (!cloud.passed) throw new Error(`Browser A return validation failed: ${cloud.failed.join(', ')}`);

    const rebuilt = sync.applySnapshotToLocal(snapshot);
    const result = await lifecycle.syncProject(rebuilt);
    const local = harness.verifyLocalProject(result.project, { expectBrowserBMarker: true, requireLocalPhotoBytes: true });
    const photo = firstPhoto(result.project);
    const checks = summarize([
      check('Browser A return keeps Browser B field-note change', result.project?.fieldNotes === harness.browserBMarker),
      check('Browser A return keeps photo bytes usable', Boolean(photo?.dataUrl)),
      check('Browser A return keeps attachment metadata', photo?.attachmentPending === false && Boolean(photo?.attachmentId) && Boolean(photo?.attachmentPath)),
      check('Browser A return has no pending photo uploads', Number(result.pendingPhotoUploads) === 0, String(result.pendingPhotoUploads || 0))
    ]);

    return {
      phase: 'browser-a-lifecycle-return',
      passed: cloud.passed && local.passed && checks.passed,
      cloud,
      local,
      lifecycle: checks,
      result
    };
  }

  window.MGSLifecycleValidation = Object.freeze({
    runBrowserALifecycle,
    runBrowserBLifecycle,
    runBrowserAReturn
  });
})();
