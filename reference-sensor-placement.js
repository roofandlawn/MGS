/* Educational sensor-placement comparison, NOT design approval.
 * Publicly corroborated summaries; review the licensed adopted NFPA 99
 * edition, amendments, approved drawings and AHJ before field use.
 * Never use one edition's placement model for a different project edition.
 */
(() => {
  'use strict';
  const route = (title, steps, explanation) => ({ title, steps, explanation });
  const guides = {
    '2018': {
      source: 'https://www.phcppros.com/articles/17094-zone-valves',
      comparison: 'The 2018 anesthetizing-location source-side option is described in relation to an individual room zone-valve-box assembly; do not replace that wording with the 2024 grouping provision.',
      spaces: [
        {
          title: 'Category 1 space — non-anesthetizing example',
          options: [
            route('Patient/use-side sensing',
              ['Source / branch', 'Zone valve', 'Area alarm sensor', 'Patient outlets / inlets'],
              'The area alarm sensor is on the patient/use side of the individual zone-valve-box assembly.')
          ]
        },
        {
          title: 'Anesthetizing location',
          options: [
            route('Source-side alternative — individual room assembly',
              ['Source / branch', 'Area alarm sensor', 'Individual room zone valve', 'Anesthetizing room'],
              'The 2018 wording permits a source-side alternative associated with an individual room zone-valve-box assembly. Check the full clause and approved layout before interpreting shared coverage.'),
            route('Patient/use-side alternative — each valve',
              ['Source / branch', 'Individual room zone valve', 'Area alarm sensor', 'Anesthetizing room'],
              'The other described alternative is sensing on the patient/use side of each individual zone-valve-box assembly.')
          ]
        }
      ]
    },
    '2024': {
      source: 'https://denveraspe.org/images/downloads/Past_Presentations/nfpa_99__2024__training___aspe.pdf',
      comparison: 'The 2024 source-side alternative explicitly addresses each group of anesthetizing-location zone valves supplied by the same branch; do not apply that grouping language to a 2018 project.',
      spaces: [
        {
          title: 'Category 1 space — other than anesthetizing',
          options: [
            route('Patient/use-side sensing',
              ['Source / branch', 'Zone valve', 'Area alarm sensor', 'Patient outlets / inlets'],
              'The area alarm sensor is on the patient/use side of each individual zone valve.')
          ]
        },
        {
          title: 'Anesthetizing location or group',
          options: [
            route('Source-side alternative — each group on the same branch',
              ['Source / branch', 'Area alarm sensor', 'Group of zone valves', 'Anesthetizing rooms'],
              'The source-side alternative relates to each group of anesthetizing-location zone valves on a common branch. Separate branches and groups must not be conflated.'),
            route('Patient/use-side alternative — each valve',
              ['Source / branch', 'Individual zone valve', 'Area alarm sensor', 'Anesthetizing room'],
              'The other alternative is sensing on the patient/use side of each individual zone valve.')
          ]
        }
      ]
    }
  };
  function forProject(context) {
    const edition = context?.status === 'none' && !context.project ? '2024'
      : context?.status === 'match' && context.project?.edition === '2024' && context.year === '2024' ? '2024'
      : context?.status === 'mismatch' && context.project?.edition === '2018' && context.year === '2024' ? '2018'
      : null;
    if (!edition) return { state: 'unavailable', edition: null, spaces: [], source: null, comparison: null };
    return { state: 'public-source-summary', edition, generalOnly: !context.project, ...guides[edition] };
  }
  window.MGSSensorPlacement = Object.freeze({ forProject });
})();
