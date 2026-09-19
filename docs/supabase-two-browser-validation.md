# Supabase two-browser validation harness

This harness turns the current cloud-sync validation gate into a repeatable test instead of an ad hoc checklist. It is development-only and is loaded after `supabase-sync-contract.js` and `supabase-local-sync.js` by `project-schema-runtime.js`.

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
```

Expected result: `passed: true`.

The preflight verifies that canonical system tags map correctly, all five field-record kinds are generated, optional closeout N/A state is preserved, generated checklist state is preserved, photo metadata is marked `attachmentPending`, and the photo `dataUrl` is absent from every payload intended for Postgres. The image bytes should appear only in `legacyPhotoAttachments`, which is the staging area for the later Supabase Storage phase.

## Live two-browser test

Prerequisites:

1. Apply `supabase/migrations/20260914_0001_core_sync_schema.sql` to a development Supabase project.
2. Enable the existing MGS cloud feature flag with the development project URL and anon key.
3. Sign into the same development account in Browser A and Browser B.
4. Keep automatic syncing and the field-facing Sync button disabled during this validation.

### Browser A - seed and push

Run:

```js
await MGSSyncValidation.runBrowserAPush()
```

This installs the deterministic local fixture, runs the contract preflight, syncs the project, reads the cloud snapshot back, validates the structured rows, and confirms the device cursor did not move backward and acknowledges the returned server revision.

Expected top-bar progression: **Cloud ready -> Syncing project -> Synced - photos pending**.

The returned report should have `preflight.passed`, `cloud.passed`, and `cursor.passed` all equal to `true`.

### Browser B - pull, change, and push back

Run:

```js
await MGSSyncValidation.runBrowserBModifyAndSync()
```

Browser B pulls the deterministic project directly from cloud, validates it before editing, rebuilds it into normal local project state, changes the project field note to the fixed marker `MGS sync validation marker: browser-b`, saves locally, syncs it back, and confirms that the server revision increased.

The returned report should have `initialCloud.passed`, `cloud.passed`, `local.passed`, and `cursor.passed` all equal to `true`.

Browser B will not receive the original photo bytes yet. That is expected until Supabase Storage is implemented. The photo caption/location/system metadata must still survive.

### Browser A - verify the return trip

Run:

```js
await MGSSyncValidation.runBrowserAVerifyReturn()
```

Browser A pulls the cloud project again and confirms the Browser B marker is present. Because Browser A originally created the fixture, its existing local photo bytes should be retained when the cloud metadata is rebuilt into the local project.

Expected result: `cloud.passed: true` and `local.passed: true`.

## Failure test

After the successful round trip, temporarily take the browser offline and attempt a normal cloud sync. The sync-state indicator should report **Sync issue - saved locally** or **Offline - saved locally** while the project remains available through the normal local-storage workflow. Restore connectivity before any further validation.

## Gate to pass before exposing Sync in the field UI

Do not expose the field-facing Sync action until all of these are true:

- Browser A contract preflight passes.
- Browser A push/readback passes.
- Browser B can pull the same project, modify it, and push a newer revision.
- Browser A can pull Browser B's marker back.
- Canonical system tags survive the round trip.
- Checklist and closeout N/A state survive the round trip.
- Photo bytes never appear in `field_records.payload` or other Postgres-bound rows.
- Same-device photo bytes remain local after a cloud metadata pull.
- Network failure leaves the local project intact.
- The server revision and local cursor are monotonic across successful syncs.

Once this gate passes, the next implementation step is Supabase Storage upload/download for photo bytes, followed by a controlled field-facing Sync action.
