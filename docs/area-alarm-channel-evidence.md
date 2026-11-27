# Area alarm: channel-specific evidence (November 6, 2026)

Each area alarm equipment record has one panel identity and up to 16 sensor channels.

- **Panel evidence** remains on the panel: factory wiring document, document revision, approved drawing / point schedule, and panel installation photo.
- **Channel evidence** is recorded independently: channel point label, sensor location, gas service, sensor manufacturer, exact part number, range/units, approved point-schedule or drawing identifier, revision, and a link to an existing photo in the same project.
- A channel photo stores only a project photo ID; the image remains in the existing Photos collection on this device. No new file-upload or cloud permissions are introduced.
- Existing multichannel and legacy single-sensor records are normalized without losing previously recorded panel evidence. New channel evidence defaults to blank until entered.
- Removing a project photo **does not delete** a sensor channel or silently relink its evidence. The record and printed report explicitly flag the missing photo.
- A linked photo can be chosen only from the current project's photo list. Saving a missing channel photo ID is blocked until the user replaces or clears it.
- Per-channel evidence counts distinguish documentation present from qualification, code compliance, wiring approval and independent verification.
- Keep all drawings and channel-specific code interpretations conditional on the adopted NFPA 99 edition, approved documents, and AHJ.

**Manual field check:** Create one Area Alarm panel with oxygen and medical air channels. Record a different point-schedule ID/revision and photo for each; save, reload, print, then delete one photo. Only that channel must report a broken photo link.

**Testing:** `node scripts/verify-area-alarm-equipment.cjs` and `python scripts/verify-area-alarm-equipment-ui.py` in the existing GitHub Actions workflow.
