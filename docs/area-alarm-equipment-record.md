# Area Alarm Equipment Record - first-pass project workflow
2026-11-04 | Development branch: feature/reference-library-v1

Open a project, choose Alarms, create or select an Area alarm and choose Record equipment details. Use the Photos tab to add an installation photo, then link it from the equipment form. Record panel maker/model/revision and zone ID, exact sensor manufacturer/part number/service/range, matching factory document and revision, approved drawing reference and review notes. Reopen to edit. The print report includes the evidence fields.

Each alarm equipment record currently represents one sensor channel. Create another area alarm record with the same panel ID for an additional channel. A future increment should group multiple channels under one panel.

The record lives on an existing alarm as its equipment object. This preserves legacy alarm data and uses existing browser-local project persistence. No Supabase changes, sync activation or production deployment. A linked photo stores its existing project photo ID only; deleting the photo shows a missing-photo warning. No photo bytes are duplicated.

Recorded evidence is NOT verification, approval, a wiring instruction, confirmation that manuals match hardware, or proof of NFPA 99 compliance. Do not enter patient-identifying information. Node checks cover normalization, HTML escaping, linkage and missing-photo detection. Live mobile browser behavior still requires end-to-end validation before release.
