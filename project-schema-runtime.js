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

  function loadLocalStylesheet(href) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[data-mgs-runtime-href="${href}"]`)) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.mgsRuntimeHref = href;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`Unable to load ${href}`));
      document.head.appendChild(link);
    });
  }

  const cloudAdapterReady = loadLocalScript('supabase-sync-contract.js')
    .then(() => loadLocalScript('supabase-local-sync.js'))
    .catch(error => {
      console.warn('MGS cloud-sync adapter was not loaded; local storage remains active.', error);
    });

  Promise.all([
    cloudAdapterReady,
    loadLocalStylesheet('sync-status-ui.css')
  ])
    .then(() => loadLocalScript('sync-status-ui.js'))
    .catch(error => console.warn('MGS sync status UI was not loaded.', error));
})();
