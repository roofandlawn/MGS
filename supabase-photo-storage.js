(() => {
  const CONFIG_KEY = 'mgs-supabase-config-v1';
  const DEFAULT_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const BUCKET_ID = 'mgs-project-files';
  const ATTACHMENTS_TABLE = 'attachments';
  const FIELD_RECORDS_TABLE = 'field_records';
  const MAX_BYTES = 10 * 1024 * 1024;
  const ALLOWED_MEDIA_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  let clientPromise = null;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
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
        if (window.supabase?.createClient) return resolve(window.supabase);
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

  async function requireSession(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session?.user?.id) throw new Error('Sign in before syncing project photos.');
    return data.session;
  }

  function assertUuid(value, label) {
    const normalized = String(value || '').trim();
    if (!UUID_RE.test(normalized)) throw new Error(`${label} must be a UUID.`);
    return normalized;
  }

  function parseDataUrl(dataUrl) {
    const value = String(dataUrl || '');
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value);
    if (!match) throw new Error('Photo data is not a valid data URL.');
    const mediaType = String(match[1] || 'application/octet-stream').toLowerCase();
    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
      throw new Error(`Photo type ${mediaType} is not allowed for cloud storage.`);
    }
    const encoded = match[3] || '';
    let bytes;
    if (match[2]) {
      const binary = atob(encoded.replace(/\s/g, ''));
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    } else {
      const text = decodeURIComponent(encoded);
      bytes = new TextEncoder().encode(text);
    }
    if (!bytes.length) throw new Error('Photo data is empty.');
    if (bytes.length > MAX_BYTES) throw new Error('Photo exceeds the 10 MB cloud-storage limit.');
    return { mediaType, bytes, blob: new Blob([bytes], { type: mediaType }) };
  }

  function fileExtension(mediaType) {
    if (mediaType === 'image/jpeg') return 'jpg';
    if (mediaType === 'image/png') return 'png';
    if (mediaType === 'image/webp') return 'webp';
    if (mediaType === 'image/heic') return 'heic';
    if (mediaType === 'image/heif') return 'heif';
    return 'bin';
  }

  async function sha256Hex(bytes) {
    if (!crypto?.subtle?.digest) return null;
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function storagePath(projectId, recordId) {
    return `${assertUuid(projectId, 'Project id')}/photos/${assertUuid(recordId, 'Photo record id')}/original`;
  }

  function cleanText(value) {
    const text = String(value ?? '').trim();
    return text || null;
  }

  async function updatePhotoRecordAttachmentState(client, recordId, attachment) {
    const { data, error } = await client
      .from(FIELD_RECORDS_TABLE)
      .select('payload')
      .eq('id', recordId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};
    const nextPayload = {
      ...payload,
      attachmentPending: false,
      attachmentId: attachment.id,
      attachmentBucket: attachment.bucket_id,
      attachmentPath: attachment.storage_path
    };
    const { error: updateError } = await client
      .from(FIELD_RECORDS_TABLE)
      .update({ payload: nextPayload, client_updated_at: new Date().toISOString() })
      .eq('id', recordId);
    if (updateError) throw updateError;
  }

  async function uploadLegacyPhoto(legacyAttachment, options = {}) {
    const client = options.client || await getClient();
    await requireSession(client);
    const projectId = assertUuid(legacyAttachment?.project_id, 'Project id');
    const recordId = assertUuid(legacyAttachment?.record_id, 'Photo record id');
    const parsed = parseDataUrl(legacyAttachment?.data_url);
    const path = storagePath(projectId, recordId);
    const digest = await sha256Hex(parsed.bytes);

    const { error: storageError } = await client.storage
      .from(BUCKET_ID)
      .upload(path, parsed.blob, {
        upsert: true,
        contentType: parsed.mediaType,
        cacheControl: '3600'
      });
    if (storageError) throw storageError;

    const attachment = {
      id: recordId,
      project_id: projectId,
      record_id: recordId,
      bucket_id: BUCKET_ID,
      storage_path: path,
      file_name: `photo-${recordId}.${fileExtension(parsed.mediaType)}`,
      media_type: parsed.mediaType,
      byte_size: parsed.bytes.length,
      sha256: digest,
      caption: cleanText(legacyAttachment?.caption),
      metadata: {
        source: 'legacy-data-url',
        location: cleanText(legacyAttachment?.location)
      },
      captured_at: null,
      client_updated_at: legacyAttachment?.client_updated_at || new Date().toISOString(),
      deleted_at: null
    };
    const { data, error } = await client
      .from(ATTACHMENTS_TABLE)
      .upsert(attachment, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;

    await updatePhotoRecordAttachmentState(client, recordId, data);
    return data;
  }

  async function uploadPendingProjectPhotos(project, options = {}) {
    if (!window.MGSSupabaseSyncContract?.projectToSyncBundle) {
      throw new Error('MGS Supabase sync contract is not loaded.');
    }
    const client = options.client || await getClient();
    const session = await requireSession(client);
    const bundle = window.MGSSupabaseSyncContract.projectToSyncBundle(project, {
      ownerUserId: session.user.id
    });
    const pending = bundle.legacyPhotoAttachments || [];
    const results = [];
    for (const legacyAttachment of pending) {
      try {
        const attachment = await uploadLegacyPhoto(legacyAttachment, { client });
        results.push({ recordId: legacyAttachment.record_id, ok: true, attachment });
      } catch (error) {
        results.push({ recordId: legacyAttachment.record_id, ok: false, error: error.message });
      }
    }
    return {
      projectId: project.id,
      attempted: pending.length,
      uploaded: results.filter(item => item.ok).length,
      failed: results.filter(item => !item.ok).length,
      results
    };
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Photo download could not be decoded.'));
      reader.readAsDataURL(blob);
    });
  }

  async function downloadPhotoByRecord(projectId, recordId, options = {}) {
    const client = options.client || await getClient();
    await requireSession(client);
    projectId = assertUuid(projectId, 'Project id');
    recordId = assertUuid(recordId, 'Photo record id');
    const { data: attachment, error } = await client
      .from(ATTACHMENTS_TABLE)
      .select('*')
      .eq('project_id', projectId)
      .eq('record_id', recordId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    if (!attachment) return null;

    const { data: blob, error: downloadError } = await client.storage
      .from(attachment.bucket_id || BUCKET_ID)
      .download(attachment.storage_path);
    if (downloadError) throw downloadError;
    return {
      attachment,
      dataUrl: await blobToDataUrl(blob)
    };
  }

  async function hydrateMissingProjectPhotos(project, options = {}) {
    const photos = Array.isArray(project?.photos) ? project.photos : [];
    if (!project?.id || !photos.length) return { project, hydrated: 0, failed: 0, results: [] };
    const client = options.client || await getClient();
    await requireSession(client);
    const nextProject = {
      ...project,
      photos: photos.map(photo => ({ ...photo }))
    };
    const results = [];
    for (const photo of nextProject.photos) {
      if (photo.dataUrl) continue;
      try {
        const downloaded = await downloadPhotoByRecord(nextProject.id, photo.id, { client });
        if (!downloaded?.dataUrl) {
          results.push({ recordId: photo.id, ok: false, missing: true });
          continue;
        }
        photo.dataUrl = downloaded.dataUrl;
        photo.attachmentId = downloaded.attachment.id;
        photo.attachmentPath = downloaded.attachment.storage_path;
        results.push({ recordId: photo.id, ok: true });
      } catch (error) {
        results.push({ recordId: photo.id, ok: false, error: error.message });
      }
    }
    return {
      project: nextProject,
      hydrated: results.filter(item => item.ok).length,
      failed: results.filter(item => !item.ok).length,
      results
    };
  }

  window.MGSSupabasePhotoStorage = Object.freeze({
    bucketId: BUCKET_ID,
    maxBytes: MAX_BYTES,
    allowedMediaTypes: [...ALLOWED_MEDIA_TYPES],
    storagePath,
    uploadLegacyPhoto,
    uploadPendingProjectPhotos,
    downloadPhotoByRecord,
    hydrateMissingProjectPhotos
  });
})();
