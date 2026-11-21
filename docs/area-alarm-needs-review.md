# Area alarm Needs Review dashboard — updated November 15, 2026

## Field workflow

In a selected project's Alarms tab, the review summary evaluates each Area alarm record and lists panels with documentation issues. The count is affected panels / recorded area alarm panels; a panel may have several review flags. The first 12 flagged panels display their issue descriptions with a button that jumps to the matching alarm card.

The summary is computed from existing records each time the workspace re-renders. It does not store new approval, inspection, verification or compliance state, and does not modify alarm or test results.

## Filter controls (November 15)

The foreman can choose **All review issues**, **Gas-service mismatches**, **Missing or unlinked tests**, **Unidentified sensor channels**, **Unconfirmed test service**, or **Missing panel equipment**. The total "Needs Review" panel count stays global so a filter never makes the job appear clear; the filtered count and listed issue details only show the selected category.

When a filter has no matches, the dashboard says **No panels match this review category** and cautions that other issues may remain. Each category still links to its affected panel. The first twelve matching panels are displayed, with an explicit count if more match.

The filter is a session-only view preference; it changes neither saved project records nor panel badges, test results, or independent verification status. It is reset to All review issues on a new page load. No migration or Supabase changes required.

| Filter | Included internal flags |
| --- | --- |
| Gas-service mismatches | `gas-mismatch` |
| Missing or unlinked tests | `no-test-link`, `missing-test` |
| Unidentified sensor channels | `unidentified-service` |
| Unconfirmed test service | `test-service-unconfirmed` |
| Missing panel equipment | `no-equipment` |

## Review conditions

| Condition | Review flag |
| --- | --- |
| Area alarm has no equipment record | Panel equipment not documented |
| Equipment has zero sensor channels | No sensor channels identified |
| Channel gas service is missing, unrecognized, or identifies several services | Identify one gas service from approved point schedule |
| Channel has no linked functional-test record | No alarm functional-test record linked |
| A linked test was deleted or no longer qualifies as an alarm test | Previously linked alarm test record missing |
| Recognized channel gas disagrees with linked test service | Gas-service mismatch |
| Channel gas is recognized but linked test gas is unrecognized | Linked test gas service unconfirmed |

Combined-service test records remain eligible when the channel represents one recognized constituent service; combined-service sensor channel labels are flagged because each channel should identify one monitored service.

Master and local alarm types are excluded from current panel-level review. Missing photos and manufacturer documentation remain visible in the separate equipment evidence record but are not presently counted in this summary.

## Safeguards

- Neither a zero-flag dashboard nor a positive field-test result establishes NFPA 99 compliance or independent ASSE 6030 verification.
- All project-sourced names, channels, service labels and link identifiers are escaped before HTML rendering.
- Existing test records and cross-links are never auto-deleted or reclassified by this dashboard.
- Recalculation happens after saving, deleting, or reopening an existing project; no Supabase changes are required.

## QA

Unit checks: node scripts/verify-area-alarm-review.cjs

Mobile browser workflow: python scripts/verify-area-alarm-test-links-ui.py on 320px and 390px widths.

GitHub Actions workflow: .github/workflows/reference-mobile-qa.yml

## Printable turnover report (November 16, 2026)

The **Print / Save PDF** project report now inserts an `Area alarm documentation — Needs Review` section immediately before the alarm records. This is a read-only snapshot of the current project's saved area alarm and functional-test records. It **always includes every outstanding issue** regardless of the dashboard's session filter (and unlike the dashboard, it does not stop at twelve panels).

The report shows overall affected-panel and documentation-item counts, a category breakdown with counts of affected panels and items, and each flagged panel's zone/location and full issue text. Categories are consistent with the dashboard rules. With no flagged panels it states that no current review flags were detected, **not** that the system passed. With no area alarm records it explicitly says none are recorded.

No status, test outcome, code-compliance determination, ASSE 6030 verification or new persisted data is created by printing. User-supplied identifiers and descriptions are HTML-escaped. Print-specific CSS avoids cutting a panel's issue list across pages where possible.

QA: `node scripts/verify-area-alarm-review.cjs` checks counts, categories, safe escaping, empty/clean cases and exports of more than 12 flagged panels; `python scripts/verify-area-alarm-test-links-ui.py` checks printed mismatch and deleted-test warnings on 320px and 390px mobile layouts.

## Follow-up candidate

