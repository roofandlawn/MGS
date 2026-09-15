(() => {
  if (!window.MGSProjectSchema || typeof save !== 'function' || typeof state === 'undefined') return;

  const baseSave = save;
  save = function schemaAwareSave() {
    state = window.MGSProjectSchema.prepareStateForSave(state);
    return baseSave();
  };

  state = window.MGSProjectSchema.prepareStateForSave(state);

  function loadLocalScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-mgs-runtime-src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.mgsRuntimeSrc = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.body.appendChild(script);
    });
  }

  loadLocalScript('supabase-sync-contract.js')
    .then(() => loadLocalScript('supabase-local-sync.js'))
    .catch(error => console.warn('MGS cloud-sync adapter was not loaded; local storage remains active.', error));
})();
