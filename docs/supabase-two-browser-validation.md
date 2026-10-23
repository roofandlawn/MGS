# Supabase two-browser validation harness

This harness turns the current cloud-sync validation gate into a repeatable test instead of an ad hoc checklist. It is development-only and is loaded by `index.html` after the Supabase sync and photo-storage adapters.

## What the fixture contains

`supabase-sync-validation.js` creates one deterministic project with:

- Oxygen and Medical Air project scope.
- One Area Alarm tagged to both systems.
- One Oxygen outlet.
- One Medical Air test record.
- One Medical Air zone-valve/control record.
- One Oxygen photo with a tiny local `dataUrl` payload.
- One completed manual checklist item.
- One completed generated scope-checklist item.
- One optional closeout field explicitly marked N/A.
- Required project number, installer company, and document-set closeout metadata.

The project and field-record IDs are fixed UUIDs so Browser A and Browser B are always working on the same validation record. The harness only replaces that deterministic fixture in local state; it does not delete or modify other local projects.

Use this fixture only against a development Supabase project. Because the IDs are deterministic, rerunning the test intentionally updates the same cloud fixture.

## Contract preflight - no Supabase connection required

Open the MGS field workspace and run:

```js
MGSSyncValidation.runContractPreflight()
MGSPhotoStorageValidation.runStoragePreflight()
```

Both reports should return `passed: true`.

The sync preflight verifies canonical system tags, all five field-record kinds, optional closeout N/A state, generated checklist state, and that photo bytes are absent from every payload intended for Postgres. The photo-storage preflight additionally verifies the private bucket contract, 10 MB size limit, allowed PNG type, deterministic `<project_id>/photos/<photo_record_id>/original` path, and that exactly one fixture image is staged for Storage.

## Live two-browser test

Prerequisites:

1. Apply `supabase/migrations/20260914_0001_core_sync_schema.sql` and `supabase/migrations/20260919_0002_photo_storage.sql` to a development Supabase project.
2. Enable the existing MGS cloud feature flag with the development project URL and anon key.
3. Sign into the same development account in Browser A and Browser B.
4. Keep automatic syncing and the field-facing Sync button disabled during this validation.

### Browser A - seed and push project metadata

Run:

```js
await MGSSyncValidation.runBrowserAPush()
```

This installs the deterministic local fixture, runs the contract preflight, syncs the project, reads the cloud snapshot back, validates the structured rows, and confirms the device cursor did not move backward and acknowledges the returned server revision.

Expected top-bar progression: **Cloud ready -> Syncing project -> Synced - photos pending**.

The returned report should have `preflight.passed`, `cloud.passed`, and `cursor.passed` all equal to `true`.

### Browser A - upload and read back the private photo

Run:

```js
await MGSPhotoStorageValidation.runBrowserAPhotoUpload()
```

This confirms the project is synced first, uploads the staged fixture image into the private `mgs-project-files` bucket, writes the attachment row, updates the photo field record with attachment metadata, downloads the object again using the authenticated session, and verifies that no `dataUrl` entered `field_records.payload`.

Expected result: `passed: true`, `upload.uploaded: 1`, `upload.failed: 0`, and `attachmentState.passed: true`.

### Browser B - pull, change, and push project metadata back

Run:

```js
await MGSSyncValidation.runBrowserBModifyAndSync()
```

Browser B pulls the deterministic project directly from cloud, validates it before editing, rebuilds it into normal local project state, changes the project field note to the fixed marker `MGS sync validation marker: browser-b`, saves locally, syncs it back, and confirms that the server revision increased.

The returned report should have `initialCloud.passed`, `cloud.passed`, `local.passed`, and `cursor.passed` all equal to `true`.

### Browser B - hydrate the photo from private Storage

Run:

```js
await MGSPhotoStorageValidation.runBrowserBPhotoHydrate()
```

This deliberately clears the rebuilt fixture photo's local `dataUrl` to simulate a fresh device, then downloads the private object through the attachment record and hydrates the local project copy. It verifies the returned image bytes, attachment id, storage path, and Postgres attachment metadata.

Expected result: `passed: true`, `hydration.hydrated: 1`, and `hydration.failed: 0`.

### Browser A - verify the project return trip

Run:

```js
await MGSSyncValidation.runBrowserAVerifyReturn()
```

Browser A pulls the cloud project again and confirms the Browser B marker is present. Because Browser A originally created the fixture, its existing local photo bytes should remain available while cloud attachment metadata is also preserved.

Expected result: `cloud.passed: true` and `local.passed: true`.

## Failure test

After the successful round trip, temporarily take the browser offline and attempt a normal cloud sync and photo upload/download. The sync-state indicator should report **Sync issue - saved locally** or **Offline - saved locally** while the project and its local photo remain available through the normal local-storage workflow. Restore connectivity before any further validation.

## Permission test

Use separate development users to verify Storage RLS:

- A project viewer can read/download the photo but cannot upload, overwrite, or delete it.
- A project editor can upload/overwrite the project photo.
- A user who is not a project member cannot read or write the object.

Do not weaken the private-bucket policies to make a failing test pass.

## Gate to pass before exposing Sync in the field UI

Do not expose the field-facing Sync action until all of these are true:

- Both contract preflights pass.
- Browser A project push/readback passes.
- Browser A private photo upload/readback passes.
- Browser B can pull the same project, modify it, and push a newer revision.
- Browser B can hydrate the photo from private Storage on a simulated fresh device.
- Browser A can pull Browser B's marker back.
- Canonical system tags survive the round trip.
- Checklist and closeout N/A state survive the round trip.
- Photo bytes never appear in `field_records.payload` or other Postgres-bound rows.
- Local photo bytes remain usable during network/storage failure.
- Viewer/editor/non-member Storage permissions behave as designed.
- The server revision and local cursor are monotonic across successful syncs.

Once this gate passes, the next implementation step is to integrate successful photo upload/download into the normal `syncProject()` lifecycle and expose a controlled field-facing Sync action with uploaded/pending/failed photo counts.
