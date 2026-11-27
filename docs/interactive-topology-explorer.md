# Medical-gas interactive topology explorer — design record

**Date:** 2026-11-02  
**Location:** Zone Valve and Area Alarm field-reference pages  
**Status:** Interactive educational illustration on development branch; **not a construction drawing, compliance checklist, commissioning instruction, or independent verification record**.

## The one development increment

A three-view, selectable schematic helps a new medical-gas technician distinguish medical-gas piping from area-alarm signaling:

1. **One room / one zone.** Supply branch → zone valve box → patient-side sensor → outlet(s). A separate dashed line represents a sensor-to-area-alarm signal.
2. **Two rooms / shared zone (hypothetical).** One zone valve and one illustrative sensor precede a split to two rooms. This teaches a branching concept; it **does not establish** that those two rooms may be combined into one code-compliant zone.
3. **Two separate zones.** One upstream supply splits into two separately illustrated zone valve/sensor/outlet sequences. Dashed lines show separate conceptual signal inputs to an area alarm display. The drawing is not manufacturer wiring guidance.

Technicians select a view and tap or keyboard-select each component for a plain-English description. An independent text path supports screen readers and narrow screens. On phones, the 800-pixel schematic scrolls **inside its own panel**, not the page.

## Code-edition gate

The explorer only mounts when the current read-only `MGSSensorPlacement.forProject()` result supports **2018** or **2024**, or the general learning view (2024, no active project). It is unavailable for other, missing or unconfirmed project editions. It does not write to browser storage or any cloud service.

These diagrams are restricted to **non-anesthetizing Category 1 teaching examples**. They deliberately avoid illustrating the differing anesthetizing-location source-side alarm sensor options in 2018 and 2024. The earlier edition-specific explanation remains available in the reference page.

The diagrams teach relationships only. They do not assert required number or placement of valves, sensors, alarm panels, room groups, wiring terminals, labeling, testing procedures or approved installation.

## Editorial and implementation checks

- `reference-topology.js` — stand-alone educational model, SVG renderer and accessible interactive viewer.
- `reference.html` and `reference.js` — script loading and edition-gated integration.
- `reference.css` — distinct gas-piping / alarm-signal line conventions and horizontal scrolling on small devices.
- `scripts/verify-reference-topology.cjs` — static and logic checks.
- `scripts/verify-reference-mobile.py` — 320/390/768/1280-pixel tests for three views, node selection and edition gating.
- `.github/workflows/reference-mobile-qa.yml` — triggers tests on changes to topology code.

## Acceptance limits before field-instruction status

A qualified medical-gas technical reviewer must compare exact requirements against the **licensed, adopted** NFPA 99 edition and AHJ amendments, and approved project drawings. Room grouping and sensor quantity must be validated for each actual project. Manufacturer alarm input wiring documentation, alarm point mapping and independent verification remain separate deliverables.

Reference for learning the 2024 sensor-location distinction: NFPA 99-2024 §5.1.9.4.4 (validate against licensed edition). The app intentionally does **not** convert this section number into design approval.
