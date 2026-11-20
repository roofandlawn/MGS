# Cloud-copy baseline acceptance (review-only)

Status: proposed, not deployed (October 16, 2026). This flow MUST NOT be enabled with the existing legacy direct-table sync writer.

## Preconditions
- Atomic writer `mgs_sync_project_atomic` and read-only snapshot RPC `mgs_read_project_snapshot` installed, tested under RLS, and direct-table write bypasses disabled.
- Authenticated user and project membership checked by database RLS.
- Snapshot contractVersion=1, project ID matches, positive safe-integer revision, all seven collection arrays present.
- Reader returns attachment metadata, not photo bytes. Warn technician that photos need separate hydration and offline local photo data cannot be silently discarded.

## Required two-stage flow
1. **Preview**: fetch an atomic cloud snapshot for the named project, show its name, scope and record counts, cloud revision, replacement warning, and local photo warning. Do not change storage or cursor.
2. **Accept**: require explicit “USE CLOUD COPY”. Reject if account changed, local project changed since preview, or cloud revision changed in a fresh snapshot fetch.
3. **Backup before replace**: persist and verify a *complete* backup of local project workspace including any local image data. A quota or verification failure must prevent replacement.
4. **Apply**: reconstruct the cloud project using the approved project snapshot transformer with no local-photo grafting; durably persist the replacement in the local workspace, retaining unrelated projects.
5. **Acknowledge**: only after durable local save, record the accepted cloud revision under that signed-in user's project cursor. Never acknowledge on merely viewing a snapshot.
6. **Failure behavior**: preserve backup on all failures. If local application succeeds but cursor persistence fails, forbid upload until restored/reviewed; never invoke legacy direct-table push.

## Test plan
Mock-device checks: read-only preview, approval, token expiry, remote-revision conflict, changed local project, edits to unrelated projects during backup, backup quota failure, save failure, cursor failure, changed signed-in user, disabled atomic writer, malformed payload, invalid revision, fresh device first import, and wrong-project snapshot. Follow with two browsers and real Postgres/RLS tests before enabling.

## Release state
The standalone implementation/test package is not yet integrated into the runtime or deployed. This document is a non-operational contract until the database RPCs and atomic writer are live and validated.