# Area Alarm Equipment Record — multiple sensors on one panel
2026-11-05 | Development branch: feature/reference-library-v1

## Field workflow
Open a project > Alarms > Add alarm > Area alarm > Record equipment details. Enter the panel identity once (manufacturer, model, revision, zone ID), then document each monitored sensor channel separately. Channel 1 is shown by default; use "Add sensor channel" for additional gas services, up to 16 channels per panel. A channel may describe oxygen, medical air, medical-surgical vacuum or another installed service, as documented in approved drawings. No service is preselected.

For each channel, record the point schedule label, sensor location, sensor manufacturer, exact part number, gas service and range with units. Record the factory wiring manual and revision, approved drawing/point schedule, reviewer and panel installation photo once for the entire panel. Save, reopen to edit, or remove an extra channel. Deleted channels are removed from the local record on save; there is no undo after saving.

Each Area alarm record represents **one actual alarm panel**, not one sensor. If there are two physically separate panels, create two Area alarm records. The printable project report shows panel identification and every recorded channel separately, including missing documentation.

## Legacy equipment migration
Prior project equipment records stored sensorManufacturer, sensorPartNumber, sensorService, and sensorRange at the top level. On read, these fields are promoted into sensorChannels[0] if sensorChannels is absent. New writes store sensorChannels and retain the first channel in those four legacy fields until all connected consumers understand the new array. An explicit empty array never recreates a removed channel from old legacy fields. Up to 16 channels are accepted; records above this limit are trimmed on normalization and are not automatically rewritten until saved.

## Safety and release constraints
- Field identification only. No inferred wire color, terminal assignment, setpoint, placement approval or verification status.
- The installed hardware, factory revision, approved drawings, adopted NFPA 99 edition and AHJ must be checked by qualified personnel. Do not enter patient information.
- All records and photo links remain in the existing browser-local project storage. No Supabase schema change, sync activation or production deployment is included.
- Automated model tests cover old-record upgrade, field limits, multi-channel reports, HTML escaping, missing photos and an empty channel list. Mobile end-to-end tests cover creating two channels, reopening, browser persistence, printable reports, removing a channel and surviving a deleted linked photo.

## Future increment
Give each channel its own approved point-schedule evidence and optional photo, rather than relying solely on the shared panel documents. Add export/import and cloud sync only after database security and cross-browser reconciliation gates pass.
