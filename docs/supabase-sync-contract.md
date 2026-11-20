# MGS Supabase sync contract v1

This is the first backend contract for moving the existing browser-first MGS project record toward Supabase without breaking offline field use.

## Goals

- Keep the current local project workspace usable while cloud sync is added in stages.
- Preserve client-generated UUIDs so records created offline do not need new identities later.
- Normalize system scope and system tags so project filtering/evidence matching stays reliable.
- Keep field-record details flexible in `payload` until each record type has stabilized.
- Never put photo `dataUrl` bytes in Postgres. Photos/files belong in Supabase Storage; Postgres stores metadata and links.
- Use soft deletes (`deleted_at`) so a delete made on one device can propagate to another device.
- Use the server-assigned `revision` as the incremental pull cursor. Do not depend on device clocks for ordering.

## Tables

| Table | Purpose |
| --- | --- |
| `projects` | Project identity, job metadata, specialty system text, current schema version, field notes, and a transition-safe workflow snapshot. |
| `project_members` | Future owner/editor/viewer access for multi-user jobs. The project creator becomes owner automatically. |
| `project_systems` | Canonical systems in project scope. |
| `field_records` | Alarm, outlet, test, photo, valve/control, and future note records. Kind-specific fields stay in JSONB `payload`. |
| `record_systems` | Canonical one-to-many system tags for each field record. |
| `project_closeout_items` | Structured Required/Optional/Complete/Missing/N/A closeout state. |
| `project_checklist_items` | Manual and generated field-plan status. |
| `attachments` | Metadata for files stored in Supabase Storage. |

## Local-to-cloud mapping

`supabase-sync-contract.js` converts one current local project into a deterministic sync bundle:

- `project` -> `projects`
- `project.systemScope[]` -> `project_systems`
- `alarms[]`, `outlets[]`, `tests[]`, `photos[]`, `valves[]` -> `field_records`
- each record's `systemIds[]` -> `record_systems`
- `handoffMetadata` -> `project_closeout_items`
- `tasks[]` and `scopeFieldChecklist` -> `project_checklist_items`
- existing photo `dataUrl` values -> `legacyPhotoAttachments`, a staging list for Storage upload

`workflow_state` intentionally keeps copies of `tasks`, `scopeFieldChecklist`, `verifierReadiness`, and `verifierEvidence` during the transition. This prevents data loss while those UI workflows are gradually normalized.

## Sync rules

1. **Local first.** A field save succeeds locally before network sync is attempted.
2. **Client-generated IDs.** New projects and records keep `crypto.randomUUID()` IDs across devices and the backend.
3. **Push by upsert.** Push the project row first, then child rows. Replace each project/record system set transactionally so removed tags do not linger.
4. **Photos are two-phase.** Upload the file to Storage first, then upsert its `attachments` row. Only after the attachment succeeds should the client consider that photo cloud-backed.
5. **Pull by revision.** Store one last acknowledged server revision per signed-in user/device. Pull every sync-enabled table where `revision > cursor`, ordered by `revision` ascending, then advance the cursor only after the full batch applies locally.
6. **Soft delete.** Set `deleted_at`; do not hard-delete syncable rows from normal client code. A tombstone must remain pullable by other devices.
7. **Conflict policy v1.** Whole-row last-write-wins is acceptable for scalar project/record fields, using server receipt order (`revision`) rather than trusting device time. System tags are replace-set operations. Attachments are immutable after upload except metadata/caption. Checklist/closeout rows resolve independently by key, reducing unnecessary conflicts.
8. **Compliance stays human-controlled.** Syncing evidence or checklist data must never auto-declare NFPA compliance, inspection, certification, or verification.

## Recommended first integration sequence

1. Apply `supabase/migrations/20260914_0001_core_sync_schema.sql` to a development Supabase project.
2. Create a private Storage bucket named `mgs-project-files` and mirror project membership rules in Storage policies.
3. Add Supabase Auth and obtain `auth.uid()` before cloud sync begins.
4. Add a sync adapter that calls `MGSSupabaseSyncContract.projectToSyncBundle(project, { ownerUserId })` but leaves current local save behavior unchanged.
5. Upload legacy project photos from `legacyPhotoAttachments`, then remove the browser `dataUrl` only after a verified Storage object + attachment row exists.
6. Add pull/merge tests using two simulated devices before enabling multi-user editing.

## Deliberate non-goals in v1

- No automatic merge of two users editing the same JSON payload field simultaneously.
- No background photo deletion from Storage yet; database tombstones come first.
- No claim that Supabase sync changes any NFPA 99 requirement or verifier workflow.
- No direct cloud dependency in the existing prototype until the local-save path has an explicit fallback.
