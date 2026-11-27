# Audit database QA — November 26, 2026

The audit database SQL regression workflow provisions a disposable PostgreSQL 15
service, installs a minimal Supabase-compatible auth/storage fixture, applies the
repository migrations and exercises the actual 0004 audit RPC and policies.
No real project IDs, tokens, customer records, hosted Supabase secrets or
production database are used. The workflow is scoped to the development branch.

The test asserts authenticated owner/editor receipts, exact and changed replays,
cross-project isolation, missing/invalid alarm records, blank/oversize notes,
viewer/outsider/anonymous permissions, direct writes, append-only triggers,
membership revocation, alarm deletion retention, and project deletion behavior.
The fixture transaction rolls back. Do not run the bootstrap on a real database.

This is SQL integration testing, not hosted Supabase staging acceptance. It does
not validate JWT signature handling, real platform grants, PostgREST serialization,
concurrent submissions, session races or deletion/write atomicity. The mock
auth.uid() reads a test session claim; it is not an authentication implementation.
Project soft deletion hides history from all normal callers, while preserving
database rows; retention and authorized recovery/export remain release blockers.
Also review the existing project update policy and ownership changes, since
project access helpers underpin audit security. No mobile writer is enabled.

Next: obtain a passing CI run, then repeat relevant tests against an isolated
Supabase project and exercise real authenticated HTTP receipt/retry behavior.
No field note or receipt constitutes accepted testing or independent verification.
