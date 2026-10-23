# Supabase project photo storage

MGS keeps `localStorage` as the field-first save path. Project photos may still contain a local `dataUrl`, but cloud sync must never place those bytes in Postgres JSON.

## Storage contract

- Bucket: `mgs-project-files`
- Bucket access: private
- Maximum object size: 10 MB
- Allowed media types: JPEG, PNG, WebP, HEIC, HEIF
- Object path: `<project_id>/photos/<photo_record_id>/original`
- Attachment row id: the photo record UUID for the current one-photo-per-record model
- Postgres attachment metadata: bucket/path, media type, byte size, SHA-256 when browser crypto is available, caption, location metadata, and client update time

The migration `supabase/migrations/20260919_0002_photo_storage.sql` creates the bucket restrictions and RLS policies. Storage object access is derived from the first path segment, which must be a valid project UUID. Reads use `mgs_can_read_project`; uploads, overwrites, and deletes use `mgs_can_edit_project`.

## Browser adapter

`supabase-photo-storage.js` exposes `window.MGSSupabasePhotoStorage` with:

- `uploadLegacyPhoto()` — uploads one local data URL, writes the `attachments` row, then marks the matching photo field-record payload as attached.
- `uploadPendingProjectPhotos(project)` — asks the existing sync contract for pending local photo attachments and uploads them sequentially so failures are reported per record.
- `downloadPhotoByRecord(projectId, recordId)` — resolves attachment metadata and downloads the private object with the authenticated user session.
- `hydrateMissingProjectPhotos(project)` — fills missing local photo `dataUrl` values from Storage without overwriting photos already cached on the device.

The adapter is loaded by `index.html`, but it does not automatically upload or delete local photo bytes. That is intentional until the two-browser sync validation passes.

## Validation gate

Before exposing photo cloud behavior in the field UI:

1. Apply both Supabase migrations to a development project.
2. Run the existing Browser A -> Browser B -> Browser A sync harness.
3. Upload the fixture photo with `MGSSupabasePhotoStorage.uploadPendingProjectPhotos(project)` after the normal project push.
4. Confirm `field_records.payload` contains only attachment metadata and no `dataUrl`.
5. Confirm Browser B can download/hydrate the photo through the private bucket.
6. Confirm a viewer can read the photo but cannot overwrite/delete it, and an editor can upload/overwrite.
7. Force a network/storage failure and confirm the local photo remains available and the job remains editable.

After that gate passes, integrate photo upload/download into `syncProject()` and change the status indicator from `photos pending` to a true uploaded/pending/failed count. Do not remove local photo bytes until a successful cloud upload has been acknowledged and an explicit local-cache policy exists.
