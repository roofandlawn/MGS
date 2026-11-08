# Area alarm sensor-channel functional-test links (November 7, 2026)

One area alarm panel can have up to 16 sensor channels. Each channel now maintains an optional list of **existing project test record IDs** (up to 24 unique IDs).

## Technician workflow

1. Under **Tests**, add a test record with an alarm-related title, such as "Area alarm functional test", then record its system, location, date, result, personnel and notes. These are user-entered observations, not certified verification.
2. Under **Alarms**, open the relevant area alarm's **Equipment details**. On each gas-specific sensor channel, check the corresponding existing test record(s).
3. Save, reopen and print the project report. Linked test labels include the recorded test type, gas/system, date and recorded status for that channel.
4. If a linked test record is later deleted, the channel keeps the ID and shows **Previously linked alarm test record missing** until the technician clears the orphaned link.

Only records with "alarm" in their test type are offered for linkage. Other inspection and pressure tests remain in the Tests section. Multiple alarm test records may be linked to a single channel (for repeat tests), and one combined alarm test may be linked to more than one channel if documented that way. The application never infers equipment wiring or automatically changes an alarm status to **Pass** from a linked test.

## Data and safety

- Stored at `alarm.equipment.sensorChannels[n].testIds` as a normalized deduplicated array of project-local test IDs; old records normalize with an empty array.
- Alarm test records continue to live in the existing `project.tests` collection. No duplication, new photo storage or Supabase migration was required.
- Orphaned links are not silently deleted or redirected.
- Test association is documentary and does **not** constitute NFPA 99 compliance, ASSE 6030 independent verification, calibration, approved wiring instructions or a verified alarm functional test.
- Do not enter patient identifiers or protected health information.

## Regression checks

`node scripts/verify-area-alarm-equipment.cjs` exercises normalization, multiple links, deleted-test warnings, safe HTML rendering and legacy data. The established `python scripts/verify-area-alarm-equipment-ui.py` covers equipment editing, channel/photo persistence and reporting at 390px. **New:** `python scripts/verify-area-alarm-test-links-ui.py` exercises the real mobile UI at 320px and 390px: create separate oxygen and medical air alarm tests plus a non-alarm pressure test, link each alarm test to the intended sensor channel, save and reopen the equipment form, reload from browser storage, check each channel's printable report section, trigger Print / Save PDF, and verify that deleting a linked test leaves a visible orphan warning without affecting the other channel. All browser checks run in the GitHub Actions workflow; an individual run must pass before changes are treated as validated.
