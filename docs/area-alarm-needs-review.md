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

## Follow-up candidate

Add a documentation-only review breakdown to the printable project turnover report, while keeping the field test and independent verifier records separate.
