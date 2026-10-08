# Medical Support Gases module

This module adds a practical NFPA 99-2024 learning path for **Nitrogen NF** and **Instrument Air**.

## Why this is a separate module

Medical support gases are not patient-breathing gases. The app should teach that distinction early because support-gas systems can use substantially different operating pressures and source arrangements from common oxygen or medical-air systems.

## 2024 reference map

- §5.1.13.1 — applicability / medical support gas purpose
- §5.1.13.3.6 — Nitrogen NF central supply systems
- §5.1.13.3.6.4 — nitrogen line-pressure control
- §5.1.13.3.7 — instrument-air central supply systems
- §5.1.13.3.7.8 — instrument-air filtration
- §5.1.13.3.7.9 — instrument-air source accessories
- §5.1.13.3.7.11 — instrument-air monitoring and alarms
- §5.1.13.4 — support-gas valves
- §5.1.13.5 — support-gas outlets
- §5.1.13.8 — instrument-air line-pressure control
- §5.1.13.9 — warning systems
- §5.1.13.10 — distribution
- §5.1.13.11 — labeling and identification
- §5.1.13.12 — performance testing

The app stores section numbers and original field explanations only. It does not reproduce the code text.

## Implemented UI

support-gases.html and support-gases.js provide two selectable paths:

**Nitrogen NF**
source → pressure control → isolation → warning systems → distribution/identification → equipment outlet

**Instrument Air**
dedicated source → drying/filtration → pressure control → source/warning alarms → distribution/identification → equipment outlet

The field language intentionally avoids compressor repair, regulator rebuilding, cylinder-handling instruction, and brazing/prep detail.

## Next integration step

Link this module from the main system-path selector and the project system-scope cards. The project record should deep-link Nitrogen to support-gases.html#nitrogen and Instrument Air to support-gases.html#instrument-air.

After navigation is wired, the next content step should be a support-gas testing workflow that distinguishes installer inspection items from verifier testing and makes §5.1.13.12 exceptions explicit without auto-declaring compliance.