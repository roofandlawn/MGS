# Manufacturer-specific area alarm documentation selector

Date: 2026-11-03
Location: Reference Library > Area Alarm
Implementation: reference-alarm-interface.js
Status: Educational document finder only. Not a connection detail, permission to energize, or verification record.

## First supported manufacturer families

- BeaconMedaes TotalAlert Infinity: https://www.beaconmedaes.com/en-us/nfpa-documentation/tai-notification-system-documentation
- BeaconMedaes MEGA3: https://www.beaconmedaes.com/en-us/nfpa-documentation/mega3-alarm-documentation

These links lead to the manufacturer's document catalogs, not to a universally applicable wiring sheet. Families and generations differ. A selection is temporary UI state; it does not store or transmit project data.

## Field information to capture in a later project workflow

| Field | Type | Requirement |
| --- | --- | --- |
| Panel manufacturer | text / catalog ID | Nameplate evidence |
| Panel product family | catalog ID | User-selected, NOT proof of model |
| Panel model / part number / revision | text | From installed equipment |
| Sensor manufacturer / exact part number | text | Match each channel |
| Sensor service and calibrated range | text | From label and manufacturer documents |
| Alarm panel/zone/room ID | text | Approved alarm point schedule |
| Manufacturer wiring document ID and revision | text / document link | Must match installed components |
| Approved connection schedule / reviewer | project reference | Before wiring instructions may appear |
| Installation check and verifier record | separate records | Never inferred from UI model selection |

## Safety and compliance boundaries

The app intentionally does **not** supply terminal assignments, wire color-to-terminal mappings, polarity, signal type or wire count for a generic manufacturer. These can vary across product revisions, sensor styles, panel boards, project options, and manufacturer documents. An unlabeled red/black sensor pair and black/white panel pair must not be interpreted as a compatible connection.

The reference is available regardless of project code-edition state because it is an equipment-document locator, **not NFPA 99 installation guidance**. The existing edition gate continues to govern code-specific sensor placement examples.

Before adding any exact manufacturer connection diagram, a qualified reviewer must verify the correct factory schematic and manual revision against exact panel and sensor part numbers and approved project documentation. Independent verification remains a separate workflow.

## Automated acceptance tests

- Unit checks confirm manufacturer-specific official documentation destinations, no fabricated terminal mapping, and no storage/network writes.
- Browser checks at 320, 390, 768, 1280 pixels confirm the Area Alarm-only view, selector changes, official links and safe unknown-model default.
- No production release or Supabase changes are authorized by this increment.
