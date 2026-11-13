# Standardized gas-service picker - November 11, 2026

The Area Alarm equipment form and Tests form now share six quick choices:
Oxygen, Medical air, Medical vacuum, Nitrous oxide, Nitrogen, Instrument air.
Not identified leaves the field blank. Other / combined reveals a free-text
field for services or component labels not covered by the six quick choices.

Existing sensorService and system strings are preserved. Legacy labels such
as Vacuum and combined test records such as Oxygen / Medical air reopen in
Other / combined without conversion. Reports and link warnings continue to
read the original stored strings. No schema migration is required.

Selecting a standard option populates the original field before submission;
the optional input is visible only for custom labels. A picker choice is
documentation, not proof of service identity, wiring approval, code compliance
or independent ASSE 6030 verification.

Regression checks: scripts/verify-area-alarm-equipment.cjs,
scripts/verify-area-alarm-equipment-ui.py,
scripts/verify-area-alarm-test-links-ui.py.
