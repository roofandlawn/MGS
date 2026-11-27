# Area alarm audit outbox — November 25, 2026

This is an isolated staging prototype for new correction/recheck notes only. It does not change the existing local project audit workflow, production UI, Supabase database, or snapshot synchronization contract.

## Contract
- `stage({ownerUserId,projectId,alarmId,issueKey,note,recheckStatus,observedAt,eventId})` validates and persists an immutable submission envelope under an account/project/event-scoped storage key. It generates a new event UUID through an injected generator if not supplied. Save the returned UUID with the new correction; never create a new UUID for a retry.
- `queue(owner,project,event)` marks the envelope eligible for submission.
- `inspect` and `list` return saved-locally, awaiting-synchronization, or server-confirmed. These are synchronization states, not test outcomes.
- `syncOne` explicitly submits one queued correction to the migration 0004 RPC. It requires the original account identity before sending and after receiving. Network errors, permission errors, mismatched receipts and failed receipt persistence leave the envelope pending. Retrying uses the same RPC arguments and UUID; a successful response must match the original payload and include the database receipt time.
- Inject storage, authenticated identity provider, RPC client and secure UUID generator. Production adapters must use authenticated Supabase user identity, session-bound RPC calls, and crypto.randomUUID (or equivalent). Never use a service-role key on a phone.

## Staging test
Run `node scripts/verify-audit-outbox.cjs`. The synthetic test covers persistence/reload, identity scoping, network failure, wrong-account rejection, wrong-receipt rejection, matching receipt, and no repeat submission after confirmation. No actual Supabase request is made by this test.

## Integration gates
1. Apply migrations 0001–0004 on a disposable database and run the role, cross-project, mutation, replay and retention tests specified by migration 0004. Validate the exact PostgREST receipt format.
2. Verify offline behavior, storage quota/denied writes, session expiration, account switching mid-request, lost response after server commit and multiple browser tabs. A caller must bind an immutable authenticated session to the RPC; the two identity checks alone do not prevent a session race. Serialize enqueue operations for the same UUID. The prototype is not a multi-tab transaction coordinator.
3. Connect only newly entered corrections after explicit account association. Do not silently upload older browser records. Persist the event UUID with the note and design a crash-safe reconciliation path between the existing project save and outbox save. If the alarm is absent from the server, upload the authorized alarm record first; never bypass membership restrictions. A permission rejection should surface a retry/attention message, not discard the note.
4. Use a staging-only feature flag; display unsent counts and individual status, and keep unconfirmed entries clearly labeled in any export. Re-read authoritative receipts from the server for a formal audit export.
5. Device browser storage is mutable, not encrypted by this module, and can be cleared. Scope keys organize entries but do not provide access control. Do not enter patient information. Review device retention, logout handling, offline access, backups, quotas and retention/export policy before field rollout. Server confirmation in this prototype means a matching receipt was received and cached, not a tamper-evident local record or proof of the work.

No synchronization state, correction note or receipt constitutes accepted testing, NFPA 99 compliance, or independent ASSE 6030 verification. Server receipt time is not the time of field work. Alarm deletion events and legacy history are not supported by the current correction-only RPC.
