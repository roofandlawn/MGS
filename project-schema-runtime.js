(() => {
  if (!window.MGSProjectSchema || typeof save !== 'function' || typeof state === 'undefined') return;

  const baseSave = save;
  save = function schemaAwareSave() {
    state = window.MGSProjectSchema.prepareStateForSave(state);
    return baseSave();
  };

  state = window.MGSProjectSchema.prepareStateForSave(state);
})();
