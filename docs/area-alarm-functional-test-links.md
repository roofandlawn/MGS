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

`node scripts/verify-area-alarm-equipment.cjs` exercises normalization, multiple links, deleted-test warnings, injection escaping and legacy data. `python scripts/verify-area-alarm-equipment-ui.py` exercises a 390px phone workflow for two different channel links, reload, report output and deleted-test warnings. Both run in the existing GitHub Actions mobile QA workflow.