Add an optional foreman review sign-off with dated comments, explicitly separate from the independent verifier's acceptance paperwork.

## Physical PDF print QA verified — November 19, 2026

The previously pending GitHub Actions run [44350200230](https://github.com/roofandlawn/MGS/actions/runs/44350200230) **passed**, including the Chromium physical print-layout step and synthetic PDF artifact upload. Retrieved and independently inspected the `area-alarm-turnover-print-qa` artifact (created November 18, 2026; artifact ID 14447967927).

- Both the 320px and 390px input viewports produced **identical three-page, US Letter (612 x 792 pt) PDFs**. Printing is intentionally independent of the on-screen phone viewport.
- Synthetic fixture: **42 of 42 panels** with **42 unresolved items**: 30 gas-service mismatches, 6 missing/unlinked tests, 6 unidentified channels. All panel identifiers and issue descriptions were present exactly once and stayed together on a page.
- Visually reviewed rendered pages 1–3. Titles, category table, numbered panel issues, continuation breaks, and the installation/independent-verification disclaimer are legible. No clipped text, overflow outside the paper, or blank page was observed. PDF text geometry reports font sizes of roughly 8–22 pt, median 10 pt, with no text spans outside page bounds.
- The synthetic report is **test evidence**, not a real project record, NFPA 99 acceptance, or ASSE 6030 verification. No production or Supabase changes were made.

**Usability follow-up:** Continuation pages 2 and 3 do not repeat the project/report identifier or show page numbers. Add a restrained print continuation header/page-number convention in a future change, then re-run the physical print regression to verify it does not introduce orphans or page overflow.

## Repeating project identification and pagination — November 20, 2026

The main **Print / Save PDF** report now installs print-only CSS page-margin boxes (see `report-print-page.js`). Every physical page, including continuation pages, carries a compact `MGS | [project number] | [project name]` identifier at the top and `Page N of M` at the bottom right. The job number is read from optional existing `handoffMetadata.projectNumber`; if absent, the project name alone is shown. The full, unabridged project name still appears in the report summary.

Identifiers are whitespace-normalized, CSS-escaped, and length-limited for the margin. The page count comes from the browser's print engine, not project data. Switching projects rebuilds the print rule; printing writes no new records or approval state. Chromium 131+ supports these page-margin boxes; engines without support still print the underlying report, but might omit the repeated identifiers/page numbers.

The physical PDF regression now asserts both project identity and correct `Page N of M` on **each sheet** at 320px and 390px viewport widths, while keeping the existing 42-panel same-page issue checks. The mobile UI regression checks that the real selected project flows into the print rule. The generated PDFs remain synthetic test artifacts, not verifier acceptance documents.

## Foreman correction and recheck notes — November 21, 2026

An active Area Alarm **Needs Review** item now includes **Record correction / recheck**. The button opens a mobile-friendly form requiring the foreman/person recording, a free-text observation or corrective-action note, and one of two explicit documentation statuses:

- **Correction recorded — awaiting recheck**
- **Rechecked — issue still flagged**

Saving appends a timestamped entry to `alarm.reviewCorrections[issueKey]` (up to 100 entries per issue) in the existing project-local browser record, rather than overwriting previous notes. Every review issue receives a stable key based on panel condition, sensor channel ID and linked functional-test ID, where applicable. Notes and recheck statuses are displayed beside the live review issue on the dashboard and in the printable turnover report. The timestamp uses UTC in the report for consistency across devices. Older projects require no migration, since absent correction histories are treated as empty.

**Safeguards:** Field notes cannot mark an alarm or functional test as passed, cannot remove a live review flag, cannot automatically approve a corrected sensor link, and do not constitute NFPA 99 compliance, project acceptance, or independent ASSE 6030 verification. The review flags are still recomputed directly from current equipment/channel/test links. Once the underlying issue disappears, the dated history remains stored under the alarm record but the now-cleared issue is no longer presented among open items (a separate historical-log view can be added later). The app validates that the issue still exists before recording a new note. Entries are HTML-escaped in dashboard/print output.

**QA:** `scripts/verify-area-alarm-review.cjs` tests stable keys, append-only history, input validation, persistence model, escaping, and the no-auto-clear rule. `scripts/verify-area-alarm-test-links-ui.py` tests the actual 320px/390px form, two successive dated notes, browser reload, and print-report display using synthetic records. Nothing was deployed to production or modified in Supabase.
