# Cloud Copy review screen — read-only UI (2026-10-18)

The next UI component is a mobile-friendly dialog in the MGS project header. It compares **this device's selected project** with a provided `MGSCloudCopyBaseline.preview()` summary. It must never silently fetch, import, replace, or save field records.

- Show the local project name, facility, system count, alarm/outlet/test counts, and device-photo count.
- Show cloud project name, facility, revision, system count, field-record count, checklist count, and attachment **metadata** count only after an authenticated atomic snapshot reader supplies a valid summary. Do not confuse metadata with downloaded photos or compare unlike count categories as equivalent.
- Show a clear `Cloud reader not connected` state when backend/RLS readiness is unverified. Do not fake cloud availability.
- Keep both the approval phrase input and `Use cloud copy` action physically disabled for this UI-only milestone. Provide only `Close`/preview functionality.
- Never advance a sync cursor simply because a user views the preview. Dynamically rendered project text must use `textContent`, not untrusted HTML.

The standalone implementation `cloud-copy-review-ui.js` was developed and locally tested as part of the October 18 UI package. **This document is not deployment approval**; integrate the tested module into `index.html` only with clear preview-only labeling. Before enabling acceptance, validate the Supabase atomic writer and snapshot reader with real RLS, disable legacy direct-table updates, implement photo hydration/export/recovery, and run actual two-browser conflict tests.
