# MGS local-first Supabase adapter

`supabase-local-sync.js` is the first executable cloud-sync layer for the browser prototype. It is deliberately feature-flagged and leaves the existing `localStorage` workflow as the primary save path.

## Safety behavior

- Cloud sync is **disabled by default**.
- No Supabase URL, anon key, password, access token, or refresh token is committed to this repository.
- When the feature flag is off or Supabase is unavailable, normal project saves continue to use local browser storage.
- The Supabase JavaScript SDK is loaded only after cloud sync is enabled.
- Photo `dataUrl` bytes are still kept local and are not written to Postgres. The adapter reports how many photos are waiting for a future Storage-upload step.

## Runtime configuration

For development, configure the adapter from the browser after the page loads:

```js
MGSSupabaseSync.configure({
  enabled: true,
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_KEY'
});
```

The public anon key is not treated as a server secret; access control still depends on Supabase Auth plus the Row Level Security policies in `supabase/migrations/20260914_0001_core_sync_schema.sql`.

A deployment can alternatively define `window.MGS_SUPABASE_CONFIG` before the adapter initializes:

```js
window.MGS_SUPABASE_CONFIG = {
  enabled: true,
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_KEY'
};
```

## Authentication

The adapter exposes magic-link/OTP sign-in through Supabase Auth:

```js
await MGSSupabaseSync.signInWithOtp('tech@example.com');
```

Supabase persists and refreshes the browser session. `MGSSupabaseSync.getSession()` returns the current session, and `MGSSupabaseSync.signOut()` clears it.

## Selected-project round trip

After sign-in:

```js
const result = await MGSSupabaseSync.syncSelectedProject();
```

The current v1 round trip does the following in order:

1. Save field work locally first through the existing MGS workspace.
2. Resolve the authenticated user and preserve an existing project owner when the project is already in Supabase.
3. Convert the selected project with `MGSSupabaseSyncContract.projectToSyncBundle()`.
4. Upsert the project row.
5. Replace the project-system set, soft-deleting removed systems.
6. Upsert alarms, outlets, tests, photos, and valve/control records; missing cloud records are soft-deleted.
7. Replace canonical record-system tags.
8. Upsert closeout and checklist rows; missing keyed rows are soft-deleted.
9. Pull a fresh server snapshot for the same project.
10. Rebuild the local project from the server rows, preserving same-device photo `dataUrl` bytes when the photo record still exists.
11. Save the rebuilt project back through the normal schema-aware local save path.
12. Store the highest server `revision` seen as that user/device/project's acknowledged cursor.

The adapter dispatches an `mgs:supabase-sync` browser event with `syncing`, `synced`, or `error` status so the visual layer can report cloud state without coupling the data layer to a particular design.

## Visible sync-state instrumentation

The field workspace now loads `sync-status-ui.js` and `sync-status-ui.css` after the cloud adapter. The top bar shows the state that matters to a field user without exposing a Sync button before the two-browser validation gate is passed:

- **Local save active** when cloud sync is disabled or unavailable.
- **Offline · saved locally** when the browser loses connectivity.
- **Cloud sign-in needed** when Supabase is configured but no authenticated session is present.
- **Cloud ready** when the browser has an authenticated session.
- **Syncing project** while the adapter is running a selected-project round trip.
- **Cloud synced** after a successful sync, including the highest server revision seen.
- **Synced · photos pending** when structured records synced but one or more current photo bytes are still local-only.
- **Sync issue · saved locally** when cloud synchronization fails; the wording deliberately reinforces that the normal local save path remains intact.

This is status instrumentation only. It does not add automatic sync or a field-facing Sync button and therefore does not bypass the validation gate below.

## What is intentionally not enabled yet

- No automatic sync on every field save.
- No background sync while the browser/app is closed.
- No field-facing Sync button yet.
- No Supabase Storage upload for photos yet.
- No two-device merge guarantee yet. The schema's v1 conflict model is still whole-row last-write-wins by server receipt order.
- No multi-user invitation UI yet, even though owner/editor/viewer membership is represented in the database.
- No claim that a synced record establishes NFPA compliance, inspection, certification, or verification.

## Next validation gate

Before exposing a Sync button in the field UI, apply the migration to a development Supabase project and run a two-browser test with one project containing at least two systems, one alarm, one outlet, one test, one valve/control record, one checklist completion, one N/A closeout field, and one local photo. Confirm that a push/pull round trip preserves every structured field, does not place photo bytes in Postgres, and produces a monotonic server revision cursor. The new top-bar status indicator should be used during this test to confirm the UI transitions through Cloud ready → Syncing project → Cloud synced (or Synced · photos pending) and that a forced network failure reports Sync issue · saved locally without affecting the local project record.
