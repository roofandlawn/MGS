(() => {
  'use strict';
  const keys = ['mgs-prototype-v3', 'mgs-prototype-v2', 'mgs-prototype-v1'];
  const allowed = new Set(['unconfirmed', '2018', '2024', 'other']);
  // Reference browsing must never write or migrate a project's saved data.
  function selectedProject(storage) {
    if (!storage || typeof storage.getItem !== 'function') return null;
    for (const key of keys) {
      let json;
      try { json = storage.getItem(key); } catch { return null; }
      if (!json) continue;
      let state;
      try { state = JSON.parse(json); } catch { continue; }
      if (!state || !Array.isArray(state.projects)) continue;
      const projects = state.projects.filter(p => p && typeof p === 'object');
      const project = projects.find(p => p.id === state.selectedProjectId) || projects[0];
      if (!project) return null;
      const edition = project.codeBasis?.edition;
      return {
        id: project.id,
        name: String(project.name || 'Unnamed project').slice(0, 120),
        edition: allowed.has(edition) ? edition : 'unconfirmed'
      };
    }
    return null;
  }
  function compare(project, referenceEdition) {
    const year = String(referenceEdition || '').match(/(?:19|20)\d{2}/)?.[0] || null;
    const status = !project ? 'none'
      : project.edition === 'unconfirmed' ? 'unconfirmed'
      : project.edition === 'other' ? 'other'
      : project.edition === year ? 'match' : 'mismatch';
    return { project, status, year };
  }
  window.MGSReferenceEditionContext = Object.freeze({ selectedProject, compare });
})();