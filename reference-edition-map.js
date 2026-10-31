/* NFPA 99 edition-specific section-heading locators.
 * Purpose: prevent a 2024 index from being shown as a 2018 project reference.
 * Evidence is for section LOCATION only; never a claim of text equivalence
 * or code adoption. All other editions/components fail closed.
 */
(() => {
  'use strict';
  const PHCPP = 'https://www.phcppros.com/articles/17094-zone-valves';
  const NFPA2024 = 'https://studylib.net/doc/28037269/nfpa-99-2024-health-care-facilities-code';
  const records = Object.freeze({
    'zone-valve': Object.freeze({
      '2018': Object.freeze({ sections: Object.freeze(['5.1.4.6']), heading: 'Zone Valves', sourceUrl: PHCPP }),
      '2024': Object.freeze({ sections: Object.freeze(['5.1.4.6']), heading: 'Zone Valves', sourceUrl: NFPA2024 })
    }),
    'area-alarm': Object.freeze({
      '2018': Object.freeze({ sections: Object.freeze(['5.1.9.4']), heading: 'Area Alarms', sourceUrl: PHCPP }),
      '2024': Object.freeze({ sections: Object.freeze(['5.1.9.4']), heading: 'Area Alarms', sourceUrl: NFPA2024 })
    })
  });
  const safeSections = values => Array.isArray(values)
    ? values.filter(section => typeof section === 'string' && /^\d+(?:\.\d+)+$/.test(section))
    : [];
  function indexFor(component, editionContext, libraryEdition) {
    const masterYear = String(libraryEdition || '').match(/(?:19|20)\d{2}/)?.[0] || null;
    const projectEdition = editionContext?.project?.edition || null;
    const selectedEdition = projectEdition || masterYear;
    const empty = { edition: selectedEdition, sections: [], state: 'unavailable', sourceUrl: null };
    if (!component || typeof component.id !== 'string') return empty;
    if ((editionContext?.status === 'match' || editionContext?.status === 'none') && masterYear === '2024') {
      return { edition: '2024', sections: safeSections(component.nfpa), state: 'existing-2024-index', sourceUrl: null };
    }
    // Only explicitly corroborated 2018 headings can be disclosed for 2018 projects.
    // Never copy the 2024 subsection list into a 2018 view.
    if (editionContext?.status === 'mismatch' && masterYear === '2024' && projectEdition === '2018') {
      const locator = records[component.id]?.['2018'];
      if (locator) {
        return {
          edition: '2018',
          sections: [...locator.sections],
          state: 'corroborated-heading',
          sourceUrl: locator.sourceUrl
        };
      }
    }
    return empty;
  }
  window.MGSReferenceEditionMap = Object.freeze({ records, indexFor });
})();
