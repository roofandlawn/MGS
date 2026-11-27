(() => {
  function requireAdapters() {
    const sync = window.MGSSupabaseSync;
    if (!sync) throw new Error('MGS Supabase sync adapter is not loaded.');
    const photos = window.MGSSupabasePhotoStorage || null;
    return { sync, photos };
  }

  function emit(status, projectId, detail = {}) {
    window.dispatchEvent(new CustomEvent('mgs:supabase-sync', {
      detail: { status, projectId, ...detail }
    }));
  }

  function cloneProject(project) {
    return {
      ...project,
      photos: (Array.isArray(project?.photos) ? project.photos : []).map(photo => ({ ...photo }))
    };
  }

  function isConfirmedAttachment(photo) {
    return Boolean(
      photo?.attachmentPending === false
      && photo?.attachmentId
      && photo?.attachmentPath
    );
  }

  function pendingUploadProject(project) {
    const next = cloneProject(project);
    next.photos.forEach(photo => {
      if (isConfirmedAttachment(photo)) delete photo.dataUrl;
    });
    return next;
  }

  function finalizeProjectForMetadata(project, uploadResults = []) {
    const next = cloneProject(project);
    const resultByRecord = new Map(
      (Array.isArray(uploadResults) ? uploadResults : [])
        .filter(item => item?.recordId)
        .map(item => [String(item.recordId), item])
    );

    next.photos.forEach(photo => {
      const result = resultByRecord.get(String(photo.id));
      if (result?.ok && result.attachment) {
        const attachment = result.attachment;
        photo.attachmentPending = false;
        photo.attachmentId = attachment.id;
        photo.attachmentBucket = attachment.bucket_id;
        photo.attachmentPath = attachment.storage_path;
        photo.attachmentMediaType = attachment.media_type || null;
        photo.attachmentByteSize = Number(attachment.byte_size) || null;
        photo.attachmentSha256 = attachment.sha256 || null;
        delete photo.dataUrl;
        return;
      }

      if (isConfirmedAttachment(photo)) {
        delete photo.dataUrl;
        return;
      }

      if (photo.dataUrl) photo.attachmentPending = true;
    });

    return next;
  }

  function persistProject(project) {
    if (!project || typeof state === 'undefined' || typeof save !== 'function' || !Array.isArray(state.projects)) {
      return project;
    }
    const index = state.projects.findIndex(item => item.id === project.id);
    if (index >= 0) state.projects[index] = project;
    else state.projects.push(project);
    state.selectedProjectId = project.id;
    save();
    return project;
  }

  function emptyPhotoSummary(projectId, pending = 0) {
    return {
      projectId,
      attempted: 0,
      uploaded: 0,
      failed: Number(pending) || 0,
      skipped: 0,
      results: []
    };
  }

  async function uploadPendingPhotos(project, photos, pendingCount) {
    if (!pendingCount) return emptyPhotoSummary(project.id, 0);
    if (!photos?.uploadPendingProjectPhotos) return emptyPhotoSummary(project.id, pendingCount);
    try {
      return await photos.uploadPendingProjectPhotos(project);
    } catch (error) {
      return {
        ...emptyPhotoSummary(project.id, pendingCount),
        error: error?.message || 'Project photo upload could not run.'
      };
    }
  }

  async function hydratePhotos(project, photos) {
    if (!photos?.hydrateMissingProjectPhotos) {
      return { project, hydrated: 0, failed: 0, results: [] };
    }
    try {
      return await photos.hydrateMissingProjectPhotos(project);
    } catch (error) {
      const missing = (Array.isArray(project?.photos) ? project.photos : []).filter(photo => !photo.dataUrl).length;
      return {
        project,
        hydrated: 0,
        failed: missing,
        results: [],
        error: error?.message || 'Project photo download could not run.'
      };
    }
  }

  function remainingPending(initialPending, photoUpload) {
    const attempted = Number(photoUpload?.attempted) || 0;
    const failed = Number(photoUpload?.failed) || 0;
    return Math.max(0, (Number(initialPending) || 0) - attempted) + failed;
  }

  async function syncProject(project) {
    if (!project?.id) throw new Error('Select a project before syncing.');
    const { sync, photos } = requireAdapters();
    emit('syncing', project.id, { phase: 'metadata-preflight' });

    try {
      // Avoid re-staging photo bytes that already have a confirmed attachment.
      const uploadCandidate = pendingUploadProject(project);

      // The first metadata push ensures new photo field-record rows exist before
      // Storage upload tries to attach bytes to them.
      const initialPush = await sync.pushProject(uploadCandidate);

      emit('syncing', project.id, { phase: 'photos' });
      const photoUpload = await uploadPendingPhotos(
        uploadCandidate,
        photos,
        initialPush.pendingPhotoUploads
      );

      // Successful uploads are represented as attachment metadata only during
      // the final metadata sync. Failed photos retain their local dataUrl, so
      // the server record stays explicitly attachmentPending without receiving bytes.
      const finalProject = finalizeProjectForMetadata(uploadCandidate, photoUpload.results);
      const metadataSync = await sync.syncProject(finalProject);

      emit('syncing', project.id, { phase: 'photo-hydration' });
      const hydration = await hydratePhotos(metadataSync.project, photos);
      const hydratedProject = persistProject(hydration.project || metadataSync.project);
      const pendingPhotoUploads = remainingPending(initialPush.pendingPhotoUploads, photoUpload);

      emit('synced', project.id, {
        revision: metadataSync.revision,
        pendingPhotoUploads,
        photoUploaded: Number(photoUpload.uploaded) || 0,
        photoUploadFailed: Number(photoUpload.failed) || 0,
        photoHydrated: Number(hydration.hydrated) || 0,
        photoHydrationFailed: Number(hydration.failed) || 0
      });

      return {
        ...metadataSync,
        project: hydratedProject,
        pendingPhotoUploads,
        photoUpload,
        photoHydration: hydration
      };
    } catch (error) {
      emit('error', project.id, { message: error?.message || 'Cloud sync did not complete.' });
      throw error;
    }
  }

  async function syncSelectedProject() {
    if (typeof selectedProject !== 'function') {
      throw new Error('MGS project workspace is not available.');
    }
    const project = selectedProject();
    if (!project) throw new Error('Select a project before syncing.');
    return syncProject(project);
  }

  window.MGSSupabaseSyncLifecycle = Object.freeze({
    syncProject,
    syncSelectedProject,
    pendingUploadProject,
    finalizeProjectForMetadata
  });
})();
