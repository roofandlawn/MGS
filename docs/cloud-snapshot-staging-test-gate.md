# MGS cloud snapshot - staging verification gate (2026-10-23)

Status: reader SQL committed to feature/reference-library-v1; NOT deployed to Supabase.
Reader migration: supabase/migrations/20261022_0003_read_project_snapshot.sql

## Why this gate exists
The Cloud Copy mobile UI is read-only. It must not be connected to live field records until the reader passes actual PostgreSQL, Auth, RLS and two-device checks. Mock and static tests alone cannot prove authorization.

## Set up a disposable development project
1. Apply the existing 20260914 core migration and 20260919 private photo-storage migration, then apply 20261022_0003 to a DEVELOPMENT Supabase database, in that order.
2. Use four distinct DEVELOPMENT Auth users: project owner, invited editor, invited viewer, and nonmember. Create a throwaway project with projectSystems, fieldRecords, recordSystems, closeoutItems, checklistItems and attachment metadata. Include one soft-deleted field record.
3. Verify the app uses only the publishable/anon key plus each signed-in user's JWT. Never put a service-role key in a browser, repo, test bundle or report.

## Required live assertions
- Anonymous calls to mgs_read_project_snapshot fail, without a project payload.
- Owner, editor and viewer receive an authorized project envelope with contractVersion=1, the correct projectId, a positive revision, and all seven collection arrays.
- Nonmember, revoked member and incorrect project ID calls do not reveal any project information.
- Every scoped record belongs to the requested project; recordSystems refer only to fieldRecords in that snapshot.
- Photo bytes and dataUrl values are absent from PostgreSQL rows; attachment responses contain metadata only.
- The revision increases after an edit to any row family and after a soft delete. Previously deleted rows are marked and do not appear as active UI items.
- A reader called during concurrent writes returns a consistent snapshot (no old/new mixture).
- The reviewer UI never changes local records or cursors merely from preview.

## Automated staging smoke test
The read-only Node test script is now checked into this feature branch at `scripts/verify-snapshot-staging.mjs`. It expects:
MGS_STAGING_READ_ONLY_TEST=YES,
MGS_STAGING_SUPABASE_URL, MGS_STAGING_ANON_KEY, MGS_STAGING_PROJECT_ID,
and MGS_{OWNER,EDITOR,VIEWER,OUTSIDER}_{EMAIL,PASSWORD}.
Run from the repository root: `node scripts/verify-snapshot-staging.mjs` (Node.js 20 or later).
It logs no tokens or passwords and does not change MGS project data. Signing in may update ordinary Supabase Auth session or audit metadata.
It checks anonymous, owner, editor, viewer and nonmember access; unknown-project denial; project/record scoping; presence of all seven arrays; attachment metadata/no inline file bytes; and consistent revision visibility across authorized roles. It does NOT prove revocation, revision increments, concurrency or the atomic writer. Keep all credentials in a private staging shell or secret store, not this repository.

## Release gate
Keep cloud replacement disabled; keep legacy direct-table multi-step sync unavailable to technicians. Do not consider the reader production-ready until a test report records PostgreSQL execution, actual RLS outcomes, membership revocation, revision changes, and concurrent-reader results. Atomic write RPC and write-bypass prevention are separate required milestones.
