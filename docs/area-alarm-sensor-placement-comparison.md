# Area alarm sensor-placement concepts — 2018 versus 2024

**Added:** 2026-11-01  
**Scope:** Read-only training explanation attached to Zone Valve and Area Alarm component pages. This is not a layout design, verification procedure, or approval of a project-specific arrangement.

## Why this comparison matters

NFPA 99 §5.1.9.4.4 has different language about the **source-side alternative for anesthetizing locations** in 2018 versus 2024. The app must not assume that a rule for grouped anesthetizing rooms in 2024 applies identically to a 2018 project.

| Example | 2018 editorial summary | 2024 editorial summary |
| --- | --- | --- |
| Category 1, non-anesthetizing | Sensor on patient/use side of individual zone-valve-box assembly | Sensor on patient/use side of each individual zone valve |
| Anesthetizing, source-side alternative | Described in relation to the source side of an individual room zone-valve-box assembly | Described on the source side of each group of anesthetizing-location zone valves sharing the same branch |
| Anesthetizing, patient-side alternative | Sensor on patient/use side of each individual zone-valve-box assembly | Sensor on patient/use side of each individual zone valve |

**Do not** assume one sensor covers all operating rooms, merge separate branch lines into one example, or infer a permitted design from the simplified sequence illustration. Exact quantity, branch topology, zone boundaries and sensor locations require the adopted licensed code, approved design and AHJ review.

## Evidence and editorial gate

- 2018: John Gregory, "Zone Valves," PHCPPros (March 6, 2023), discussing the 2018 clauses: https://www.phcppros.com/articles/17094-zone-valves
- 2018 text corroboration: public searchable 2018 NFPA 99 index/transcription: https://studylib.net/doc/28498546/nfpa-99-2018--1-
- 2024: Denver ASPE / Medical Air, Inc. educational presentation (NFPA 99-2024 section 5.1.9.4.4): https://denveraspe.org/images/downloads/Past_Presentations/nfpa_99__2024__training___aspe.pdf
- NFPA public technical-committee first-revision record for development of the 2024 edition (not final adopted text): https://docinfofiles.nfpa.org/files/AboutTheCodes/99/99_A2023_HEA_FRReport.pdf

**Review level:** Public-source supported; licensed-book clause-by-clause cross-check outstanding. No installer checklist, inspector pass/fail decision, commissioning sign-off or 6030 verifier instruction is authorized by this material.

## App behavior

- Project recorded as 2018: show 2018-only teaching sequence and contrast note. Do not use any 2024 section-number indexes.
- Project recorded as 2024: show 2024-only sequence and contrast note.
- No selected project: show 2024 concepts marked as general, not a project code basis.
- Project edition other/unconfirmed: hide placement concepts entirely pending edition verification.
- Route diagrams express **source-to-patient sequence only**, not accurate branching, installation offsets, sensor count, or wiring.
- No localStorage writes, field-document edits, or database calls.

## Later acceptance gate

Before upgrading this from **educational concept** to **technical field instruction**, record licensed editions and amendment version, exact citations for each claim, a qualified medical-gas technical reviewer, date, drawing revision and approved AHJ/project design; separately validate 6010 installation and 6030 independent-verification workflows.
